/**
 * FACET Message Bubble Component
 * Chat message display with agent-specific styling and status indicators
 */

'use client';

import React, { useState } from 'react';
import { cn, formatTime } from '@/lib/utils';
import { ChatMessage, ChatReaction, AGENT_CONFIG } from '@/lib/chat/types';
import { AgentAvatar } from './agent-avatar';
import { Button } from '@/components/ui/button';
import { 
  CheckIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  HeartIcon,
  LightBulbIcon,
  HandThumbUpIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';
import { 
  HeartIcon as HeartIconSolid,
  LightBulbIcon as LightBulbIconSolid,
  HandThumbUpIcon as HandThumbUpIconSolid
} from '@heroicons/react/24/solid';

interface MessageBubbleProps {
  message: ChatMessage;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  showReactions?: boolean;
  isLastInGroup?: boolean;
  onReaction?: (messageId: string, reaction: ChatReaction['type']) => void;
  onRetry?: (messageId: string) => void;
  className?: string;
}

export function MessageBubble({
  message,
  showAvatar = true,
  showTimestamp = true,
  showReactions = true,
  isLastInGroup = false,
  onReaction,
  onRetry,
  className
}: MessageBubbleProps) {
  const [showReactionButtons, setShowReactionButtons] = useState(false);
  
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';
  const config = message.agentType ? AGENT_CONFIG[message.agentType] : null;

  const getBubbleStyles = () => {
    if (isUser) {
      return {
        container: 'flex-row-reverse',
        bubble: 'bg-therapy-calm text-white rounded-2xl rounded-tr-md',
        content: 'text-right'
      };
    }
    
    if (isSystem) {
      return {
        container: 'justify-center',
        bubble: 'bg-muted text-muted-foreground rounded-lg px-3 py-2 text-sm',
        content: 'text-center'
      };
    }
    
    // Agent message
    return {
      container: 'flex-row',
      bubble: `rounded-2xl rounded-tl-md border ${
        config ? `border-[${config.color}30] bg-[${config.color}08]` : 'border-border bg-card'
      }`,
      content: 'text-left'
    };
  };

  const styles = getBubbleStyles();

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <ClockIcon className="w-4 h-4 text-muted-foreground animate-pulse" />;
      case 'sent':
        return <CheckIcon className="w-4 h-4 text-muted-foreground" />;
      case 'delivered':
        return <CheckIcon className="w-4 h-4 text-therapy-growth" />;
      case 'failed':
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1 text-destructive hover:text-destructive"
            onClick={() => onRetry?.(message.id)}
          >
            <ExclamationTriangleIcon className="w-4 h-4" />
          </Button>
        );
      default:
        return null;
    }
  };

  if (isSystem) {
    return (
      <div className={cn('flex w-full py-2', styles.container, className)}>
        <div className={styles.bubble}>
          <div className={styles.content}>
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn('flex w-full gap-3 py-2 group', styles.container, className)}
      onMouseEnter={() => setShowReactionButtons(true)}
      onMouseLeave={() => setShowReactionButtons(false)}
    >
      {/* Avatar */}
      {showAvatar && !isUser && message.agentType && (
        <div className="flex-shrink-0">
          <AgentAvatar
            agentType={message.agentType}
            size="sm"
            status="online"
            showStatus={false}
          />
        </div>
      )}

      {/* Message content */}
      <div className={cn('flex flex-col gap-1 max-w-xs md:max-w-md lg:max-w-lg', isUser && 'items-end')}>
        {/* Agent name and metadata */}
        {!isUser && message.agentType && showTimestamp && (
          <div className="flex items-center gap-2 px-1">
            <span 
              className="text-xs font-medium"
              style={{ color: config?.color || 'inherit' }}
            >
              {config?.name || 'Agent'}
            </span>
            {message.metadata?.confidence && (
              <span className="text-xs text-muted-foreground">
                {Math.round(message.metadata.confidence * 100)}% confidence
              </span>
            )}
            {message.metadata?.processingTime && (
              <span className="text-xs text-muted-foreground">
                {message.metadata.processingTime}ms
              </span>
            )}
          </div>
        )}

        {/* Message bubble */}
        <div className="relative">
          <div className={cn('px-4 py-3', styles.bubble)}>
            <div className={styles.content}>
              {message.content}
            </div>
          </div>

          {/* Cultural relevance indicator */}
          {message.metadata?.culturalRelevance && message.metadata.culturalRelevance > 0.8 && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-therapy-wisdom rounded-full border-2 border-background" />
          )}
        </div>

        {/* Timestamp and status */}
        {showTimestamp && (
          <div className={cn('flex items-center gap-1 px-1', isUser ? 'flex-row-reverse' : 'flex-row')}>
            <span className="text-xs text-muted-foreground">
              {formatTime(message.timestamp)}
            </span>
            {isUser && getStatusIcon()}
          </div>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex items-center gap-1 px-1">
            <MessageReactions reactions={message.reactions} />
          </div>
        )}

        {/* Reaction buttons */}
        {showReactions && showReactionButtons && !isUser && onReaction && (
          <div className="flex items-center gap-1 px-1 animate-fade-in">
            <ReactionButtons
              messageId={message.id}
              onReaction={onReaction}
            />
          </div>
        )}
      </div>

      {/* User avatar spacer */}
      {isUser && showAvatar && (
        <div className="flex-shrink-0 w-8" />
      )}
    </div>
  );
}

interface MessageReactionsProps {
  reactions: ChatReaction[];
}

function MessageReactions({ reactions }: MessageReactionsProps) {
  const reactionCounts = reactions.reduce((counts, reaction) => {
    counts[reaction.type] = (counts[reaction.type] || 0) + 1;
    return counts;
  }, {} as Record<ChatReaction['type'], number>);

  return (
    <div className="flex items-center gap-1">
      {Object.entries(reactionCounts).map(([type, count]) => (
        <div 
          key={type}
          className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs"
        >
          <ReactionIcon type={type as ChatReaction['type']} filled />
          <span>{count}</span>
        </div>
      ))}
    </div>
  );
}

interface ReactionButtonsProps {
  messageId: string;
  onReaction: (messageId: string, reaction: ChatReaction['type']) => void;
}

function ReactionButtons({ messageId, onReaction }: ReactionButtonsProps) {
  const reactions: { type: ChatReaction['type']; label: string }[] = [
    { type: 'helpful', label: 'Helpful' },
    { type: 'insightful', label: 'Insightful' },
    { type: 'supportive', label: 'Supportive' },
    { type: 'unclear', label: 'Unclear' }
  ];

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-background border shadow-sm">
      {reactions.map(({ type, label }) => (
        <Button
          key={type}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:scale-110 transition-transform"
          onClick={() => onReaction(messageId, type)}
          title={label}
        >
          <ReactionIcon type={type} />
        </Button>
      ))}
    </div>
  );
}

interface ReactionIconProps {
  type: ChatReaction['type'];
  filled?: boolean;
  className?: string;
}

function ReactionIcon({ type, filled = false, className }: ReactionIconProps) {
  const iconClass = cn('w-4 h-4', className);
  
  switch (type) {
    case 'helpful':
      return filled ? 
        <HandThumbUpIconSolid className={cn(iconClass, 'text-therapy-growth')} /> : 
        <HandThumbUpIcon className={iconClass} />;
    case 'insightful':
      return filled ? 
        <LightBulbIconSolid className={cn(iconClass, 'text-therapy-wisdom')} /> : 
        <LightBulbIcon className={iconClass} />;
    case 'supportive':
      return filled ? 
        <HeartIconSolid className={cn(iconClass, 'text-therapy-warm')} /> : 
        <HeartIcon className={iconClass} />;
    case 'unclear':
      return <QuestionMarkCircleIcon className={cn(iconClass, filled && 'text-muted-foreground')} />;
    default:
      return null;
  }
}

// Message group component for better organization
interface MessageGroupProps {
  messages: ChatMessage[];
  showAvatars?: boolean;
  showTimestamps?: boolean;
  showReactions?: boolean;
  onReaction?: (messageId: string, reaction: ChatReaction['type']) => void;
  onRetry?: (messageId: string) => void;
  className?: string;
}

export function MessageGroup({
  messages,
  showAvatars = true,
  showTimestamps = true,
  showReactions = true,
  onReaction,
  onRetry,
  className
}: MessageGroupProps) {
  if (messages.length === 0) return null;

  return (
    <div className={cn('flex flex-col', className)}>
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          showAvatar={index === 0 && showAvatars}
          showTimestamp={index === messages.length - 1 && showTimestamps}
          showReactions={showReactions}
          isLastInGroup={index === messages.length - 1}
          onReaction={onReaction}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
}