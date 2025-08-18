'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChatInput } from '@/components/chat/chat-input'
import { FacetLogo } from '@/components/ui/facet-logo'
import { createClient } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'

export default function NewChatPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [newSessionId, setNewSessionId] = useState<string>('')
  const [greeting, setGreeting] = useState<string>('')

  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        // Get user profile with display_name
        const { data: userProfile } = await supabase
          .from('users')
          .select('display_name')
          .eq('id', authUser.id)
          .single()
        
        setUser({ ...authUser, display_name: userProfile?.display_name })
      }
    }
    
    // Generate new session ID for this conversation
    setNewSessionId(uuidv4())
    
    // Set random greeting on page load
    const greetings = [
      "How are you feeling",
      "What's on your mind", 
      "How can I help",
      "How are you doing",
      "What brings you here",
      "How's your day going",
      "What's happening",
      "How are things",
      "What's going on",
      "How's your mood",
      "What's weighing on you",
      "How are you coping",
      "What's your energy like",
      "How's your heart",
      "What do you need"
    ]
    setGreeting(greetings[Math.floor(Math.random() * greetings.length)])
    
    getUser()
  }, [])

  const handleSendMessage = async (message: string) => {
    // 1. Start API call immediately (don't wait)
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationId: newSessionId,
        userPreferences: {
          transparencyLevel: 'standard',
          agentVisibility: true,
          processingSpeed: 'thorough',
          communicationStyle: 'professional_warm'
        }
      })
    }).then(response => {
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      return response.json()
    }).then(data => {
      // Store the response for the chat page to pick up
      sessionStorage.setItem('apiResponse', JSON.stringify(data))
    }).catch(error => {
      console.error('API error:', error)
      sessionStorage.setItem('apiError', JSON.stringify(error))
    })
    
    // 2. Store message for display
    sessionStorage.setItem('pendingMessage', message)
    sessionStorage.setItem('pendingConversationId', newSessionId)
    
    // 3. Immediately navigate (parallel with API call)
    router.push(`/chat/${newSessionId}`)
  }

  const displayName = user?.display_name || 'Icarus'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{backgroundColor: '#FAF9F5', transform: 'translateY(-4rem)'}}>
      {/* Greeting */}
      <div className="text-center mb-2">
        <h1 className="text-gray-800 font-light italic flex items-center justify-center" style={{ fontSize: '2.75rem', fontFamily: '"Crimson Text", serif', transform: 'translateX(-2rem)' }}>
          <FacetLogo className="h-24 w-24" />
          {greeting}, {displayName}
        </h1>
      </div>

      {/* Simple Chat Input */}
      <div className="w-full max-w-3xl">
        <ChatInput 
          onSendMessage={handleSendMessage}
          placeholder="How can I help you today?"
        />
      </div>
    </div>
  )
}