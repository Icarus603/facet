export type AgentType = 
  | 'intake'
  | 'therapy_coordinator'
  | 'cultural_adapter'
  | 'crisis_monitor'
  | 'progress_tracker'

export type MessageType = 'user' | 'agent' | 'system'

export interface ChatMessage {
  id: string
  content: string
  sender: AgentType | 'user' | 'system'
  timestamp: Date
  type: MessageType
  metadata?: {
    confidence?: number
    type?: 'crisis_alert' | 'cultural_content' | 'therapeutic_exercise'
    status?: 'sending' | 'delivered' | 'read' | 'failed'
    editedAt?: Date
    actionItems?: string[]
    culturalRelevance?: number
    culturalContent?: any
    therapeuticExercise?: any
  }
}

export interface ChatSession {
  id: string
  userId: string
  startedAt: Date
  endedAt?: Date
  agents: AgentType[]
  messageCount: number
  lastActivity: Date
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface WebSocketMessage {
  type: 'user_message' | 'agent_message' | 'agent_switch' | 'typing_start' | 'typing_end' | 'error'
  messageId?: string
  content?: string
  agent?: AgentType
  fromAgent?: AgentType
  toAgent?: AgentType
  reason?: string
  userId?: string
  sessionId?: string
  timestamp?: string
  metadata?: Record<string, any>
  error?: string
}