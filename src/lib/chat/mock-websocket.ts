'use client'

import { AgentType, WebSocketMessage } from '@/types/chat'

// Mock WebSocket for development/testing
export class MockWebSocket {
  public readyState: number = WebSocket.CONNECTING
  public connected: boolean = false
  public onopen: ((event: Event) => void) | null = null
  public onmessage: ((event: MessageEvent) => void) | null = null
  public onclose: ((event: CloseEvent) => void) | null = null
  public onerror: ((event: Event) => void) | null = null
  
  // Socket.IO-like methods
  public on = (event: string, callback: Function) => {
    if (event === 'connect') this.onopen = callback as any
    if (event === 'message') this.onmessage = callback as any
    if (event === 'disconnect') this.onclose = callback as any
    if (event === 'error') this.onerror = callback as any
  }
  
  public emit = (event: string, data?: any) => {
    // Mock emit functionality
  }
  
  public disconnect = () => {
    this.close()
  }

  private userId: string
  private sessionId: string
  private messageQueue: WebSocketMessage[] = []
  private currentAgent: AgentType = 'therapy_coordinator'
  
  constructor(userId: string, sessionId?: string) {
    this.userId = userId
    this.sessionId = sessionId || `session_${Date.now()}`
    
    // In development, connect immediately and stay connected
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        this.readyState = WebSocket.OPEN
        this.connected = true
        this.onopen?.(new Event('open'))
        
        // Send welcome message
        this.simulateWelcomeMessage()
      }, 100) // Much shorter delay
    } else {
      // Simulate connection after a short delay
      setTimeout(() => {
        this.readyState = WebSocket.OPEN
        this.connected = true
        this.onopen?.(new Event('open'))
        
        // Send welcome message
        this.simulateWelcomeMessage()
      }, 500)
    }
  }

  send(data: string) {
    if (this.readyState !== WebSocket.OPEN) {
      console.warn('MockWebSocket: Cannot send message, connection not open')
      return
    }

    try {
      const message: WebSocketMessage = JSON.parse(data)
      this.handleIncomingMessage(message)
    } catch (error) {
      console.error('MockWebSocket: Failed to parse message', error)
    }
  }

  close() {
    this.readyState = WebSocket.CLOSED
    this.connected = false
    this.onclose?.(new CloseEvent('close'))
  }

  private handleIncomingMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'user_message':
        this.simulateAgentResponse(message)
        break
      default:
        console.log('MockWebSocket: Received message', message)
    }
  }

  private simulateWelcomeMessage() {
    const welcomeMessage: WebSocketMessage = {
      type: 'agent_message',
      messageId: `msg_${Date.now()}`,
      content: 'Hello! I\'m your Therapy Coordinator. I\'m here to help guide you through your therapeutic journey. How are you feeling today?',
      agent: 'therapy_coordinator',
      timestamp: new Date().toISOString(),
      metadata: {
        confidence: 0.95,
        type: undefined
      }
    }

    this.sendToClient(welcomeMessage)
  }

  private simulateAgentResponse(userMessage: WebSocketMessage) {
    // Simulate typing indicator
    this.sendToClient({
      type: 'typing_start',
      agent: this.currentAgent
    })

    // Simulate response delay
    setTimeout(() => {
      this.sendToClient({
        type: 'typing_end',
        agent: this.currentAgent
      })

      // Analyze user message for agent switching
      const shouldSwitchAgent = this.shouldSwitchAgent(userMessage.content || '')
      
      if (shouldSwitchAgent.switch) {
        this.switchAgent(shouldSwitchAgent.toAgent!, shouldSwitchAgent.reason!)
      }

      // Generate appropriate response
      const response = this.generateAgentResponse(userMessage.content || '', this.currentAgent)
      
      this.sendToClient({
        type: 'agent_message',
        messageId: `msg_${Date.now()}`,
        content: response.content,
        agent: this.currentAgent,
        timestamp: new Date().toISOString(),
        metadata: response.metadata
      })
    }, 1500 + Math.random() * 1000) // 1.5-2.5 seconds
  }

  private shouldSwitchAgent(content: string): { switch: boolean; toAgent?: AgentType; reason?: string } {
    const lowerContent = content.toLowerCase()

    // Crisis detection
    if (lowerContent.includes('suicide') || lowerContent.includes('kill myself') || lowerContent.includes('end my life')) {
      return {
        switch: this.currentAgent !== 'crisis_monitor',
        toAgent: 'crisis_monitor',
        reason: 'for immediate crisis support'
      }
    }

    // Cultural content requests
    if (lowerContent.includes('culture') || lowerContent.includes('tradition') || lowerContent.includes('heritage')) {
      return {
        switch: this.currentAgent !== 'cultural_adapter',
        toAgent: 'cultural_adapter',
        reason: 'to explore cultural perspectives'
      }
    }

    // Progress tracking
    if (lowerContent.includes('progress') || lowerContent.includes('improvement') || lowerContent.includes('better')) {
      return {
        switch: this.currentAgent !== 'progress_tracker',
        toAgent: 'progress_tracker',
        reason: 'to review your progress'
      }
    }

    return { switch: false }
  }

  private switchAgent(toAgent: AgentType, reason: string) {
    const fromAgent = this.currentAgent
    this.currentAgent = toAgent

    this.sendToClient({
      type: 'agent_switch',
      fromAgent,
      toAgent,
      reason,
      timestamp: new Date().toISOString()
    })
  }

  private generateAgentResponse(content: string, agent: AgentType): { content: string; metadata: any } {
    const responses = {
      therapy_coordinator: [
        "I hear you. Can you tell me more about what brought you here today?",
        "That sounds challenging. How has this been affecting your daily life?",
        "Thank you for sharing that with me. What would you like to work on together?",
        "I understand. Let's explore this further. What emotions come up for you when you think about this?"
      ],
      cultural_adapter: [
        "I'd like to understand your cultural background better. What traditions or values are important to you?",
        "Many cultures have beautiful wisdom around healing. Are there any cultural practices that bring you comfort?",
        "Your heritage can be a source of strength. How do your cultural values relate to what you're experiencing?",
        "Let me share some cultural wisdom that might resonate with your experience..."
      ],
      crisis_monitor: [
        "Your safety is my top priority. Are you having thoughts of hurting yourself right now?",
        "I'm here to help keep you safe. Do you have anyone you can call for support?",
        "Let's create a safety plan together. What helps you feel more secure?",
        "You've been brave to reach out. What support systems do you have available?"
      ],
      progress_tracker: [
        "Let's look at how you've been progressing. What positive changes have you noticed?",
        "It's important to celebrate small wins. What's something you're proud of recently?",
        "Progress isn't always linear. How are you feeling compared to when we started?",
        "I can see you're working hard. What goals would you like to focus on next?"
      ],
      intake: [
        "Welcome! I'm here to help get you connected with the right support. What brings you to therapy today?",
        "Thank you for taking this important step. Can you tell me a bit about what you're hoping to achieve?",
        "I'd like to understand your needs better so I can connect you with the best support. What's been on your mind lately?",
        "Let's start by understanding what you're looking for. What would be most helpful for you right now?"
      ]
    }

    const agentResponses = responses[agent]
    const randomResponse = agentResponses[Math.floor(Math.random() * agentResponses.length)]

    return {
      content: randomResponse,
      metadata: {
        confidence: 0.85 + Math.random() * 0.15,
        type: agent === 'crisis_monitor' ? 'crisis_alert' : undefined,
        actionItems: agent === 'crisis_monitor' ? ['Create safety plan', 'Identify support persons'] : undefined
      }
    }
  }

  private sendToClient(message: WebSocketMessage) {
    if (this.onmessage) {
      const event = new MessageEvent('message', {
        data: JSON.stringify(message)
      })
      this.onmessage(event)
    }
  }
}

// Function to create mock WebSocket instance
export function createMockSocket(userId?: string, sessionId?: string): MockWebSocket {
  return new MockWebSocket(userId || 'demo-user', sessionId)
}