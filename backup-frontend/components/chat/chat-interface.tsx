/**
 * FACET Chat Interface Component
 * Main chat interface with real-time messaging and multi-agent coordination
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn, generateId } from '@/lib/utils';
import { ChatMessage, ChatReaction, AgentHandoff, ChatError, TypingIndicator } from '@/lib/chat/types';
import { AgentType } from '@/lib/agents/agent-types';
import { useChatWebSocket } from '@/hooks/use-chat-websocket';
import { MessageList } from './message-list';
import { ChatInput, QuickActions } from './chat-input';
import { AgentSwitchNotification, HandoffQueue, CoordinationEventNotification } from './agent-switch-notification';
import { MultiAgentPresence } from './agent-avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ExclamationTriangleIcon, 
  SignalSlashIcon, 
  ArrowPathIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

interface ChatInterfaceProps {
  userId: string;
  sessionId: string;
  initialMessages?: ChatMessage[];
  culturalProfile?: Record<string, any>;
  onSessionEnd?: () => void;
  className?: string;
}

interface ChatState {
  messages: ChatMessage[];
  typingIndicators: TypingIndicator[];
  handoffs: AgentHandoff[];
  activeAgents: AgentType[];
  currentAgent?: AgentType;
  error: ChatError | null;
  isLoading: boolean;
  hasMore: boolean;
}

export function ChatInterface({
  userId,
  sessionId,
  initialMessages = [],
  culturalProfile,
  onSessionEnd,
  className
}: ChatInterfaceProps) {
  const [state, setState] = useState<ChatState>({
    messages: initialMessages,
    typingIndicators: [],
    handoffs: [],
    activeAgents: ['intake'],
    currentAgent: 'intake',
    error: null,
    isLoading: false,
    hasMore: false
  });

  const [showQuickActions, setShowQuickActions] = useState(true);
  const [coordinationEvent, setCoordinationEvent] = useState<any>(null);
  const messagesRef = useRef<ChatMessage[]>(state.messages);

  // Update messages ref when state changes
  useEffect(() => {
    messagesRef.current = state.messages;
  }, [state.messages]);

  // Handle incoming messages
  const handleMessage = useCallback((message: ChatMessage) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
      currentAgent: message.agentType || prev.currentAgent,
      error: null
    }));

    // Hide quick actions after first user message
    if (message.type === 'user' && showQuickActions) {
      setShowQuickActions(false);
    }

    // Update active agents list
    if (message.agentType && message.agentType !== state.currentAgent) {
      setState(prev => ({
        ...prev,
        activeAgents: Array.from(new Set([...prev.activeAgents, message.agentType!]))
      }));
    }
  }, [showQuickActions, state.currentAgent]);

  // Handle typing indicators
  const handleTyping = useCallback((typing: TypingIndicator) => {
    setState(prev => ({
      ...prev,
      typingIndicators: typing.isTyping
        ? [...prev.typingIndicators.filter(t => t.agentId !== typing.agentId), typing]
        : prev.typingIndicators.filter(t => t.agentId !== typing.agentId)
    }));
  }, []);

  // Handle agent handoffs
  const handleHandoff = useCallback((handoff: AgentHandoff) => {
    setState(prev => ({
      ...prev,
      handoffs: [...prev.handoffs, handoff],
      currentAgent: handoff.toAgent,
      activeAgents: Array.from(new Set([...prev.activeAgents, handoff.toAgent]))
    }));

    // Add system message for handoff
    const systemMessage: ChatMessage = {
      id: generateId(),
      content: `${handoff.fromAgent ? 'Transferring' : 'Connecting'} to ${handoff.toAgent.replace('_', ' ')} for specialized assistance.`,
      type: 'system',
      timestamp: handoff.timestamp,
      status: 'delivered'
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, systemMessage]
    }));
  }, []);

  // Handle errors
  const handleError = useCallback((error: ChatError) => {
    setState(prev => ({
      ...prev,
      error,
      isLoading: false
    }));

    // Add error message to chat
    const errorMessage: ChatMessage = {
      id: generateId(),
      content: `System: ${error.message}${error.isRecoverable ? ' Please try again.' : ''}`,
      type: 'system',
      timestamp: error.timestamp,
      status: 'failed'
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, errorMessage]
    }));
  }, []);

  // Handle chat events
  const handleEvent = useCallback((event: any) => {
    switch (event.type) {
      case 'coordination_started':
        setCoordinationEvent({
          type: 'started',
          agents: event.data.agents || [],
          duration: event.data.estimatedDuration
        });
        break;
      case 'coordination_completed':
        setCoordinationEvent({
          type: 'completed',
          agents: event.data.agents || []
        });
        setTimeout(() => setCoordinationEvent(null), 5000);
        break;
      case 'coordination_failed':
        setCoordinationEvent({
          type: 'failed',
          agents: event.data.agents || []
        });
        setTimeout(() => setCoordinationEvent(null), 8000);
        break;
    }
  }, []);

  // Initialize WebSocket connection
  const {
    isConnected,
    isConnecting,
    error: wsError,
    sendMessage,
    sendTyping,
    retry
  } = useChatWebSocket({
    userId,
    sessionId,
    onMessage: handleMessage,
    onTyping: handleTyping,
    onHandoff: handleHandoff,
    onError: handleError,
    onEvent: handleEvent
  });

  // Send message handler
  const handleSendMessage = useCallback((content: string, metadata?: Record<string, any>) => {
    const message = sendMessage(content, {
      ...metadata,
      culturalProfile
    });

    if (message) {
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, message],
        error: null
      }));
    }
  }, [sendMessage, culturalProfile]);

  // Handle message reactions
  const handleReaction = useCallback((messageId: string, reactionType: ChatReaction['type']) => {
    const reaction: ChatReaction = {
      id: generateId(),
      type: reactionType,
      userId,
      timestamp: new Date()
    };

    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg =>
        msg.id === messageId
          ? {
              ...msg,
              reactions: [...(msg.reactions || []), reaction]
            }
          : msg
      )
    }));

    // Send reaction to backend (TODO: implement)
    console.log('Reaction sent:', { messageId, reaction });
  }, [userId]);

  // Handle message retry
  const handleRetry = useCallback((messageId: string) => {
    const message = state.messages.find(m => m.id === messageId);
    if (message && message.type === 'user') {
      handleSendMessage(message.content, message.metadata);
    }
  }, [state.messages, handleSendMessage]);

  // Load more messages
  const handleLoadMore = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    // TODO: Implement actual message loading
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasMore: false
      }));
    }, 1000);
  }, []);

  // Quick action handler
  const handleQuickAction = useCallback((action: string) => {
    handleSendMessage(action, { isQuickAction: true });
  }, [handleSendMessage]);

  // Dismiss handoff notification
  const handleDismissHandoff = useCallback((handoffId: string) => {
    setState(prev => ({
      ...prev,
      handoffs: prev.handoffs.filter(h => h.id !== handoffId)
    }));
  }, []);

  // Error recovery
  const handleErrorRecovery = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
    retry();
  }, [retry]);

  return (
    <Card className={cn('flex flex-col h-full max-h-screen border-0 shadow-none rounded-none', className)}>

      {/* Error banner */}
      {state.error && (
        <Alert className="m-4 border-destructive/20 bg-destructive/5">
          <ExclamationTriangleIcon className="w-4 h-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{state.error.message}</span>
            {state.error.isRecoverable && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleErrorRecovery}
                className="ml-2"
                style={{ borderColor: '#1886C0', color: '#1886C0' }}
              >
                <ArrowPathIcon className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Connection error */}
      {!isConnected && !isConnecting && (
        <Alert className="m-4 border-destructive/20 bg-destructive/5">
          <SignalSlashIcon className="w-4 h-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Connection lost. Some features may be unavailable.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={retry}
              disabled={isConnecting}
              style={{ borderColor: '#1886C0', color: '#1886C0' }}
            >
              <ArrowPathIcon className="w-3 h-3 mr-1" />
              Reconnect
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Handoff notifications */}
      <HandoffQueue
        handoffs={state.handoffs.slice(-2)} // Show last 2 handoffs
        onDismissHandoff={handleDismissHandoff}
      />

      {/* Coordination event notification */}
      {coordinationEvent && (
        <CoordinationEventNotification
          agentsInvolved={coordinationEvent.agents}
          eventType={coordinationEvent.type}
          duration={coordinationEvent.duration}
          isVisible={true}
          onDismiss={() => setCoordinationEvent(null)}
        />
      )}

      {/* Main Content Area - Exact Claude Style */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 bg-claude-chat-bg -mt-48">
        {state.messages.length === 0 ? (
          <div className="w-full max-w-2xl">
            {/* Welcome Section - FACET specific */}
            <div className="text-center mb-8">
              {/* Realistic Diamond Shape */}
              <div className="mx-auto -mb-2 relative w-32 h-32 flex items-center justify-center">
                <svg 
                  width="128" 
                  height="128" 
                  viewBox="0 0 128 128"
                  className="drop-shadow-lg"
                >
                  <defs>
                    {/* GORGEOUS FACET brand colors with dramatic depth */}
                    <radialGradient id="tableGrad" cx="40%" cy="25%" r="70%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="1"/>
                      <stop offset="20%" stopColor="#2C84DB" stopOpacity="0.9"/>
                      <stop offset="60%" stopColor="#0580B2"/>
                      <stop offset="90%" stopColor="#940011"/>
                      <stop offset="100%" stopColor="#132845"/>
                    </radialGradient>
                    
                    <linearGradient id="crownBright" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff"/>
                      <stop offset="25%" stopColor="#2C84DB"/>
                      <stop offset="75%" stopColor="#0580B2"/>
                      <stop offset="100%" stopColor="#132845"/>
                    </linearGradient>
                    
                    <linearGradient id="crownMedium" x1="100%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95"/>
                      <stop offset="30%" stopColor="#2C84DB"/>
                      <stop offset="70%" stopColor="#940011"/>
                      <stop offset="100%" stopColor="#73001C"/>
                    </linearGradient>
                    
                    <linearGradient id="crownDark" x1="50%" y1="0%" x2="50%" y2="100%">
                      <stop offset="0%" stopColor="#0580B2"/>
                      <stop offset="40%" stopColor="#132845"/>
                      <stop offset="70%" stopColor="#940011"/>
                      <stop offset="100%" stopColor="#73001C"/>
                    </linearGradient>
                    
                    <linearGradient id="pavilionBright" x1="0%" y1="0%" x2="50%" y2="100%">
                      <stop offset="0%" stopColor="#2C84DB"/>
                      <stop offset="30%" stopColor="#0580B2"/>
                      <stop offset="60%" stopColor="#940011"/>
                      <stop offset="100%" stopColor="#73001C"/>
                    </linearGradient>
                    
                    <linearGradient id="pavilionMedium" x1="100%" y1="0%" x2="50%" y2="100%">
                      <stop offset="0%" stopColor="#0580B2"/>
                      <stop offset="25%" stopColor="#132845"/>
                      <stop offset="70%" stopColor="#940011"/>
                      <stop offset="100%" stopColor="#73001C"/>
                    </linearGradient>
                    
                    <linearGradient id="pavilionDark" x1="50%" y1="0%" x2="50%" y2="100%">
                      <stop offset="0%" stopColor="#132845"/>
                      <stop offset="40%" stopColor="#940011"/>
                      <stop offset="80%" stopColor="#73001C"/>
                      <stop offset="100%" stopColor="#73001C"/>
                    </linearGradient>
                    
                    {/* Gorgeous accent gradients */}
                    <linearGradient id="wineAccent" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#940011"/>
                      <stop offset="50%" stopColor="#73001C"/>
                      <stop offset="100%" stopColor="#132845"/>
                    </linearGradient>
                    
                    <linearGradient id="blueAccent" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#2C84DB"/>
                      <stop offset="50%" stopColor="#0580B2"/>
                      <stop offset="100%" stopColor="#132845"/>
                    </linearGradient>
                    
                    <linearGradient id="deepGlow" x1="50%" y1="0%" x2="50%" y2="100%">
                      <stop offset="0%" stopColor="#2C84DB" stopOpacity="0.8"/>
                      <stop offset="50%" stopColor="#940011" stopOpacity="0.6"/>
                      <stop offset="100%" stopColor="#132845" stopOpacity="0.9"/>
                    </linearGradient>
                    
                    {/* Gorgeous sparkle filters */}
                    <filter id="sparkle" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="0.8"/>
                      <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.2 0"/>
                    </filter>
                    
                    <filter id="diamondGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  
                  {/* Round Brilliant Cut Diamond - GORGEOUS with glow */}
                  <g filter="url(#diamondGlow)">
                  
                  {/* BACKGROUND FILL TO ELIMINATE ALL WHITE SPACES */}
                  <polygon points="56,38 72,38 96,65 90,72 64,98 38,72 32,65 56,38" fill="#132845"/>
                  
                  {/* TABLE (top flat surface) - proper size ratio */}
                  <polygon 
                    points="55,38 73,38 75,40 73,42 55,42 53,40" 
                    fill="url(#tableGrad)"
                  />
                  
                  {/* CROWN MAIN FACETS (8 facets around table) */}
                  <polygon points="55,38 53,40 45,48 50,45" fill="url(#crownBright)"/>
                  <polygon points="73,38 75,40 83,48 78,45" fill="url(#crownMedium)"/>
                  <polygon points="75,40 73,42 83,48" fill="url(#crownDark)"/>
                  <polygon points="53,40 55,42 45,48" fill="url(#crownBright)"/>
                  <polygon points="50,45 45,48 36,58 42,52" fill="url(#crownMedium)"/>
                  <polygon points="78,45 83,48 92,58 86,52" fill="url(#crownDark)"/>
                  <polygon points="45,48 55,42 64,50 54,52" fill="url(#crownBright)"/>
                  <polygon points="83,48 73,42 64,50 74,52" fill="url(#crownMedium)"/>
                  
                  {/* STAR FACETS (8 small triangular facets) */}
                  <polygon points="55,38 50,45 54,42" fill="url(#crownBright)" opacity="0.9"/>
                  <polygon points="73,38 78,45 74,42" fill="url(#crownMedium)" opacity="0.9"/>
                  <polygon points="50,45 42,52 48,48" fill="url(#crownDark)" opacity="0.8"/>
                  <polygon points="78,45 86,52 80,48" fill="url(#crownBright)" opacity="0.8"/>
                  
                  {/* GIRDLE (widest part - proper thickness) */}
                  <ellipse cx="64" cy="58" rx="28" ry="3" fill="#0580B2" opacity="0.7"/>
                  
                  {/* FILL ALL GAPS WITH SOLID COLORS */}
                  <polygon points="40,56 64,58 92,58 88,56 64,50 40,56" fill="#132845"/>
                  <polygon points="36,64 40,72 64,98 64,80 32,65 36,64" fill="#940011"/>
                  <polygon points="92,64 96,65 64,80 64,98 88,72 92,64" fill="#73001C"/>
                  <polygon points="32,65 38,72 64,98 56,92 48,76 32,65" fill="#940011"/>
                  <polygon points="96,65 90,72 72,92 64,98 80,76 96,65" fill="#73001C"/>
                  <polygon points="45,48 55,42 64,50 54,52 45,48" fill="#2C84DB"/>
                  <polygon points="83,48 74,52 64,50 73,42 83,48" fill="#0580B2"/>
                  <polygon points="50,45 42,52 54,52 57,47 50,45" fill="#2C84DB"/>
                  <polygon points="78,45 86,52 74,52 71,47 78,45" fill="#0580B2"/>
                  
                  {/* FILL ALL REMAINING WHITE SPACES */}
                  <polygon points="55,38 53,40 45,48 50,45 55,38" fill="#174875"/>
                  <polygon points="73,38 78,45 83,48 75,40 73,38" fill="#174875"/>
                  <polygon points="53,40 55,42 45,48 53,40" fill="#0580B2"/>
                  <polygon points="75,40 73,42 83,48 75,40" fill="#0580B2"/>
                  <polygon points="42,52 36,58 40,56 45,48 42,52" fill="#132845"/>
                  <polygon points="86,52 83,48 88,56 92,58 86,52" fill="#132845"/>
                  <polygon points="54,80 64,98 58,85 54,80" fill="#73001C"/>
                  <polygon points="74,80 70,85 64,98 74,80" fill="#73001C"/>
                  <polygon points="48,76 56,92 58,85 54,80 48,76" fill="#940011"/>
                  <polygon points="80,76 74,80 70,85 72,92 80,76" fill="#940011"/>
                  
                  {/* FILL CENTER WHITE AREAS */}
                  <polygon points="55,42 59,50 69,50 73,42 64,50 55,42" fill="#174875"/>
                  <polygon points="57,47 58,49 70,49 71,47 64,50 57,47" fill="#2C84DB"/>
                  <polygon points="54,52 58,49 59,50 64,50 69,50 70,49 74,52 64,58 54,52" fill="#0580B2"/>
                  <polygon points="64,50 64,58 88,56 83,48 74,52 64,50" fill="#132845"/>
                  <polygon points="64,50 54,52 45,48 40,56 64,58 64,50" fill="#132845"/>
                  
                  {/* PAVILION MAIN FACETS (8 large triangular facets) */}
                  <polygon points="42,52 36,58 64,98 54,80" fill="url(#pavilionBright)"/>
                  <polygon points="86,52 92,58 64,98 74,80" fill="url(#pavilionMedium)"/>
                  <polygon points="54,52 64,50 64,98 58,85" fill="url(#pavilionDark)"/>
                  <polygon points="74,52 64,50 64,98 70,85" fill="url(#pavilionBright)"/>
                  <polygon points="36,58 32,65 64,98 50,88" fill="url(#pavilionMedium)"/>
                  <polygon points="92,58 96,65 64,98 78,88" fill="url(#pavilionDark)"/>
                  <polygon points="32,65 38,72 64,98 56,92" fill="url(#pavilionBright)"/>
                  <polygon points="96,65 90,72 64,98 72,92" fill="url(#pavilionMedium)"/>
                  
                  {/* PAVILION LOWER GIRDLE FACETS */}
                  <polygon points="50,88 54,80 64,98" fill="url(#pavilionDark)" opacity="0.8"/>
                  <polygon points="78,88 74,80 64,98" fill="url(#pavilionMedium)" opacity="0.8"/>
                  <polygon points="56,92 58,85 64,98" fill="url(#pavilionBright)" opacity="0.7"/>
                  <polygon points="72,92 70,85 64,98" fill="url(#pavilionDark)" opacity="0.7"/>
                  
                  {/* CULET (bottom point - very small for modern cut) */}
                  <circle cx="64" cy="98" r="0.5" fill="#73001C" opacity="0.8"/>
                  
                  
                  </g> {/* End diamond glow group */}
                </svg>
              </div>
              <h1 className="text-5xl font-normal tracking-wide bg-gradient-to-r from-[#2C84DB] to-[#C41E3A] bg-clip-text text-transparent" style={{ fontFamily: "'Times New Roman', 'Georgia', 'Baskerville', serif" }}>Welcome to FACET</h1>
            </div>

            {/* Central Input - Exact Claude Style */}
            <div className="mb-4">
              <div className="relative">
                <textarea
                  placeholder="How can I help you today?"
                  disabled={!isConnected || isConnecting}
                  className="claude-input w-full min-h-40 px-4 pr-20 pt-3 pb-12 rounded-2xl bg-white resize-none placeholder-gray-400 text-gray-900 text-base leading-tight"
                  style={{ maxHeight: '300px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = 'auto'
                    target.style.height = Math.max(160, Math.min(300, target.scrollHeight)) + 'px'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      const target = e.target as HTMLTextAreaElement
                      if (target.value.trim()) {
                        handleSendMessage(target.value.trim())
                        target.value = ''
                      }
                    }
                  }}
                />
                {/* Send Button */}
                <button className="absolute bottom-4 right-3 w-8 h-8 text-white rounded-lg flex items-center justify-center text-sm hover:opacity-90" style={{ backgroundColor: '#1886C0' }}>
                  ↑
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-4xl space-y-6 mb-8">
            {state.messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-2xl px-6 py-4 rounded-3xl ${
                  message.type === 'user' 
                    ? 'bg-claude-orange text-white' 
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}>
                  <p>{message.content}</p>
                </div>
              </div>
            ))}
            
            {/* Input when chatting */}
            <div className="sticky bottom-0 bg-claude-chat-bg pt-4">
              <div className="relative">
                <textarea
                  placeholder="Share what's on your mind..."
                  disabled={!isConnected || isConnecting}
                  className="claude-input w-full min-h-40 px-4 pr-16 pt-3 pb-12 rounded-2xl bg-white resize-none placeholder-gray-400 text-gray-900 text-base leading-tight"
                  style={{ maxHeight: '300px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = 'auto'
                    target.style.height = Math.max(160, Math.min(300, target.scrollHeight)) + 'px'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      const target = e.target as HTMLTextAreaElement
                      if (target.value.trim()) {
                        handleSendMessage(target.value.trim())
                        target.value = ''
                      }
                    }
                  }}
                />
                <button className="absolute bottom-4 right-3 w-8 h-8 text-white rounded-lg flex items-center justify-center hover:opacity-90" style={{ backgroundColor: '#1886C0' }}>
                  ↑
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// Chat interface with session management
interface ManagedChatInterfaceProps extends Omit<ChatInterfaceProps, 'sessionId'> {
  autoStartSession?: boolean;
}

export function ManagedChatInterface({
  userId,
  autoStartSession = true,
  ...props
}: ManagedChatInterfaceProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Create new session
  const createSession = useCallback(async () => {
    setIsCreatingSession(true);
    try {
      // TODO: Implement actual session creation API call
      const newSessionId = generateId();
      setSessionId(newSessionId);
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setIsCreatingSession(false);
    }
  }, []);

  // Auto-create session on mount
  useEffect(() => {
    if (autoStartSession && !sessionId) {
      createSession();
    }
  }, [autoStartSession, sessionId, createSession]);

  // Show loading state while creating session
  if (!sessionId) {
    return (
      <Card className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-therapy-calm border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <p className="font-medium">Starting your therapy session</p>
            <p className="text-sm text-muted-foreground">
              Connecting you with our AI therapy team...
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <ChatInterface
      {...props}
      userId={userId}
      sessionId={sessionId}
      onSessionEnd={() => {
        setSessionId(null);
        props.onSessionEnd?.();
      }}
    />
  );
}