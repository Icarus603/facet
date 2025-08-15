/**
 * FACET Typing Indicator Component
 * Real-time typing feedback with agent-specific styling
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AgentType } from '@/lib/agents/agent-types';
import { AGENT_CONFIG, TypingIndicator as TypingIndicatorType } from '@/lib/chat/types';
import { AgentAvatar } from './agent-avatar';

interface TypingIndicatorProps {
  typingIndicators: TypingIndicatorType[];
  className?: string;
}

export function TypingIndicator({ typingIndicators, className }: TypingIndicatorProps) {
  const activeTyping = typingIndicators.filter(indicator => indicator.isTyping);

  if (activeTyping.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-2 py-2', className)}>
      {activeTyping.map((indicator) => (
        <TypingBubble
          key={indicator.agentId}
          agentType={indicator.agentType}
          timestamp={indicator.timestamp}
        />
      ))}
    </div>
  );
}

interface TypingBubbleProps {
  agentType: AgentType;
  timestamp: Date;
}

function TypingBubble({ agentType, timestamp }: TypingBubbleProps) {
  const config = AGENT_CONFIG[agentType];

  return (
    <div className="flex items-start gap-3 animate-slide-in">
      <AgentAvatar
        agentType={agentType}
        size="sm"
        status="typing"
        showStatus={false}
      />
      
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: config.color }}>
            {config.name}
          </span>
          <span className="text-xs text-muted-foreground">
            is typing...
          </span>
        </div>
        
        <div 
          className="flex items-center gap-1 px-4 py-3 rounded-2xl max-w-16 animate-pulse"
          style={{ 
            backgroundColor: `${config.color}10`,
            borderColor: `${config.color}30`
          }}
        >
          <TypingDots color={config.color} />
        </div>
      </div>
    </div>
  );
}

interface TypingDotsProps {
  color: string;
}

function TypingDots({ color }: TypingDotsProps) {
  return (
    <div className="flex items-center gap-1">
      <div 
        className="w-2 h-2 rounded-full animate-bounce"
        style={{ 
          backgroundColor: color,
          animationDelay: '0ms',
          animationDuration: '1.4s'
        }}
      />
      <div 
        className="w-2 h-2 rounded-full animate-bounce"
        style={{ 
          backgroundColor: color,
          animationDelay: '160ms',
          animationDuration: '1.4s'
        }}
      />
      <div 
        className="w-2 h-2 rounded-full animate-bounce"
        style={{ 
          backgroundColor: color,
          animationDelay: '320ms',
          animationDuration: '1.4s'
        }}
      />
    </div>
  );
}

// Enhanced typing indicator with processing states
interface AdvancedTypingIndicatorProps {
  agentType: AgentType;
  state: 'idle' | 'thinking' | 'typing' | 'coordinating';
  coordinatingWith?: AgentType[];
  className?: string;
}

export function AdvancedTypingIndicator({ 
  agentType, 
  state, 
  coordinatingWith,
  className 
}: AdvancedTypingIndicatorProps) {
  const config = AGENT_CONFIG[agentType];

  if (state === 'idle') return null;

  const getStateMessage = () => {
    switch (state) {
      case 'thinking':
        return 'analyzing your message...';
      case 'typing':
        return 'typing a response...';
      case 'coordinating':
        return coordinatingWith?.length 
          ? `coordinating with ${coordinatingWith.length} other agent${coordinatingWith.length > 1 ? 's' : ''}...`
          : 'coordinating with other agents...';
      default:
        return 'processing...';
    }
  };

  const getAnimation = () => {
    switch (state) {
      case 'thinking':
        return 'animate-pulse';
      case 'typing':
        return 'animate-bounce';
      case 'coordinating':
        return 'animate-ping';
      default:
        return 'animate-pulse';
    }
  };

  return (
    <div className={cn('flex items-start gap-3 py-2 animate-slide-in', className)}>
      <AgentAvatar
        agentType={agentType}
        size="sm"
        status={state === 'coordinating' ? 'processing' : 'typing'}
        showStatus={false}
      />
      
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: config.color }}>
            {config.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {getStateMessage()}
          </span>
        </div>
        
        {state === 'coordinating' && coordinatingWith && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">with</span>
            {coordinatingWith.map((otherAgent) => (
              <AgentAvatar
                key={otherAgent}
                agentType={otherAgent}
                size="sm"
                status="processing"
                showStatus={false}
                className="scale-75"
              />
            ))}
          </div>
        )}
        
        <div 
          className={cn(
            'flex items-center justify-center px-4 py-2 rounded-2xl',
            getAnimation()
          )}
          style={{ 
            backgroundColor: `${config.color}08`,
            borderColor: `${config.color}20`
          }}
        >
          {state === 'typing' ? (
            <TypingDots color={config.color} />
          ) : (
            <div 
              className="w-6 h-1 rounded-full"
              style={{ backgroundColor: config.color }}
            />
          )}
        </div>
      </div>
    </div>
  );
}