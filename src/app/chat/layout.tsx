'use client'

import { AppSidebar } from '@/components/layout/app-sidebar'
import { SidebarProvider, useSidebar } from '@/lib/hooks/useSidebar'
import { createClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'

function ChatContent({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, isInitialized } = useSidebar()
  
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF9F5' }}>
      <AppSidebar />
      <main 
        className={`min-h-screen overflow-auto ${sidebarOpen ? 'ml-80' : 'ml-16'} ${isInitialized ? 'transition-all duration-300 ease-in-out' : ''}`}
        style={{ backgroundColor: '#FAF9F5' }}
      >
        {children}
      </main>
    </div>
  )
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        window.location.href = '/auth/signin'
        return
      }
      
      setUser(user)
      setLoading(false)
    }
    
    checkAuth()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <SidebarProvider>
      <ChatContent>
        {children}
      </ChatContent>
    </SidebarProvider>
  )
}