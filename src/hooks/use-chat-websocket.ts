/**
 * FACET Chat WebSocket Hook
 * Real-time chat communication with agent coordination
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  ChatMessage, 
  ChatWebSocketMessage, 
  TypingIndicator, 
  AgentHandoff, 
  ChatError,
  ChatEvent
} from '@/lib/chat/types';
import { AgentType } from '@/lib/agents/agent-types';
import { generateId } from '@/lib/utils';
import { createMockSocket } from '@/lib/chat/mock-websocket';

interface UseChatWebSocketOptions {
  userId: string;
  sessionId: string;
  onMessage?: (message: ChatMessage) => void;
  onTyping?: (typing: TypingIndicator) => void;
  onHandoff?: (handoff: AgentHandoff) => void;
  onError?: (error: ChatError) => void;
  onEvent?: (event: ChatEvent) => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
}

interface ChatWebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: ChatError | null;
  reconnectAttempts: number;
  lastHeartbeat: Date | null;
}

export function useChatWebSocket({
  userId,
  sessionId,
  onMessage,
  onTyping,
  onHandoff,
  onError,
  onEvent,
  autoReconnect = true,
  maxReconnectAttempts = 5
}: UseChatWebSocketOptions) {
  const [state, setState] = useState<ChatWebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0,
    lastHeartbeat: null
  });

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  // Initialize WebSocket connection
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setState(prev => ({ 
      ...prev, 
      isConnecting: true, 
      error: null 
    }));

    try {
      // Use mock socket in development
      const socket = process.env.NODE_ENV === 'development' 
        ? createMockSocket() as any
        : io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001', {
            auth: {
              userId,
              sessionId
            },
            transports: ['websocket', 'polling'],
            timeout: 5000,
            reconnection: false // Handle reconnection manually
          });

      socketRef.current = socket;

      // Connection events
      socket.on('connect', () => {
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          reconnectAttempts: 0,
          error: null,
          lastHeartbeat: new Date()
        }));

        onEvent?.({
          type: 'connection_restored',
          data: { sessionId, userId },
          timestamp: new Date()
        });

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          socket.emit('heartbeat', { timestamp: Date.now() });
        }, 30000);
      });

      socket.on('disconnect', (reason: any) => {
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false
        }));

        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        onEvent?.({
          type: 'connection_lost',
          data: { reason, sessionId, userId },
          timestamp: new Date()
        });

        // Auto-reconnect logic (disabled in development for stability)
        if (autoReconnect && state.reconnectAttempts < maxReconnectAttempts && process.env.NODE_ENV !== 'development') {
          const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 10000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setState(prev => ({
              ...prev,
              reconnectAttempts: prev.reconnectAttempts + 1
            }));
            connect();
          }, delay);
        }
      });

      socket.on('connect_error', (error: any) => {
        const chatError: ChatError = {
          id: generateId(),
          type: 'connection',
          message: `Connection failed: ${error.message}`,
          timestamp: new Date(),
          isRecoverable: true
        };

        setState(prev => ({
          ...prev,
          error: chatError,
          isConnecting: false
        }));

        onError?.(chatError);
      });

      // Chat message events
      socket.on('agent_message', (data: ChatWebSocketMessage) => {
        const message: ChatMessage = {
          id: data.payload.id || generateId(),
          content: data.payload.content,
          type: 'agent',
          agentType: data.payload.agentType,
          agentId: data.payload.agentId,
          timestamp: new Date(data.timestamp),
          status: 'delivered',
          metadata: data.payload.metadata
        };

        onMessage?.(message);
        onEvent?.({
          type: 'message_received',
          data: message,
          timestamp: new Date()
        });
      });

      socket.on('agent_typing', (data: TypingIndicator) => {
        onTyping?.(data);
        onEvent?.({
          type: data.isTyping ? 'agent_typing' : 'agent_stopped_typing',
          data,
          timestamp: new Date()
        });
      });

      socket.on('agent_handoff', (data: AgentHandoff) => {
        onHandoff?.(data);
        onEvent?.({
          type: 'agent_handoff',
          data,
          timestamp: new Date()
        });
      });

      socket.on('chat_error', (data: any) => {
        const chatError: ChatError = {
          id: generateId(),
          type: data.type || 'agent_error',
          message: data.message,
          agentId: data.agentId,
          timestamp: new Date(),
          isRecoverable: data.isRecoverable || false
        };

        setState(prev => ({ ...prev, error: chatError }));
        onError?.(chatError);
        onEvent?.({
          type: 'error_occurred',
          data: chatError,
          timestamp: new Date()
        });
      });

      socket.on('heartbeat_response', () => {
        setState(prev => ({
          ...prev,
          lastHeartbeat: new Date()
        }));
      });

    } catch (error) {
      const chatError: ChatError = {
        id: generateId(),
        type: 'connection',
        message: `Failed to initialize connection: ${error}`,
        timestamp: new Date(),
        isRecoverable: true
      };

      setState(prev => ({
        ...prev,
        error: chatError,
        isConnecting: false
      }));

      onError?.(chatError);
    }
  }, [userId, sessionId, onMessage, onTyping, onHandoff, onError, onEvent, autoReconnect, maxReconnectAttempts, state.reconnectAttempts]);

  // Send user message
  const sendMessage = useCallback((content: string, metadata?: Record<string, any>) => {
    if (!socketRef.current?.connected) {
      const error: ChatError = {
        id: generateId(),
        type: 'connection',
        message: 'Not connected to chat server',
        timestamp: new Date(),
        isRecoverable: true
      };
      onError?.(error);
      return null;
    }

    const messageId = generateId();
    const message: ChatMessage = {
      id: messageId,
      content,
      type: 'user',
      timestamp: new Date(),
      status: 'sending',
      metadata
    };

    socketRef.current.emit('user_message', {
      id: messageId,
      content,
      metadata,
      sessionId,
      userId,
      timestamp: Date.now()
    });

    onEvent?.({
      type: 'message_sent',
      data: message,
      timestamp: new Date()
    });

    return message;
  }, [sessionId, userId, onError, onEvent]);

  // Send typing indicator
  const sendTyping = useCallback((isTyping: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('user_typing', {
        isTyping,
        sessionId,
        userId,
        timestamp: Date.now()
      });
    }
  }, [sessionId, userId]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      reconnectAttempts: 0,
      lastHeartbeat: null
    });
  }, []);

  // Retry connection
  const retry = useCallback(() => {
    disconnect();
    setState(prev => ({ ...prev, reconnectAttempts: 0, error: null }));
    connect();
  }, [disconnect, connect]);

  // Initialize connection on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    ...state,
    sendMessage,
    sendTyping,
    disconnect,
    retry,
    connect
  };
}