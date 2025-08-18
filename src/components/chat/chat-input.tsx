'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'
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
  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const newHeight = Math.max(100, Math.min(textareaRef.current.scrollHeight, 300))
      textareaRef.current.style.height = newHeight + 'px'
    }
  }

  useEffect(() => {
    adjustHeight()
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
    <div className={cn("relative", className)}>
      <form onSubmit={handleSubmit}>
        <div className="relative flex items-end px-6 py-4 bg-white border border-gray-200 rounded-3xl focus-within:border-gray-300 transition-colors">
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
            className="flex-1 min-h-[100px] max-h-[300px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 outline-none placeholder:text-gray-500 text-gray-900 meslo-font text-base leading-6"
            rows={1}
            style={{ boxShadow: 'none' }}
          />

          {/* Send button */}
          <Button
            type="submit"
            size="icon"
            disabled={disabled || !message.trim() || isComposing}
            className="flex-shrink-0 w-8 h-8 ml-3 rounded-lg border-0 p-0"
            style={{ 
              backgroundColor: 'var(--facet-blue-primary)',
              color: 'white',
              opacity: disabled || !message.trim() || isComposing ? 0.4 : 1
            }}
            variant="default"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}