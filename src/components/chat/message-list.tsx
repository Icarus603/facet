/**
 * FACET Message List Component  
 * Virtualized message display with auto-scroll and performance optimization
 */

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChatMessage, ChatReaction, AgentHandoff } from '@/lib/chat/types';
import { MessageBubble, MessageGroup } from './message-bubble';
import { AgentSwitchAnimation } from './agent-avatar';
import { TypingIndicator, AdvancedTypingIndicator } from './typing-indicator';
import { Button } from '@/components/ui/button';
import { ChevronDownIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface MessageListProps {
  messages: ChatMessage[];
  typingIndicators?: { agentId: string; agentType: any; isTyping: boolean; timestamp: Date }[];
  handoffs?: AgentHandoff[];
  isConnected?: boolean;
  isLoading?: boolean;
  onReaction?: (messageId: string, reaction: ChatReaction['type']) => void;
  onRetry?: (messageId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  className?: string;
}

export function MessageList({
  messages,
  typingIndicators = [],
  handoffs = [],
  isConnected = true,
  isLoading = false,
  onReaction,
  onRetry,
  onLoadMore,
  hasMore = false,
  className
}: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [currentHandoff, setCurrentHandoff] = useState<AgentHandoff | null>(null);

  // Group messages by sender and time proximity
  const groupedMessages = groupMessages(messages);

  // Scroll to bottom functionality
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end'
    });
  }, []);

  // Check if user is at bottom of messages
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const atBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
    
    setIsAtBottom(atBottom);
    setShowScrollToBottom(!atBottom && messages.length > 5);
  }, [messages.length]);

  // Auto-scroll to bottom for new messages
  useEffect(() => {
    if (isAtBottom && messages.length > 0) {
      scrollToBottom(true);
    }
  }, [messages, scrollToBottom, isAtBottom]);

  // Handle handoff animations
  useEffect(() => {
    const latestHandoff = handoffs[handoffs.length - 1];
    if (latestHandoff && latestHandoff !== currentHandoff) {
      setCurrentHandoff(latestHandoff);
      
      // Clear handoff after animation
      const timer = setTimeout(() => {
        setCurrentHandoff(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [handoffs, currentHandoff]);

  // Load more messages on scroll to top
  const handleScrollToTop = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container && container.scrollTop < 100 && hasMore && !isLoading && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollHandler = () => {
      handleScroll();
      handleScrollToTop();
    };

    container.addEventListener('scroll', scrollHandler, { passive: true });
    return () => container.removeEventListener('scroll', scrollHandler);
  }, [handleScroll, handleScrollToTop]);

  // Connection status indicator
  const connectionStatus = () => {
    if (!isConnected) {
      return (
        <div className="flex items-center justify-center gap-2 p-3 mx-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <ExclamationTriangleIcon className="w-4 h-4 text-destructive" />
          <span className="text-sm text-destructive">Connection lost. Trying to reconnect...</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn('flex flex-col h-full relative', className)}>
      {/* Message container */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scroll-smooth"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="flex flex-col gap-4 p-4 pb-8">
          {/* Load more indicator */}
          {hasMore && (
            <div className="flex justify-center py-2">
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-therapy-calm border-t-transparent rounded-full animate-spin" />
                  Loading messages...
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLoadMore}
                  className="text-xs"
                >
                  Load earlier messages
                </Button>
              )}
            </div>
          )}

          {/* Connection status */}
          {connectionStatus()}

          {/* Welcome message for empty state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-therapy-calm/10 flex items-center justify-center mb-4">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Welcome to FACET</h3>
              <p className="text-muted-foreground max-w-md">
                Your culturally-aware therapy companion is ready to help. 
                Share what's on your mind to get started.
              </p>
            </div>
          )}

          {/* Message groups */}
          {groupedMessages.map((group, index) => (
            <div key={`group-${index}`} className="space-y-1">
              <MessageGroup
                messages={group}
                showAvatars={true}
                showTimestamps={true}
                showReactions={true}
                onReaction={onReaction}
                onRetry={onRetry}
              />
              
              {/* Show handoff animation after this group if applicable */}
              {currentHandoff && index === groupedMessages.length - 1 && (
                <AgentSwitchAnimation
                  fromAgent={currentHandoff.fromAgent}
                  toAgent={currentHandoff.toAgent}
                  isVisible={true}
                  onComplete={() => setCurrentHandoff(null)}
                />
              )}
            </div>
          ))}

          {/* Typing indicators */}
          {typingIndicators.length > 0 && (
            <TypingIndicator
              typingIndicators={typingIndicators}
              className="animate-slide-in"
            />
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <div className="absolute bottom-4 right-4 z-10">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'rounded-full w-10 h-10 p-0 shadow-lg',
              'bg-background/90 backdrop-blur-sm',
              'border-therapy-calm/30 hover:bg-therapy-calm/10',
              'animate-fade-in'
            )}
            onClick={() => scrollToBottom(true)}
            title="Scroll to bottom"
          >
            <ChevronDownIcon className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Helper function to group consecutive messages by sender and time
function groupMessages(messages: ChatMessage[]): ChatMessage[][] {
  if (messages.length === 0) return [];

  const groups: ChatMessage[][] = [];
  let currentGroup: ChatMessage[] = [];
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const prevMessage = i > 0 ? messages[i - 1] : null;
    
    const shouldStartNewGroup = (
      !prevMessage ||
      prevMessage.type !== message.type ||
      prevMessage.agentType !== message.agentType ||
      (message.timestamp.getTime() - prevMessage.timestamp.getTime()) > 5 * 60 * 1000 || // 5 minutes
      message.type === 'system' // System messages always get their own group
    );
    
    if (shouldStartNewGroup) {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = [message];
    } else {
      currentGroup.push(message);
    }
  }
  
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }
  
  return groups;
}

// Virtualized message list for very large conversations
interface VirtualizedMessageListProps extends MessageListProps {
  itemHeight?: number;
  overscan?: number;
}

export function VirtualizedMessageList({
  messages,
  itemHeight = 100,
  overscan = 5,
  ...props
}: VirtualizedMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate visible items
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    messages.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  const visibleMessages = messages.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;
  const totalHeight = messages.length * itemHeight;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    // Call parent scroll handler if provided
  };

  // Only use virtualization for very large message lists
  if (messages.length < 100) {
    return <MessageList {...props} messages={messages} />;
  }

  return (
    <div ref={containerRef} className={cn('h-full overflow-auto', props.className)} onScroll={handleScroll}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleMessages.map((message) => (
            <div key={message.id} style={{ height: itemHeight }}>
              <MessageBubble
                message={message}
                onReaction={props.onReaction}
                onRetry={props.onRetry}
                showAvatar={true}
                showTimestamp={true}
                showReactions={true}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}