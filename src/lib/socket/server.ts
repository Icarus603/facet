import { Server as SocketIOServer } from 'socket.io'
import { Server as HttpServer } from 'http'
import { NextApiRequest } from 'next'
import { createClient } from '@/lib/supabase/server'
import { AgentRegistry } from '@/lib/agents/AgentRegistry'
import type { Socket } from 'socket.io'

interface AuthenticatedSocket extends Socket {
  userId?: string
  sessionId?: string
}

export class TherapySocketServer {
  private io: SocketIOServer
  private agentRegistry: AgentRegistry

  constructor(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === 'development' 
          ? ['http://localhost:3000', 'http://localhost:3001']
          : [process.env.NEXTAUTH_URL || ''],
        credentials: true
      },
      transports: ['websocket', 'polling']
    })

    this.agentRegistry = new AgentRegistry()
    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    this.io.on('connection', async (socket: AuthenticatedSocket) => {
      console.log('Client connected:', socket.id)

      // Authentication middleware
      socket.on('authenticate', async (data) => {
        try {
          const { sessionToken, sessionId } = data
          
          // Verify session token with Supabase
          const supabase = await createClient()
          const { data: { user }, error } = await supabase.auth.getUser(sessionToken)
          
          if (error || !user) {
            socket.emit('auth_error', { message: 'Invalid session token' })
            socket.disconnect()
            return
          }

          socket.userId = user.id
          socket.sessionId = sessionId
          
          // Join user-specific room for targeted messages
          socket.join(`user_${user.id}`)
          if (sessionId) {
            socket.join(`session_${sessionId}`)
          }

          socket.emit('authenticated', { userId: user.id, sessionId })
          console.log(`User ${user.id} authenticated on socket ${socket.id}`)
          
        } catch (error) {
          console.error('Authentication error:', error)
          socket.emit('auth_error', { message: 'Authentication failed' })
          socket.disconnect()
        }
      })

      // Therapy message handling
      socket.on('therapy_message', async (data) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' })
          return
        }

        try {
          const { message, sessionId, culturalContext, urgencyLevel = 'medium' } = data

          // Emit typing indicator to other clients in session
          socket.to(`session_${sessionId}`).emit('agent_typing', { 
            agentId: 'processing',
            agentName: 'Processing...' 
          })

          // Process through agent system
          const response = await this.agentRegistry.processTherapeuticInteraction({
            userId: socket.userId,
            sessionId,
            userInput: message,
            culturalContext,
            urgencyLevel
          })

          // Log interaction to database
          const supabase = await createClient()
          await supabase
            .from('therapy_interactions')
            .insert({
              session_id: sessionId,
              interaction_type: 'user_message',
              user_input: message,
              agent_response: response.content,
              agent_type: response.agentId,
              cultural_content_used: response.culturalContent,
              emotional_analysis: response.emotionalAnalysis,
              processing_time_ms: response.processingTime
            })

          // Send response back to client
          socket.emit('therapy_response', {
            success: true,
            response: {
              content: response.content,
              agentName: response.agentName,
              agentType: response.agentType,
              agentId: response.agentId,
              culturalContent: response.culturalContent,
              suggestedActions: response.suggestedActions,
              emotionalAnalysis: response.emotionalAnalysis
            },
            processingTime: response.processingTime,
            timestamp: new Date().toISOString()
          })

          // Crisis assessment if high urgency
          if (urgencyLevel === 'high' || urgencyLevel === 'critical') {
            // Send crisis assessment to specialized crisis room
            this.io.to(`crisis_monitoring`).emit('crisis_alert', {
              userId: socket.userId,
              sessionId,
              message,
              urgencyLevel,
              timestamp: new Date().toISOString()
            })
          }

        } catch (error) {
          console.error('Therapy message processing error:', error)
          socket.emit('therapy_error', {
            message: 'Failed to process therapy message',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
          })
        }
      })

      // Agent switching notification
      socket.on('agent_switch', (data) => {
        const { sessionId, fromAgent, toAgent, reason } = data
        socket.to(`session_${sessionId}`).emit('agent_switched', {
          fromAgent,
          toAgent,
          reason,
          timestamp: new Date().toISOString()
        })
      })

      // Session state management
      socket.on('join_session', (sessionId) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' })
          return
        }

        socket.sessionId = sessionId
        socket.join(`session_${sessionId}`)
        socket.emit('session_joined', { sessionId })
      })

      socket.on('leave_session', (sessionId) => {
        socket.leave(`session_${sessionId}`)
        socket.sessionId = undefined
        socket.emit('session_left', { sessionId })
      })

      // Disconnect handling
      socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`)
        if (socket.userId) {
          socket.leave(`user_${socket.userId}`)
        }
        if (socket.sessionId) {
          socket.leave(`session_${socket.sessionId}`)
        }
      })

      // Heartbeat for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() })
      })

      // Error handling
      socket.on('error', (error) => {
        console.error('Socket error:', error)
      })
    })
  }

  // Method to send messages to specific users (for crisis interventions)
  public sendToUser(userId: string, event: string, data: any) {
    this.io.to(`user_${userId}`).emit(event, data)
  }

  // Method to send messages to specific sessions
  public sendToSession(sessionId: string, event: string, data: any) {
    this.io.to(`session_${sessionId}`).emit(event, data)
  }

  // Method to broadcast crisis alerts
  public broadcastCrisisAlert(data: any) {
    this.io.to('crisis_monitoring').emit('crisis_alert', data)
  }

  // Get server instance
  public getServer() {
    return this.io
  }
}

// Global socket server instance
let socketServer: TherapySocketServer | null = null

export function initializeSocketServer(server: HttpServer) {
  if (!socketServer) {
    socketServer = new TherapySocketServer(server)
    console.log('Socket.io server initialized')
  }
  return socketServer
}

export function getSocketServer(): TherapySocketServer | null {
  return socketServer
}