import { createClient } from '@/lib/supabase/server'
import { ChatInterface } from '@/components/chat/chat-interface'
import { redirect } from 'next/navigation'

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // Get or create active session
  const { data: activeSession } = await supabase
    .from('therapy_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  let sessionId = activeSession?.id

  // Create new session if none exists
  if (!sessionId) {
    const { data: newSession } = await supabase
      .from('therapy_sessions')
      .insert({
        user_id: user.id,
        session_type: 'standard'
      })
      .select('id')
      .single()
    
    sessionId = newSession?.id
  }

  return (
    <div className="h-screen flex flex-col">
      <ChatInterface 
        userId={user.id}
        sessionId={sessionId}
      />
    </div>
  )
}