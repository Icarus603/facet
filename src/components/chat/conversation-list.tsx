'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Plus, Heart, Brain, AlertTriangle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'

interface ConversationSummary {
  id: string
  title: string
  preview: string
  timestamp: string
  emotionalState?: string
  riskLevel?: 'none' | 'low' | 'moderate' | 'high' | 'crisis'
  messageCount: number
  starred?: boolean
}

interface ConversationListProps {
  userId: string
  searchQuery?: string
  onNewChat: () => void
}

export function ConversationList({ userId, searchQuery = '', onNewChat }: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchQuery)
  const supabase = createClient()

  useEffect(() => {
    loadConversations()
  }, [userId, search])

  const loadConversations = async () => {
    try {
      setLoading(true)
      
      // Load from Supabase therapy_sessions table
      let query = supabase
        .from('therapy_sessions')
        .select(`
          id,
          started_at,
          ended_at,
          workflow_mode,
          session_summary,
          emotional_context,
          risk_assessment_level,
          conversation_messages(count)
        `)
        .eq('user_id', userId)
        .order('started_at', { ascending: false })

      if (search.trim()) {
        query = query.ilike('session_summary', `%${search.trim()}%`)
      }

      const { data: sessions, error } = await query

      if (error) {
        console.error('Error loading conversations:', error)
        return
      }

      // Transform sessions into conversation summaries
      const conversationSummaries: ConversationSummary[] = sessions?.map(session => {
        // Generate title from session summary or use default
        let title = 'Mental Health Session'
        if (session.session_summary) {
          title = session.session_summary.length > 50 
            ? session.session_summary.substring(0, 50) + '...'
            : session.session_summary
        }

        // Get preview text
        let preview = 'Therapeutic conversation'
        if (session.session_summary) {
          preview = session.session_summary.length > 100
            ? session.session_summary.substring(0, 100) + '...'
            : session.session_summary
        }

        return {
          id: session.id,
          title,
          preview,
          timestamp: session.started_at,
          emotionalState: session.emotional_context?.primary_emotion || 'neutral',
          riskLevel: session.risk_assessment_level || 'none',
          messageCount: session.conversation_messages?.[0]?.count || 0,
          starred: false // TODO: Add starred field to database
        }
      }) || []

      setConversations(conversationSummaries)
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEmotionIcon = (emotion: string) => {
    switch (emotion.toLowerCase()) {
      case 'anxiety':
      case 'anxious':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'sad':
      case 'sadness':
      case 'depression':
        return <Heart className="h-4 w-4 text-blue-500" />
      case 'calm':
      case 'peaceful':
        return <Brain className="h-4 w-4 text-green-500" />
      case 'happy':
      case 'joy':
        return <Heart className="h-4 w-4 text-pink-500" />
      default:
        return <Brain className="h-4 w-4 text-gray-500" />
    }
  }

  const getRiskBadge = (riskLevel: string) => {
    const riskStyles = {
      none: 'bg-green-100 text-green-800',
      low: 'bg-blue-100 text-blue-800',
      moderate: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      crisis: 'bg-red-100 text-red-800'
    }

    if (riskLevel === 'none') return null

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium meslo-font ${riskStyles[riskLevel as keyof typeof riskStyles]}`}>
        {riskLevel}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 meslo-font">Loading conversations...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-black meslo-font italic">
            Your conversation history
          </h1>
          <p className="text-gray-600 mt-2 meslo-font">
            {conversations.length} conversations with FACET
          </p>
        </div>
        <Button onClick={onNewChat} className="bg-facet-blue text-white hover:bg-facet-blue-light meslo-font">
          <Plus className="h-4 w-4 mr-2" />
          New chat
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search your conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 py-3 text-base meslo-font"
        />
      </div>

      {/* Conversation List */}
      {conversations.length === 0 ? (
        <div className="text-center py-12">
          <Brain className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2 meslo-font">
            {search ? 'No conversations found' : 'No conversations yet'}
          </h3>
          <p className="text-gray-500 mb-6 meslo-font">
            {search 
              ? 'Try adjusting your search terms'
              : 'Start your first conversation with FACET to begin your mental health journey'
            }
          </p>
          <Button onClick={onNewChat} className="bg-facet-gradient text-white meslo-font">
            <Plus className="h-4 w-4 mr-2" />
            Start your first conversation
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((conversation) => (
            <Link key={conversation.id} href={`/chat/${conversation.id}`}>
              <div className="bg-white rounded-lg border hover:border-facet-blue-light hover:shadow-md transition-all duration-200 p-6 cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {getEmotionIcon(conversation.emotionalState || 'neutral')}
                      <h3 className="text-lg font-semibold text-black truncate meslo-font">
                        {conversation.title}
                      </h3>
                      {getRiskBadge(conversation.riskLevel || 'none')}
                    </div>
                    
                    <p className="text-gray-600 mb-3 line-clamp-2 meslo-font">
                      {conversation.preview}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 meslo-font">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(conversation.timestamp), { addSuffix: true })}
                      </div>
                      <div>
                        {conversation.messageCount} messages
                      </div>
                    </div>
                  </div>
                  
                  {conversation.starred && (
                    <div className="ml-4">
                      <Heart className="h-5 w-5 text-red-500 fill-current" />
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}