'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface SidebarContextType {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  isInitialized: boolean
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Small delay to ensure DOM is fully rendered before enabling transitions
    setTimeout(() => setIsInitialized(true), 50)
  }, [])

  return (
    <SidebarContext.Provider value={{ sidebarOpen, setSidebarOpen, isInitialized }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}