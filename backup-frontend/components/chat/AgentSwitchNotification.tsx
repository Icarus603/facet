'use client'

import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface AgentSwitchNotificationProps {
  show: boolean
  message: string
  onClose: () => void
  className?: string
  duration?: number
}

export function AgentSwitchNotification({
  show,
  message,
  onClose,
  className,
  duration = 4000
}: AgentSwitchNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onClose, 300) // Wait for animation to complete
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [show, duration, onClose])

  if (!show && !isVisible) return null

  return (
    <div 
      className={cn(
        "relative z-10 px-6 py-3 border-b border-orange-100",
        "transition-all duration-300 ease-in-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
        className
      )}
      style={{ backgroundColor: 'rgba(217, 119, 87, 0.1)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-2 h-2 bg-claude-orange rounded-full animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              Agent Handoff
            </p>
            <p className="text-sm text-gray-700 mt-1">
              {message}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(onClose, 300)
          }}
          className="flex-shrink-0 text-claude-orange hover:opacity-70 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-gray-200">
        <div 
          className="h-full bg-claude-orange transition-all duration-linear"
          style={{
            width: isVisible ? '0%' : '100%',
            transitionDuration: `${duration}ms`
          }}
        />
      </div>
    </div>
  )
}