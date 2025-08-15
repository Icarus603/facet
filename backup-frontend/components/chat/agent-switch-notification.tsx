/**
 * FACET Agent Switch Notification Component
 * Visual notifications for agent handoffs and coordination events
 */

'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AgentType } from '@/lib/agents/agent-types';
import { AgentHandoff, AGENT_CONFIG } from '@/lib/chat/types';
import { AgentAvatar } from './agent-avatar';
import { Button } from '@/components/ui/button';
import { XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface AgentSwitchNotificationProps {
  handoff: AgentHandoff;
  isVisible: boolean;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

export function AgentSwitchNotification({
  handoff,
  isVisible,
  onDismiss,
  showDetails = false,
  className
}: AgentSwitchNotificationProps) {
  const [showFullDetails, setShowFullDetails] = useState(false);
  
  const fromConfig = handoff.fromAgent ? AGENT_CONFIG[handoff.fromAgent] : null;
  const toConfig = AGENT_CONFIG[handoff.toAgent];

  const getHandoffMessage = () => {
    if (!handoff.fromAgent) {
      return `${toConfig.name} is now assisting you`;
    }
    
    return `Transferring from ${fromConfig?.name} to ${toConfig.name}`;
  };

  const getHandoffReason = () => {
    const reasons: Record<string, string> = {
      'cultural_expertise': 'to provide culturally-specific guidance',
      'crisis_intervention': 'for immediate safety assessment',
      'specialized_therapy': 'for specialized therapeutic techniques',
      'progress_evaluation': 'to review your therapeutic progress',
      'coordination_needed': 'for comprehensive care coordination',
      'user_request': 'as requested',
      'escalation': 'for enhanced support',
      'completion': 'to wrap up this session'
    };

    return reasons[handoff.reason] || handoff.reason;
  };

  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        'relative p-4 mx-4 rounded-lg border shadow-sm animate-slide-in',
        'bg-gradient-to-r from-therapy-calm/5 to-therapy-peaceful/5',
        'border-therapy-calm/20',
        className
      )}
    >
      {/* Dismiss button */}
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-background/50"
          onClick={onDismiss}
        >
          <XMarkIcon className="w-4 h-4" />
        </Button>
      )}

      <div className="flex items-start gap-4">
        {/* Agent transition visual */}
        <div className="flex items-center gap-3">
          {fromConfig && (
            <>
              <div className="flex flex-col items-center gap-1">
                <AgentAvatar
                  agentType={handoff.fromAgent!}
                  size="sm"
                  status="offline"
                  showStatus={false}
                  className="opacity-60 scale-90"
                />
                <span className="text-xs text-muted-foreground text-center max-w-16 truncate">
                  {fromConfig.name}
                </span>
              </div>
              
              <div className="flex items-center">
                <div className="w-4 h-0.5 bg-therapy-calm/50" />
                <div className="w-2 h-2 bg-therapy-calm rounded-full mx-1" />
                <div className="w-4 h-0.5 bg-therapy-calm/50" />
              </div>
            </>
          )}
          
          <div className="flex flex-col items-center gap-1">
            <AgentAvatar
              agentType={handoff.toAgent}
              size="md"
              status="online"
              showStatus={true}
              className="scale-110"
            />
            <span className="text-sm font-medium text-center max-w-20 truncate">
              {toConfig.name}
            </span>
          </div>
        </div>

        {/* Handoff information */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-medium text-therapy-calm">
              Agent Transition
            </h4>
            {handoff.confidence && (
              <div className="px-2 py-1 rounded-full bg-therapy-growth/10 text-therapy-growth text-xs">
                {Math.round(handoff.confidence * 100)}% match
              </div>
            )}
          </div>
          
          <p className="text-sm text-foreground mb-1">
            {getHandoffMessage()}
          </p>
          
          <p className="text-xs text-muted-foreground">
            {getHandoffReason()}
          </p>

          {/* Additional details */}
          {showDetails && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setShowFullDetails(!showFullDetails)}
                >
                  <InformationCircleIcon className="w-3 h-3 mr-1" />
                  {showFullDetails ? 'Hide' : 'Show'} Details
                </Button>
              </div>
              
              {showFullDetails && (
                <div className="text-xs text-muted-foreground space-y-1 animate-fade-in">
                  <div>Handoff ID: {handoff.id}</div>
                  <div>Time: {handoff.timestamp.toLocaleTimeString()}</div>
                  <div>Reason: {handoff.reason}</div>
                  {handoff.confidence && (
                    <div>Confidence: {Math.round(handoff.confidence * 100)}%</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Specializations indicator */}
      <div className="mt-3 flex flex-wrap gap-2">
        <div className="text-xs text-muted-foreground">
          Specializes in:
        </div>
        <div className="flex flex-wrap gap-1">
          {toConfig.description.split(' ').slice(0, 3).map((word, index) => (
            <span
              key={index}
              className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs"
            >
              {word}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Handoff queue component for multiple simultaneous handoffs
interface HandoffQueueProps {
  handoffs: AgentHandoff[];
  onDismissHandoff?: (handoffId: string) => void;
  maxVisible?: number;
  className?: string;
}

export function HandoffQueue({
  handoffs,
  onDismissHandoff,
  maxVisible = 3,
  className
}: HandoffQueueProps) {
  const visibleHandoffs = handoffs.slice(-maxVisible);
  
  if (handoffs.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {visibleHandoffs.map((handoff) => (
        <AgentSwitchNotification
          key={handoff.id}
          handoff={handoff}
          isVisible={true}
          onDismiss={onDismissHandoff ? () => onDismissHandoff(handoff.id) : undefined}
          showDetails={true}
        />
      ))}
      
      {handoffs.length > maxVisible && (
        <div className="text-center py-2">
          <span className="text-xs text-muted-foreground">
            +{handoffs.length - maxVisible} more transitions
          </span>
        </div>
      )}
    </div>
  );
}

// Coordination event notification for complex multi-agent scenarios
interface CoordinationEventProps {
  agentsInvolved: AgentType[];
  eventType: 'started' | 'completed' | 'failed';
  description?: string;
  duration?: number;
  isVisible: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function CoordinationEventNotification({
  agentsInvolved,
  eventType,
  description,
  duration,
  isVisible,
  onDismiss,
  className
}: CoordinationEventProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (eventType === 'started' && duration) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + (100 / (duration / 100));
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [eventType, duration]);

  if (!isVisible) return null;

  const getEventMessage = () => {
    const agentCount = agentsInvolved.length;
    switch (eventType) {
      case 'started':
        return `${agentCount} agents are coordinating to provide you with the best support`;
      case 'completed':
        return `Agent coordination completed successfully`;
      case 'failed':
        return `Coordination encountered an issue, but your primary agent will continue`;
      default:
        return description || 'Agent coordination in progress';
    }
  };

  const getEventColor = () => {
    switch (eventType) {
      case 'started':
        return 'therapy-calm';
      case 'completed':
        return 'therapy-growth';
      case 'failed':
        return 'destructive';
      default:
        return 'muted';
    }
  };

  const eventColor = getEventColor();

  return (
    <div
      className={cn(
        'relative p-4 mx-4 rounded-lg border shadow-sm animate-slide-in',
        `bg-${eventColor}/5 border-${eventColor}/20`,
        className
      )}
    >
      {onDismiss && eventType !== 'started' && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-8 w-8 p-0"
          onClick={onDismiss}
        >
          <XMarkIcon className="w-4 h-4" />
        </Button>
      )}

      <div className="flex items-center gap-4">
        {/* Agent avatars */}
        <div className="flex -space-x-2">
          {agentsInvolved.map((agentType, index) => (
            <AgentAvatar
              key={agentType}
              agentType={agentType}
              size="sm"
              status={eventType === 'started' ? 'processing' : 'online'}
              showStatus={false}
              className={cn(
                'border-2 border-background',
                index === 0 && 'z-10',
                index === 1 && 'z-9',
                'transition-all duration-300'
              )}
            />
          ))}
        </div>

        {/* Event information */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`text-sm font-medium text-${eventColor}`}>
              Multi-Agent Coordination
            </h4>
            {eventType === 'started' && duration && (
              <div className="px-2 py-1 rounded-full bg-therapy-calm/10 text-therapy-calm text-xs">
                ~{Math.round(duration / 1000)}s
              </div>
            )}
          </div>
          
          <p className="text-sm text-foreground">
            {getEventMessage()}
          </p>

          {/* Progress bar for active coordination */}
          {eventType === 'started' && (
            <div className="mt-2">
              <div className="w-full bg-muted rounded-full h-1">
                <div
                  className={`h-1 bg-${eventColor} rounded-full transition-all duration-300`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}