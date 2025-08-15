'use client'

import React from 'react'
import { AgentType } from '@/types/chat'
import { cn } from '@/lib/utils'

// Agent-specific initials/letters for clean look
const agentInitials = {
  intake: 'I',
  therapy_coordinator: 'T', 
  cultural_adapter: 'C',
  crisis_monitor: 'S', // S for Support
  progress_tracker: 'P'
}

const agentColors = {
  intake: 'bg-green-100 text-green-700 border-green-200',
  therapy_coordinator: 'bg-blue-100 text-blue-700 border-blue-200',
  cultural_adapter: 'bg-purple-100 text-purple-700 border-purple-200', 
  crisis_monitor: 'bg-red-100 text-red-700 border-red-200',
  progress_tracker: 'bg-yellow-100 text-yellow-700 border-yellow-200'
}

const agentHoverColors = {
  intake: 'hover:bg-green-200',
  therapy_coordinator: 'hover:bg-blue-200',
  cultural_adapter: 'hover:bg-purple-200', 
  crisis_monitor: 'hover:bg-red-200',
  progress_tracker: 'hover:bg-yellow-200'
}

interface AgentAvatarProps {
  agent: AgentType
  size?: 'sm' | 'md' | 'lg'
  showStatus?: boolean
  isActive?: boolean
  onClick?: () => void
  className?: string
}

export function AgentAvatar({
  agent,
  size = 'md',
  showStatus = false,
  isActive = false,
  onClick,
  className
}: AgentAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-lg', 
    lg: 'w-12 h-12 text-xl'
  }

  const baseClasses = cn(
    "relative inline-flex items-center justify-center rounded-full border-2 transition-all duration-200",
    sizeClasses[size],
    agentColors[agent],
    onClick && "cursor-pointer",
    onClick && agentHoverColors[agent],
    isActive && "ring-2 ring-orange-400 ring-offset-2",
    className
  )

  return (
    <div className={baseClasses} onClick={onClick}>
      {/* Agent Initial */}
      <span className="font-semibold">
        {agentInitials[agent]}
      </span>

      {/* Status Indicator */}
      {showStatus && (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white">
          <div className="w-full h-full bg-green-400 rounded-full animate-pulse" />
        </div>
      )}

      {/* Active Ring Animation */}
      {isActive && (
        <div className="absolute inset-0 rounded-full border-2 border-orange-400 animate-pulse" />
      )}
    </div>
  )
}

// Agent Avatar with Name
interface AgentAvatarWithNameProps extends AgentAvatarProps {
  showName?: boolean
  nameClassName?: string
}

export function AgentAvatarWithName({
  agent,
  showName = true,
  nameClassName,
  ...avatarProps
}: AgentAvatarWithNameProps) {
  const agentNames = {
    intake: 'Intake',
    therapy_coordinator: 'Coordinator', 
    cultural_adapter: 'Cultural Guide',
    crisis_monitor: 'Crisis Support',
    progress_tracker: 'Progress'
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <AgentAvatar agent={agent} {...avatarProps} />
      {showName && (
        <span className={cn(
          "text-xs font-medium text-gray-600 text-center",
          nameClassName
        )}>
          {agentNames[agent]}
        </span>
      )}
    </div>
  )
}

// Multi-Agent Avatar Stack (for showing handoffs)
interface AgentAvatarStackProps {
  agents: AgentType[]
  maxVisible?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function AgentAvatarStack({
  agents,
  maxVisible = 3,
  size = 'sm',
  className
}: AgentAvatarStackProps) {
  const visibleAgents = agents.slice(0, maxVisible)
  const remainingCount = agents.length - maxVisible

  return (
    <div className={cn("flex -space-x-2", className)}>
      {visibleAgents.map((agent, index) => (
        <AgentAvatar
          key={`${agent}-${index}`}
          agent={agent}
          size={size}
          className="border-2 border-white shadow-sm"
        />
      ))}
      {remainingCount > 0 && (
        <div className={cn(
          "inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-500 border-2 border-white text-xs font-medium",
          size === 'sm' && "w-8 h-8",
          size === 'md' && "w-10 h-10",
          size === 'lg' && "w-12 h-12"
        )}>
          +{remainingCount}
        </div>
      )}
    </div>
  )
}