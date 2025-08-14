/**
 * FACET Chat Components Export Index
 * Centralized exports for all chat interface components
 */

export { ChatInterface, ManagedChatInterface } from './chat-interface';
export { MessageList, VirtualizedMessageList } from './message-list';
export { MessageBubble, MessageGroup } from './message-bubble';
export { ChatInput, QuickActions } from './chat-input';
export { AgentAvatar, AgentSwitchAnimation, MultiAgentPresence } from './agent-avatar';
export { TypingIndicator, AdvancedTypingIndicator } from './typing-indicator';
export {
  AgentSwitchNotification,
  HandoffQueue,
  CoordinationEventNotification
} from './agent-switch-notification';

// Re-export types for convenience
export type {
  ChatMessage,
  ChatReaction,
  ChatSession,
  AgentHandoff,
  TypingIndicator as TypingIndicatorType,
  ChatWebSocketMessage,
  AgentPresence,
  ChatError,
  ChatEventType,
  ChatEvent,
  AgentConfigType
} from '@/lib/chat/types';

export { AGENT_CONFIG } from '@/lib/chat/types';