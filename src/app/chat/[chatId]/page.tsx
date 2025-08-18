'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChatInterface } from '@/components/chat/chat-interface'
import { Button } from '@/components/ui/button'
import { Star, Edit, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownItem, DropdownTriggerButton } from '@/components/ui/dropdown-menu'

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const chatId = params.chatId as string
  
  const [user, setUser] = useState<any>(null)
  const [chatTitle, setChatTitle] = useState<string>('Mental Health Session')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isStarred, setIsStarred] = useState(false)
  const [tempTitle, setTempTitle] = useState<string>('')
  // Remove loading state - show interface immediately
  const [initialMessage, setInitialMessage] = useState<string>('')

  const supabase = createClient()


  useEffect(() => {
    async function loadChatData() {
      try {
        // Get user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/signin')
          return
        }
        setUser(user)

        // Check for pending message from /chat/new navigation
        const pendingMessage = sessionStorage.getItem('pendingMessage')
        const pendingConversationId = sessionStorage.getItem('pendingConversationId')
        
        if (pendingMessage && pendingConversationId === chatId) {
          // Clear the pending message from sessionStorage
          sessionStorage.removeItem('pendingMessage')
          sessionStorage.removeItem('pendingConversationId')
          
          // Set the initial message to be sent
          setInitialMessage(pendingMessage)
        }

        // Try to load chat/session title from database
        // Don't fail if session doesn't exist yet - it will be created when user sends message
        try {
          const { data: session } = await supabase
            .from('therapy_sessions')
            .select('session_summary, started_at')
            .eq('id', chatId)
            .eq('user_id', user.id)
            .single()

          if (session) {
            // Set title from session summary or generate from date
            const title = session.session_summary || 
              `Session from ${new Date(session.started_at).toLocaleDateString()}`
            setChatTitle(title.length > 50 ? title.substring(0, 50) + '...' : title)
          }
        } catch (dbError) {
          // Session doesn't exist yet - that's fine for new chats
          console.log('Session not found in database - will be created on first message')
        }

      } catch (error) {
        console.error('Error loading chat data:', error)
      }
      // Remove setLoading(false) - no loading needed
    }

    loadChatData()
  }, [chatId, router, supabase])

  const handleTitleSave = async (newTitle: string) => {
    try {
      const { error } = await supabase
        .from('therapy_sessions')
        .update({ session_summary: newTitle })
        .eq('id', chatId)
        .eq('user_id', user?.id)

      if (!error) {
        setChatTitle(newTitle)
      }
    } catch (error) {
      console.error('Error updating title:', error)
    }
    setIsEditingTitle(false)
  }


  const handleBackToRecents = () => {
    router.push('/chat/recents')
  }

  const handleStar = () => {
    setIsStarred(!isStarred)
    // TODO: Implement star functionality in database
  }

  const handleRename = () => {
    setTempTitle(chatTitle)
    setIsEditingTitle(true)
  }

  const handleRenameCancel = () => {
    setIsEditingTitle(false)
    setTempTitle('')
  }

  const handleRenameSave = async () => {
    if (tempTitle.trim()) {
      await handleTitleSave(tempTitle.trim())
    }
    setIsEditingTitle(false)
    setTempTitle('')
  }

  const handleDelete = () => {
    // TODO: Implement delete conversation functionality
    console.log('Delete conversation:', chatId)
  }

  // Remove loading screen - show interface immediately

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#FAF9F5'}}>
      {/* Chat Header */}
      <div className="sticky top-0 z-10" style={{backgroundColor: '#FAF9F5'}}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <DropdownMenu
              align="right"
              trigger={
                <DropdownTriggerButton>
                  <h1 className="text-lg font-semibold text-black truncate max-w-md meslo-font">
                    {chatTitle}
                  </h1>
                </DropdownTriggerButton>
              }
            >
              <DropdownItem onClick={handleStar}>
                <Star className={`h-5 w-5 ${isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                {isStarred ? 'Unstar' : 'Star'}
              </DropdownItem>
              <DropdownItem onClick={handleRename}>
                <Edit className="h-5 w-5" />
                Rename
              </DropdownItem>
              <DropdownItem onClick={handleDelete} variant="destructive">
                <Trash2 className="h-5 w-5" />
                Delete
              </DropdownItem>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="h-full">
        <ChatInterface 
          conversationId={chatId} 
          isNewSession={false}
          initialMessage={initialMessage}
        />
      </div>

      {/* Rename Modal */}
      {isEditingTitle && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{backgroundColor: 'rgba(0, 0, 0, 0.1)'}}>
          <div className="bg-white rounded-2xl p-6 w-96 max-w-md mx-4 shadow-2xl border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4" style={{fontFamily: '"MesloLGS NF", monospace', fontStyle: 'italic'}}>Rename chat</h2>
            <Input
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSave()
                } else if (e.key === 'Escape') {
                  handleRenameCancel()
                }
              }}
              className="w-full p-3 border border-gray-300 rounded-lg text-base mb-6 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{fontFamily: '"MesloLGS NF", monospace', fontStyle: 'italic'}}
              placeholder="Enter chat name"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={handleRenameCancel}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                style={{fontFamily: '"MesloLGS NF", monospace', fontStyle: 'italic'}}
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSave}
                className="px-4 py-2 bg-black text-white rounded-lg facet-hover-fade font-medium"
                style={{fontFamily: '"MesloLGS NF", monospace', fontStyle: 'italic'}}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}