'use client'

import React, { useState, useRef, useEffect } from 'react'
import { AgentType } from '@/types/chat'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
  placeholder?: string
  currentAgent: AgentType
  className?: string
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = "Type your message...",
  currentAgent,
  className
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [message])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const isMessageValid = message.trim().length > 0

  return (
    <form onSubmit={handleSubmit} className={cn("", className)}>
      <div className={cn(
        "relative flex items-end gap-3 p-3 rounded-2xl border transition-all duration-200",
        isFocused 
          ? "border-gray-300 bg-claude-white shadow-sm" 
          : "border-gray-200 bg-claude-white",
        disabled && "opacity-50"
      )}>
        {/* Message Input */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full resize-none bg-transparent text-gray-900 placeholder-gray-500",
              "border-0 outline-none focus:ring-0 p-0",
              "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
            )}
            style={{ maxHeight: '120px' }}
          />
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Attachment Button (future feature) */}
          <button
            type="button"
            disabled={disabled}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={disabled || !isMessageValid}
            className={cn(
              "p-2 rounded-lg transition-all duration-200",
              isMessageValid && !disabled
                ? "bg-claude-orange text-white hover:opacity-90 shadow-sm"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Input Footer */}
      <div className="flex items-center justify-between mt-2 px-1">
        <div className="text-xs text-gray-500">
          {disabled ? 'Connecting...' : 'Press Enter to send, Shift+Enter for new line'}
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{message.length}/1000</span>
          {message.length > 800 && (
            <span className="text-claude-orange">
              {1000 - message.length} remaining
            </span>
          )}
        </div>
      </div>
    </form>
  )
}