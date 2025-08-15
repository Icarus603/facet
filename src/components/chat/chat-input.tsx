'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Mic, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function ChatInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Type your message...",
  className 
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [message])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || disabled || isComposing) return

    onSendMessage(message.trim())
    setMessage('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleCompositionStart = () => {
    setIsComposing(true)
  }

  const handleCompositionEnd = () => {
    setIsComposing(false)
  }

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <div className="flex items-end gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-blue-300 focus-within:ring-1 focus-within:ring-blue-300">
        {/* Attachment button (future feature) */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          disabled
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        {/* Text input */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 min-h-[44px] max-h-[120px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 placeholder:text-gray-400"
          rows={1}
        />

        {/* Voice input button (future feature) */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          disabled
        >
          <Mic className="h-4 w-4" />
        </Button>

        {/* Send button */}
        <Button
          type="submit"
          size="icon"
          disabled={disabled || !message.trim() || isComposing}
          className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Character limit indicator */}
      {message.length > 1000 && (
        <div className="absolute -top-6 right-0 text-xs text-gray-500">
          {message.length}/2000
        </div>
      )}

      {/* Help text */}
      <div className="mt-2 text-xs text-gray-500">
        Press Enter to send, Shift + Enter for new line
      </div>
    </form>
  )
}