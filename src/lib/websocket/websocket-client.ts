'use client'

import { createClient } from '@/lib/supabase/client'

// WebSocket message types from the API specification
export interface WSMessage {
  type: 'agent_status_update' | 'orchestration_start' | 'orchestration_complete' | 'error' | 'heartbeat'
  timestamp: string
  conversationId: string
  data?: any
}

export interface AgentStatusUpdate {
  agentName: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  progress?: number
  message?: string
  executionTimeMs?: number
  confidence?: number
}

export interface OrchestrationStart {
  strategy: string
  estimatedTimeMs: number
  agentsInvolved: string[]
  executionPattern: string
}

export interface OrchestrationComplete {
  totalTimeMs: number
  finalConfidence: number
  agentsCompleted: number
  agentsFailed: number
  response: string
}

// Event listeners type
type WSEventListener = (data: any) => void

export class WebSocketClient {
  private static instance: WebSocketClient
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private heartbeatInterval: NodeJS.Timeout | null = null
  private listeners: Map<string, WSEventListener[]> = new Map()
  private isConnecting = false
  private userId: string | null = null
  private authToken: string | null = null

  static getInstance(): WebSocketClient {
    if (!WebSocketClient.instance) {
      WebSocketClient.instance = new WebSocketClient()
    }
    return WebSocketClient.instance
  }

  private constructor() {
    // Private constructor for singleton
  }

  async connect(userId: string): Promise<boolean> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return true
    }

    this.isConnecting = true
    this.userId = userId

    try {
      // Get auth token from Supabase
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.error('No auth token available for WebSocket connection')
        this.isConnecting = false
        return false
      }

      this.authToken = session.access_token

      // Create WebSocket URL
      const wsUrl = this.getWebSocketUrl(userId, session.access_token)
      
      return new Promise((resolve) => {
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.startHeartbeat()
          this.emit('connected', {})
          resolve(true)
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WSMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason)
          this.isConnecting = false
          this.stopHeartbeat()
          this.emit('disconnected', { code: event.code, reason: event.reason })
          
          // Attempt to reconnect if not a clean close
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.isConnecting = false
          this.emit('error', { error })
          resolve(false)
        }

        // Connection timeout
        setTimeout(() => {
          if (this.isConnecting) {
            console.error('WebSocket connection timeout')
            this.ws?.close()
            this.isConnecting = false
            resolve(false)
          }
        }, 10000)
      })

    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error)
      this.isConnecting = false
      return false
    }
  }

  private getWebSocketUrl(userId: string, token: string): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    
    // For development, use HTTP endpoint (Next.js doesn't support WebSocket upgrade)
    if (process.env.NODE_ENV === 'development') {
      // Fallback to polling or use a separate WebSocket server
      return `${protocol}//${host}/api/ws?userId=${userId}&token=${token}`
    }
    
    return `${protocol}//${host}/api/ws?userId=${userId}&token=${token}`
  }

  private handleMessage(message: WSMessage) {
    console.log('Received WebSocket message:', message)

    switch (message.type) {
      case 'agent_status_update':
        this.emit('agentStatusUpdate', message.data as AgentStatusUpdate)
        break
      
      case 'orchestration_start':
        this.emit('orchestrationStart', message.data as OrchestrationStart)
        break
      
      case 'orchestration_complete':
        this.emit('orchestrationComplete', message.data as OrchestrationComplete)
        break
      
      case 'error':
        this.emit('error', message.data)
        break
      
      case 'heartbeat':
        this.emit('heartbeat', message.data)
        break
      
      default:
        console.log('Unknown WebSocket message type:', message.type)
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({
          type: 'ping',
          timestamp: new Date().toISOString()
        })
      }
    }, 30000) // Send ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private scheduleReconnect() {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) // Exponential backoff
    
    console.log(`Scheduling WebSocket reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)
    
    setTimeout(() => {
      if (this.userId) {
        this.connect(this.userId)
      }
    }, delay)
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, cannot send message:', message)
    }
  }

  subscribe(conversationId: string) {
    this.send({
      type: 'subscribe',
      conversationId,
      timestamp: new Date().toISOString()
    })
  }

  // Event listener management
  on(event: string, listener: WSEventListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(listener)
  }

  off(event: string, listener: WSEventListener) {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      const index = eventListeners.indexOf(listener)
      if (index > -1) {
        eventListeners.splice(index, 1)
      }
    }
  }

  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error)
        }
      })
    }
  }

  disconnect() {
    this.stopHeartbeat()
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    
    this.listeners.clear()
    this.reconnectAttempts = 0
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  getConnectionState(): string {
    if (!this.ws) return 'disconnected'
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting'
      case WebSocket.OPEN: return 'connected'
      case WebSocket.CLOSING: return 'closing'
      case WebSocket.CLOSED: return 'disconnected'
      default: return 'unknown'
    }
  }
}

// Export singleton instance
export const wsClient = WebSocketClient.getInstance()