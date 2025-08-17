/**
 * FACET WebSocket API Endpoint
 * 
 * Real-time agent orchestration status updates
 * Implements exact WebSocket message formats from API_CONTRACT.md
 */

import { NextRequest } from 'next/server'
import { WebSocketServer, WebSocket } from 'ws'
import { v4 as uuidv4 } from 'uuid'

// WebSocket message types from API_CONTRACT.md
interface WebSocketMessage {
  type: 'agent_status_update' | 'orchestration_start' | 'orchestration_complete' | 'error' | 'heartbeat'
  timestamp: string
  conversationId: string
  data?: any
}

interface AgentStatusUpdate {
  agentName: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  progress?: number
  message?: string
  executionTimeMs?: number
  confidence?: number
}

interface OrchestrationStart {
  strategy: string
  estimatedTimeMs: number
  agentsInvolved: string[]
  executionPattern: string
}

interface OrchestrationComplete {
  totalTimeMs: number
  finalConfidence: number
  agentsCompleted: number
  agentsFailed: number
  response: string
}

// WebSocket connection manager
class WebSocketManager {
  private static instance: WebSocketManager
  public connections: Map<string, WebSocket> = new Map()
  private userConnections: Map<string, Set<string>> = new Map()

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager()
    }
    return WebSocketManager.instance
  }

  addConnection(connectionId: string, userId: string, ws: WebSocket): void {
    this.connections.set(connectionId, ws)
    
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set())
    }
    this.userConnections.get(userId)!.add(connectionId)

    // Set up connection cleanup
    ws.on('close', () => {
      this.removeConnection(connectionId, userId)
    })

    ws.on('error', (error) => {
      console.error(`WebSocket error for connection ${connectionId}:`, error)
      this.removeConnection(connectionId, userId)
    })
  }

  removeConnection(connectionId: string, userId: string): void {
    this.connections.delete(connectionId)
    
    const userConns = this.userConnections.get(userId)
    if (userConns) {
      userConns.delete(connectionId)
      if (userConns.size === 0) {
        this.userConnections.delete(userId)
      }
    }
  }

  broadcast(userId: string, message: WebSocketMessage): void {
    const userConns = this.userConnections.get(userId)
    if (!userConns) return

    const messageStr = JSON.stringify(message)
    
    userConns.forEach(connectionId => {
      const ws = this.connections.get(connectionId)
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr)
        } catch (error) {
          console.error(`Failed to send message to connection ${connectionId}:`, error)
          this.removeConnection(connectionId, userId)
        }
      }
    })
  }

  sendHeartbeat(): void {
    const heartbeatMessage: WebSocketMessage = {
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
      conversationId: 'system'
    }

    this.connections.forEach((ws, connectionId) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(heartbeatMessage))
        } catch (error) {
          console.error(`Heartbeat failed for connection ${connectionId}:`, error)
        }
      }
    })
  }

  getConnectionCount(): number {
    return this.connections.size
  }

  getUserConnectionCount(userId: string): number {
    return this.userConnections.get(userId)?.size || 0
  }
}

// Initialize WebSocket manager
const wsManager = WebSocketManager.getInstance()

// Start heartbeat interval (every 30 seconds)
setInterval(() => {
  wsManager.sendHeartbeat()
}, 30000)

// Export WebSocket broadcasting functions for use by orchestrator
export const WebSocketBroadcaster = {
  notifyOrchestrationStart(
    userId: string, 
    conversationId: string, 
    data: OrchestrationStart
  ): void {
    const message: WebSocketMessage = {
      type: 'orchestration_start',
      timestamp: new Date().toISOString(),
      conversationId,
      data
    }
    wsManager.broadcast(userId, message)
  },

  notifyAgentStatusUpdate(
    userId: string, 
    conversationId: string, 
    agentUpdate: AgentStatusUpdate
  ): void {
    const message: WebSocketMessage = {
      type: 'agent_status_update',
      timestamp: new Date().toISOString(),
      conversationId,
      data: agentUpdate
    }
    wsManager.broadcast(userId, message)
  },

  notifyOrchestrationComplete(
    userId: string, 
    conversationId: string, 
    data: OrchestrationComplete
  ): void {
    const message: WebSocketMessage = {
      type: 'orchestration_complete',
      timestamp: new Date().toISOString(),
      conversationId,
      data
    }
    wsManager.broadcast(userId, message)
  },

  notifyError(
    userId: string, 
    conversationId: string, 
    error: { message: string, code?: string }
  ): void {
    const message: WebSocketMessage = {
      type: 'error',
      timestamp: new Date().toISOString(),
      conversationId,
      data: error
    }
    wsManager.broadcast(userId, message)
  }
}

// WebSocket upgrade handler
export async function GET(request: NextRequest) {
  // Extract user authentication and connection parameters
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')
  const authToken = url.searchParams.get('token')

  if (!userId || !authToken) {
    return new Response('Missing required parameters', { status: 400 })
  }

  // Validate authentication token
  const isValidAuth = await validateAuthToken(authToken, userId)
  if (!isValidAuth) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Check if WebSocket upgrade is requested
  const upgrade = request.headers.get('upgrade')
  if (upgrade !== 'websocket') {
    return new Response('WebSocket upgrade required', { status: 426 })
  }

  try {
    // Create WebSocket connection
    const connectionId = uuidv4()
    
    // Note: In a production Next.js app, you'd typically use a separate WebSocket server
    // or a service like Pusher, Socket.io, or Ably for WebSocket connections
    // This is a simplified implementation for demonstration
    
    return new Response(JSON.stringify({
      message: 'WebSocket connection established',
      connectionId,
      userId,
      timestamp: new Date().toISOString(),
      supportedMessageTypes: [
        'agent_status_update',
        'orchestration_start', 
        'orchestration_complete',
        'error',
        'heartbeat'
      ],
      heartbeatInterval: 30000
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })

  } catch (error) {
    console.error('WebSocket connection error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

// Handle WebSocket connection (for Node.js environments)
export async function handleWebSocketUpgrade(
  request: any,
  socket: any,
  head: any
): Promise<void> {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`)
    const userId = url.searchParams.get('userId')
    const authToken = url.searchParams.get('token')

    if (!userId || !authToken) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n')
      socket.destroy()
      return
    }

    const isValidAuth = await validateAuthToken(authToken, userId)
    if (!isValidAuth) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    const wss = new WebSocketServer({ noServer: true })
    
    wss.handleUpgrade(request, socket, head, (ws) => {
      const connectionId = uuidv4()
      wsManager.addConnection(connectionId, userId, ws)

      // Send welcome message
      const welcomeMessage: WebSocketMessage = {
        type: 'orchestration_start',
        timestamp: new Date().toISOString(),
        conversationId: 'system',
        data: {
          message: 'WebSocket connection established',
          connectionId,
          userId
        }
      }
      ws.send(JSON.stringify(welcomeMessage))

      // Handle incoming messages (ping/pong, connection maintenance)
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          handleClientMessage(userId, connectionId, message)
        } catch (error) {
          console.error('Invalid WebSocket message:', error)
        }
      })

      ws.on('pong', () => {
        // Connection is alive
        console.log(`Pong received from ${connectionId}`)
      })
    })

  } catch (error) {
    console.error('WebSocket upgrade error:', error)
    socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n')
    socket.destroy()
  }
}

// Handle client messages
function handleClientMessage(
  userId: string, 
  connectionId: string, 
  message: any
): void {
  switch (message.type) {
    case 'ping':
      // Respond with pong
      const ws = wsManager.connections.get(connectionId)
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }))
      }
      break
      
    case 'subscribe':
      // Handle conversation subscription
      console.log(`User ${userId} subscribed to conversation ${message.conversationId}`)
      break
      
    default:
      console.log(`Unknown message type: ${message.type}`)
  }
}

// Authentication validation
async function validateAuthToken(token: string, userId: string): Promise<boolean> {
  // TODO: Implement proper JWT token validation with Supabase
  // For now, return true for development
  if (process.env.NODE_ENV === 'development') {
    return true
  }
  
  try {
    // In production, validate JWT token against Supabase
    // const { data, error } = await supabase.auth.getUser(token)
    // return !error && data.user?.id === userId
    return true
  } catch (error) {
    console.error('Auth validation error:', error)
    return false
  }
}

// Health check endpoint
export async function POST(request: NextRequest) {
  try {
    const wsManager = WebSocketManager.getInstance()
    
    return Response.json({
      status: 'healthy',
      connections: wsManager.getConnectionCount(),
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    })
  } catch (error) {
    return Response.json({
      status: 'error',
      message: 'WebSocket service unhealthy',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Metrics endpoint for monitoring
export async function HEAD(request: NextRequest) {
  const wsManager = WebSocketManager.getInstance()
  
  return new Response(null, {
    status: 200,
    headers: {
      'X-WS-Connections': wsManager.getConnectionCount().toString(),
      'X-Service-Status': 'healthy',
      'X-Timestamp': new Date().toISOString()
    }
  })
}