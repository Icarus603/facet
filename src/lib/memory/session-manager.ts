import { AgentMemoryManager, MemoryContext } from './memory-manager'
import { createClient } from '@/lib/supabase/client'
import { randomUUID } from 'crypto'

export interface TherapySession {
  id: string
  userId: string
  status: 'active' | 'paused' | 'completed' | 'terminated'
  type: 'initial' | 'follow_up' | 'crisis' | 'group'
  startTime: Date
  endTime?: Date
  currentAgent: string
  participatingAgents: string[]
  memoryContext?: MemoryContext
}

export interface SessionTransition {
  sessionId: string
  fromAgent: string
  toAgent: string
  reason: string
  context: any
  timestamp: Date
}

export interface SessionMetrics {
  sessionId: string
  duration: number
  messageCount: number
  agentSwitches: number
  therapeuticAlliance: number
  progressScore: number
  crisisEvents: number
}

export class SessionManager {
  private memoryManager: AgentMemoryManager
  private supabase: ReturnType<typeof createClient>
  private activeSessions: Map<string, TherapySession> = new Map()

  constructor() {
    this.memoryManager = new AgentMemoryManager()
    this.supabase = createClient()
  }

  /**
   * Start a new therapy session
   */
  async startSession(
    userId: string,
    sessionType: 'initial' | 'follow_up' | 'crisis' | 'group' = 'follow_up',
    initialAgent: string = 'intake'
  ): Promise<TherapySession> {
    try {
      const sessionId = randomUUID()
      
      // Initialize memory context
      const memoryContext = await this.memoryManager.initializeMemoryContext(
        sessionId,
        userId
      )

      // Create session record
      const session: TherapySession = {
        id: sessionId,
        userId,
        status: 'active',
        type: sessionType,
        startTime: new Date(),
        currentAgent: initialAgent,
        participatingAgents: [initialAgent],
        memoryContext
      }

      // Store in memory for quick access
      this.activeSessions.set(sessionId, session)

      // Persist to database
      await this.persistSession(session)

      // Log session start
      await this.logSessionEvent(sessionId, 'session_start', {
        userId,
        sessionType,
        initialAgent
      })

      return session
    } catch (error) {
      console.error('Failed to start session:', error)
      throw error
    }
  }

  /**
   * End a therapy session
   */
  async endSession(
    sessionId: string,
    reason: 'completed' | 'terminated' | 'timeout' = 'completed'
  ): Promise<SessionMetrics> {
    try {
      const session = await this.getSession(sessionId)
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`)
      }

      // Update session status
      session.status = reason === 'completed' ? 'completed' : 'terminated'
      session.endTime = new Date()

      // Calculate session metrics
      const metrics = await this.calculateSessionMetrics(session)

      // Update memory context with session completion
      if (session.memoryContext) {
        await this.memoryManager.updateTherapeuticState(sessionId, {
          progressMarkers: [
            ...session.memoryContext.therapeuticState.progressMarkers,
            {
              id: randomUUID(),
              goal: 'session_completion',
              measurement: metrics.progressScore,
              timestamp: new Date(),
              agentType: session.currentAgent
            }
          ]
        })
      }

      // Remove from active sessions
      this.activeSessions.delete(sessionId)

      // Persist final state
      await this.persistSession(session)
      await this.persistSessionMetrics(metrics)

      // Log session end
      await this.logSessionEvent(sessionId, 'session_end', {
        reason,
        duration: metrics.duration,
        metrics
      })

      return metrics
    } catch (error) {
      console.error('Failed to end session:', error)
      throw error
    }
  }

  /**
   * Transition between agents within a session
   */
  async transitionAgent(
    sessionId: string,
    fromAgent: string,
    toAgent: string,
    reason: string,
    transitionContext: any = {}
  ): Promise<void> {
    try {
      const session = await this.getSession(sessionId)
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`)
      }

      // Share context between agents
      const sharedContext = await this.memoryManager.shareContextBetweenAgents(
        sessionId,
        fromAgent,
        toAgent,
        this.determineContextSharingLevel(fromAgent, toAgent)
      )

      // Update session
      session.currentAgent = toAgent
      if (!session.participatingAgents.includes(toAgent)) {
        session.participatingAgents.push(toAgent)
      }

      // Record transition
      const transition: SessionTransition = {
        sessionId,
        fromAgent,
        toAgent,
        reason,
        context: transitionContext,
        timestamp: new Date()
      }

      // Update in memory
      this.activeSessions.set(sessionId, session)

      // Persist changes
      await this.persistSession(session)
      await this.persistSessionTransition(transition)

      // Log transition
      await this.logSessionEvent(sessionId, 'agent_transition', {
        fromAgent,
        toAgent,
        reason
      })
    } catch (error) {
      console.error('Failed to transition agent:', error)
      throw error
    }
  }

  /**
   * Get current session
   */
  async getSession(sessionId: string): Promise<TherapySession | null> {
    try {
      // Try memory first
      let session = this.activeSessions.get(sessionId)
      
      if (!session) {
        // Load from database
        session = await this.loadSessionFromDB(sessionId)
        if (session) {
          this.activeSessions.set(sessionId, session)
        }
      }

      return session || null
    } catch (error) {
      console.error('Failed to get session:', error)
      return null
    }
  }

  /**
   * Pause a session
   */
  async pauseSession(sessionId: string, reason: string = 'user_request'): Promise<void> {
    try {
      const session = await this.getSession(sessionId)
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`)
      }

      session.status = 'paused'
      this.activeSessions.set(sessionId, session)
      await this.persistSession(session)

      await this.logSessionEvent(sessionId, 'session_pause', { reason })
    } catch (error) {
      console.error('Failed to pause session:', error)
      throw error
    }
  }

  /**
   * Resume a paused session
   */
  async resumeSession(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId)
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`)
      }

      if (session.status !== 'paused') {
        throw new Error(`Session is not paused: ${sessionId}`)
      }

      session.status = 'active'
      this.activeSessions.set(sessionId, session)
      await this.persistSession(session)

      await this.logSessionEvent(sessionId, 'session_resume', {})
    } catch (error) {
      console.error('Failed to resume session:', error)
      throw error
    }
  }

  /**
   * Get active sessions for a user
   */
  async getUserActiveSessions(userId: string): Promise<TherapySession[]> {
    try {
      const { data: sessions } = await this.supabase
        .from('therapy_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('started_at', { ascending: false })

      return sessions?.map(this.mapDBSessionToTherapySession) || []
    } catch (error) {
      console.error('Failed to get user active sessions:', error)
      return []
    }
  }

  /**
   * Get session history for a user
   */
  async getUserSessionHistory(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<TherapySession[]> {
    try {
      const { data: sessions } = await this.supabase
        .from('therapy_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .range(offset, offset + limit - 1)

      return sessions?.map(this.mapDBSessionToTherapySession) || []
    } catch (error) {
      console.error('Failed to get user session history:', error)
      return []
    }
  }

  /**
   * Handle session timeout
   */
  async handleSessionTimeout(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId)
      if (!session || session.status !== 'active') {
        return
      }

      // Check if session has been inactive too long
      const lastActivity = session.memoryContext?.metadata.lastAccessed || session.startTime
      const inactiveTime = Date.now() - lastActivity.getTime()
      const timeoutThreshold = 30 * 60 * 1000 // 30 minutes

      if (inactiveTime > timeoutThreshold) {
        await this.endSession(sessionId, 'timeout')
      }
    } catch (error) {
      console.error('Failed to handle session timeout:', error)
    }
  }

  /**
   * Cleanup inactive sessions
   */
  async cleanupInactiveSessions(): Promise<number> {
    try {
      let cleanedCount = 0
      
      for (const [sessionId, session] of this.activeSessions) {
        if (session.status === 'active') {
          await this.handleSessionTimeout(sessionId)
          if (!this.activeSessions.has(sessionId)) {
            cleanedCount++
          }
        }
      }

      return cleanedCount
    } catch (error) {
      console.error('Failed to cleanup inactive sessions:', error)
      return 0
    }
  }

  // Private helper methods

  private async calculateSessionMetrics(session: TherapySession): Promise<SessionMetrics> {
    const duration = session.endTime 
      ? session.endTime.getTime() - session.startTime.getTime()
      : Date.now() - session.startTime.getTime()

    const messageCount = session.memoryContext?.conversationHistory.length || 0
    const agentSwitches = session.participatingAgents.length - 1
    const therapeuticAlliance = session.memoryContext?.therapeuticState.therapeuticAlliance || 0.5
    
    // Calculate progress score based on goals achieved
    const progressMarkers = session.memoryContext?.therapeuticState.progressMarkers || []
    const progressScore = progressMarkers.length > 0 
      ? progressMarkers.reduce((acc, marker) => acc + marker.measurement, 0) / progressMarkers.length
      : 0

    // Count crisis events
    const crisisEvents = session.memoryContext?.conversationHistory.filter(
      msg => msg.content.toLowerCase().includes('crisis') || 
             msg.content.toLowerCase().includes('emergency')
    ).length || 0

    return {
      sessionId: session.id,
      duration: Math.round(duration / 1000), // Convert to seconds
      messageCount,
      agentSwitches,
      therapeuticAlliance,
      progressScore,
      crisisEvents
    }
  }

  private determineContextSharingLevel(
    fromAgent: string,
    toAgent: string
  ): 'full' | 'summary' | 'crisis-only' {
    // Crisis monitor gets everything
    if (toAgent === 'crisis_monitor') {
      return 'full'
    }

    // Crisis to other agents shares crisis info only
    if (fromAgent === 'crisis_monitor') {
      return 'crisis-only'
    }

    // Cultural adapter and progress tracker get summaries
    if (toAgent === 'cultural_adapter' || toAgent === 'progress_tracker') {
      return 'summary'
    }

    // Default to summary for security
    return 'summary'
  }

  private async persistSession(session: TherapySession): Promise<void> {
    try {
      await this.supabase
        .from('therapy_sessions')
        .upsert({
          id: session.id,
          user_id: session.userId,
          session_type: session.type,
          status: session.status,
          started_at: session.startTime,
          ended_at: session.endTime,
          current_agent: session.currentAgent,
          participating_agents: session.participatingAgents,
          updated_at: new Date()
        })
    } catch (error) {
      console.error('Failed to persist session:', error)
    }
  }

  private async persistSessionTransition(transition: SessionTransition): Promise<void> {
    try {
      await this.supabase
        .from('session_transitions')
        .insert({
          session_id: transition.sessionId,
          from_agent: transition.fromAgent,
          to_agent: transition.toAgent,
          reason: transition.reason,
          context_data: transition.context,
          timestamp: transition.timestamp
        })
    } catch (error) {
      console.error('Failed to persist session transition:', error)
    }
  }

  private async persistSessionMetrics(metrics: SessionMetrics): Promise<void> {
    try {
      await this.supabase
        .from('session_metrics')
        .insert({
          session_id: metrics.sessionId,
          duration_seconds: metrics.duration,
          message_count: metrics.messageCount,
          agent_switches: metrics.agentSwitches,
          therapeutic_alliance: metrics.therapeuticAlliance,
          progress_score: metrics.progressScore,
          crisis_events: metrics.crisisEvents,
          created_at: new Date()
        })
    } catch (error) {
      console.error('Failed to persist session metrics:', error)
    }
  }

  private async loadSessionFromDB(sessionId: string): Promise<TherapySession | null> {
    try {
      const { data: sessionData } = await this.supabase
        .from('therapy_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (!sessionData) {
        return null
      }

      // Load memory context
      const memoryContext = await this.memoryManager.getMemoryContext(sessionId)

      return this.mapDBSessionToTherapySession(sessionData, memoryContext)
    } catch (error) {
      console.error('Failed to load session from DB:', error)
      return null
    }
  }

  private mapDBSessionToTherapySession(
    dbSession: any,
    memoryContext?: MemoryContext | null
  ): TherapySession {
    return {
      id: dbSession.id,
      userId: dbSession.user_id,
      status: dbSession.status,
      type: dbSession.session_type,
      startTime: new Date(dbSession.started_at),
      endTime: dbSession.ended_at ? new Date(dbSession.ended_at) : undefined,
      currentAgent: dbSession.current_agent,
      participatingAgents: dbSession.participating_agents || [],
      memoryContext: memoryContext || undefined
    }
  }

  private async logSessionEvent(
    sessionId: string,
    eventType: string,
    eventData: any
  ): Promise<void> {
    try {
      await this.supabase
        .from('session_events')
        .insert({
          session_id: sessionId,
          event_type: eventType,
          event_data: eventData,
          timestamp: new Date()
        })
    } catch (error) {
      console.error('Failed to log session event:', error)
    }
  }
}