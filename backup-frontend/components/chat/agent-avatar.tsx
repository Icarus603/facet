/**
 * FACET Agent Avatar Component
 * Visual representation of therapy agents with status indicators
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AgentType } from '@/lib/agents/agent-types';
import { AGENT_CONFIG } from '@/lib/chat/types';

interface AgentAvatarProps {
  agentType: AgentType;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline' | 'typing' | 'processing';
  showStatus?: boolean;
  showName?: boolean;
  className?: string;
  onClick?: () => void;
}

export function AgentAvatar({
  agentType,
  size = 'md',
  status = 'online',
  showStatus = true,
  showName = false,
  className,
  onClick
}: AgentAvatarProps) {
  const config = AGENT_CONFIG[agentType];

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-2xl'
  };

  const statusClasses = {
    online: 'border-therapy-growth',
    offline: 'border-muted',
    typing: 'border-therapy-calm animate-pulse',
    processing: 'border-therapy-wisdom animate-spin'
  };

  const statusIndicatorClasses = {
    online: 'bg-therapy-growth',
    offline: 'bg-muted',
    typing: 'bg-therapy-calm animate-pulse',
    processing: 'bg-therapy-wisdom animate-pulse'
  };

  return (
    <div 
      className={cn(
        'inline-flex flex-col items-center gap-1',
        className
      )}
    >
      <div 
        className={cn(
          'relative flex items-center justify-center rounded-full border-2 transition-all duration-200',
          'cursor-pointer hover:scale-105 active:scale-95',
          sizeClasses[size],
          statusClasses[status],
          onClick && 'hover:shadow-md'
        )}
        style={{ 
          backgroundColor: `${config.color}15`,
          borderColor: config.color
        }}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <span 
          className="select-none"
          style={{ color: config.color }}
        >
          {config.avatar}
        </span>
        
        {/* Status indicator */}
        {showStatus && (
          <div 
            className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background',
              statusIndicatorClasses[status]
            )}
            aria-label={`Agent status: ${status}`}
          />
        )}

        {/* Typing animation overlay */}
        {status === 'typing' && (
          <div className="absolute inset-0 rounded-full border-2 border-therapy-calm animate-ping opacity-20" />
        )}

        {/* Processing animation overlay */}
        {status === 'processing' && (
          <div className="absolute inset-0 rounded-full">
            <div className="w-full h-full rounded-full border-2 border-transparent border-t-therapy-wisdom animate-spin" />
          </div>
        )}
      </div>

      {/* Agent name */}
      {showName && (
        <span 
          className={cn(
            'text-xs font-medium text-center max-w-20 truncate',
            size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs'
          )}
          style={{ color: config.color }}
        >
          {config.name}
        </span>
      )}
    </div>
  );
}

// Agent switching animation component
interface AgentSwitchAnimationProps {
  fromAgent?: AgentType | null;
  toAgent: AgentType;
  isVisible: boolean;
  onComplete?: () => void;
}

export function AgentSwitchAnimation({
  fromAgent,
  toAgent,
  isVisible,
  onComplete
}: AgentSwitchAnimationProps) {
  React.useEffect(() => {
    if (isVisible && onComplete) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="flex items-center justify-center gap-4 py-4 animate-fade-in">
      {fromAgent && (
        <>
          <div className="flex flex-col items-center gap-2">
            <AgentAvatar 
              agentType={fromAgent} 
              size="sm" 
              status="offline"
              className="opacity-60 scale-95"
            />
            <span className="text-xs text-muted-foreground">
              {AGENT_CONFIG[fromAgent].name}
            </span>
          </div>
          
          <div className="flex items-center gap-1 text-therapy-calm">
            <div className="w-2 h-0.5 bg-therapy-calm animate-pulse" />
            <div className="w-2 h-0.5 bg-therapy-calm animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-0.5 bg-therapy-calm animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        </>
      )}
      
      <div className="flex flex-col items-center gap-2">
        <AgentAvatar 
          agentType={toAgent} 
          size="md" 
          status="processing"
          className="scale-110"
        />
        <span className="text-sm font-medium text-therapy-calm">
          Connecting to {AGENT_CONFIG[toAgent].name}
        </span>
      </div>
    </div>
  );
}

// Multi-agent presence indicator
interface MultiAgentPresenceProps {
  activeAgents: AgentType[];
  currentAgent?: AgentType;
  className?: string;
}

export function MultiAgentPresence({
  activeAgents,
  currentAgent,
  className
}: MultiAgentPresenceProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {activeAgents.map((agentType) => (
        <AgentAvatar
          key={agentType}
          agentType={agentType}
          size="sm"
          status={currentAgent === agentType ? 'online' : 'offline'}
          showStatus={false}
          className={cn(
            'transition-all duration-200',
            currentAgent === agentType ? 'scale-110 z-10' : 'scale-90 opacity-60'
          )}
        />
      ))}
      
      {activeAgents.length > 1 && (
        <span className="ml-2 text-xs text-muted-foreground">
          {activeAgents.length} agents available
        </span>
      )}
    </div>
  );
}