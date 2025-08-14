'use client'

import { useState, useCallback, useEffect } from 'react'
import { ChatMessage } from '@/types/chat'

interface UseChatHistoryReturn {
  messages: ChatMessage[]
  addMessage: (message: ChatMessage) => void
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void
  removeMessage: (messageId: string) => void
  clearMessages: () => void
  totalMessages: number
}

export function useChatHistory(sessionId?: string): UseChatHistoryReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])

  // Load initial messages from storage/API
  useEffect(() => {
    if (sessionId) {
      // In a real implementation, this would load from API/database
      // For now, load from localStorage as a fallback
      const storageKey = `chat_session_${sessionId}`
      const stored = localStorage.getItem(storageKey)
      
      if (stored) {
        try {
          const parsedMessages = JSON.parse(stored).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
          setMessages(parsedMessages)
        } catch (error) {
          console.error('Failed to load chat history:', error)
        }
      }
    }
  }, [sessionId])

  // Save messages to storage whenever they change
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      const storageKey = `chat_session_${sessionId}`
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages))
      } catch (error) {
        console.error('Failed to save chat history:', error)
      }
    }
  }, [messages, sessionId])

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message])
  }, [])

  const updateMessage = useCallback((messageId: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, ...updates, metadata: { ...msg.metadata, ...updates.metadata } }
          : msg
      )
    )
  }, [])

  const removeMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId))
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    if (sessionId) {
      const storageKey = `chat_session_${sessionId}`
      localStorage.removeItem(storageKey)
    }
  }, [sessionId])

  return {
    messages,
    addMessage,
    updateMessage,
    removeMessage,
    clearMessages,
    totalMessages: messages.length
  }
}