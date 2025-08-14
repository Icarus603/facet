/**
 * FACET Chat Interface Types
 * Real-time chat interface with multi-agent therapy coordination
 */

import { AgentType, AgentResponse } from '../agents/agent-types';

export interface ChatMessage {
  id: string;
  content: string;
  type: 'user' | 'agent' | 'system';
  agentType?: AgentType;
  agentId?: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'failed';
  metadata?: {
    confidence?: number;
    culturalRelevance?: number;
    processingTime?: number;
    coordinationId?: string;
  };
  isTyping?: boolean;
  reactions?: ChatReaction[];
}

export interface ChatReaction {
  id: string;
  type: 'helpful' | 'insightful' | 'supportive' | 'unclear';
  userId: string;
  timestamp: Date;
}

export interface AgentHandoff {
  id: string;
  fromAgent: AgentType | null;
  toAgent: AgentType;
  reason: string;
  timestamp: Date;
  confidence: number;
}

export interface ChatSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  messages: ChatMessage[];
  agentHandoffs: AgentHandoff[];
  culturalProfile?: Record<string, any>;
  sessionSummary?: string;
  status: 'active' | 'paused' | 'ended';
}

export interface TypingIndicator {
  agentId: string;
  agentType: AgentType;
  isTyping: boolean;
  timestamp: Date;
}

export interface ChatWebSocketMessage {
  type: 'message' | 'typing' | 'handoff' | 'error' | 'session_update';
  payload: any;
  timestamp: number;
  correlationId?: string;
}

export interface AgentPresence {
  agentId: string;
  agentType: AgentType;
  status: 'online' | 'offline' | 'busy';
  capabilities: string[];
  culturalSpecialties?: string[];
  responseTime: number;
  isActive: boolean;
}

export interface ChatError {
  id: string;
  type: 'connection' | 'agent_error' | 'timeout' | 'validation';
  message: string;
  agentId?: string;
  timestamp: Date;
  isRecoverable: boolean;
}

export type ChatEventType = 
  | 'message_sent'
  | 'message_received'
  | 'agent_typing'
  | 'agent_stopped_typing'
  | 'agent_handoff'
  | 'session_started'
  | 'session_ended'
  | 'error_occurred'
  | 'connection_lost'
  | 'connection_restored';

export interface ChatEvent {
  type: ChatEventType;
  data: any;
  timestamp: Date;
}

// Agent avatar and UI configuration
export const AGENT_CONFIG = {
  intake: {
    name: 'Intake Coordinator',
    color: '#6B73FF',
    avatar: '👋',
    description: 'Initial assessment and intake'
  },
  therapy_coordinator: {
    name: 'Therapy Coordinator',
    color: '#00C896',
    avatar: '🧠',
    description: 'Primary therapeutic guidance'
  },
  crisis_monitor: {
    name: 'Crisis Monitor',
    color: '#FF6B6B',
    avatar: '🚨',
    description: 'Safety and crisis intervention'
  },
  cultural_adapter: {
    name: 'Cultural Adapter',
    color: '#845EC2',
    avatar: '🌍',
    description: 'Cultural wisdom integration'
  },
  progress_tracker: {
    name: 'Progress Tracker',
    color: '#FF9F43',
    avatar: '📈',
    description: 'Progress monitoring and insights'
  }
} as const;

export type AgentConfigType = typeof AGENT_CONFIG;