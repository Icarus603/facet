'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConversationList } from '@/components/chat/conversation-list'
import { createClient } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'

export default function RecentsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
      }
    }
    getUser()
  }, [])

  const handleNewChat = () => {
    router.push('/chat/new')
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#FAF9F5'}}>
      <ConversationList 
        userId={user.id} 
        onNewChat={handleNewChat}
      />
    </div>
  )
}