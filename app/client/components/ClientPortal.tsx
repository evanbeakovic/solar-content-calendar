'use client'

import { useState, useEffect } from 'react'
import { Post, Client, Profile } from '@/lib/types'
import ClientSidebar from './ClientSidebar'
import ContentView from './ContentView'
import CalendarView from './CalendarView'

type ThemeMode = 'dark' | 'light' | 'system'

interface ClientPortalProps {
  initialPosts: Post[]
  clients: Client[]
  profile: Profile
}

export default function ClientPortal({ initialPosts, clients, profile }: ClientPortalProps) {
  const [view, setView] = useState<'content' | 'calendar'>('content')
  const [calendarKey, setCalendarKey] = useState(0)
  const [pendingContentTab, setPendingContentTab] = useState<string | null>(null)
  const [isWide, setIsWide] = useState(true)
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark')
  const [systemIsDark, setSystemIsDark] = useState(true)
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [activeClientIds, setActiveClientIds] = useState<string[]>(clients.map(c => c.id))

  // Read persisted preferences on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem('solar-client-sidebar-width')
    if (savedWidth === 'slim') setIsWide(false)

    const saved = localStorage.getItem('solar-theme') as ThemeMode | null
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      setThemeMode(saved)
    } else {
      setThemeMode('system')
    }
  }, [])

  // Track system colour scheme
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemIsDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Resolve effective theme and apply to document.documentElement for dark: CSS classes
  const resolvedTheme: 'dark' | 'light' =
    themeMode === 'system' ? (systemIsDark ? 'dark' : 'light') : themeMode

  useEffect(() => {
    if (resolvedTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [resolvedTheme])

  function toggleWidth() {
    const next = !isWide
    setIsWide(next)
    localStorage.setItem('solar-client-sidebar-width', next ? 'wide' : 'slim')
  }

  function handlePostUpdated(updatedPost: Post) {
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p))
  }

  function handleViewChange(newView: 'content' | 'calendar') {
    if (view === 'calendar' && newView === 'content') {
      setCalendarKey(k => k + 1)
    }
    setView(newView)
  }

  function handleNavigateToContent(tab: string) {
    setPendingContentTab(tab)
    handleViewChange('content')
  }

  const sidebarWidth = isWide ? 240 : 56

  return (
    <div className={`min-h-screen ${resolvedTheme === 'dark' ? 'bg-[#0a0f1a]' : 'bg-gray-50'}`}>
      <ClientSidebar
        profile={profile}
        clients={clients}
        activeClientIds={activeClientIds}
        setActiveClientIds={setActiveClientIds}
        view={view}
        setView={handleViewChange}
        isWide={isWide}
        onToggleWidth={toggleWidth}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        theme={resolvedTheme}
      />

      <main
        className="transition-[margin-left] duration-200"
        style={{ marginLeft: sidebarWidth }}
      >
        {view === 'content' ? (
          <ContentView
            posts={posts}
            clients={clients}
            activeClientIds={activeClientIds}
            theme={resolvedTheme}
            onPostUpdated={handlePostUpdated}
            pendingTab={pendingContentTab ?? undefined}
            onTabConsumed={() => setPendingContentTab(null)}
          />
        ) : (
          <CalendarView
            key={calendarKey}
            posts={posts.filter(p => activeClientIds.includes(p.client_id))}
            theme={resolvedTheme}
            onPostUpdated={handlePostUpdated}
            onNavigateToContent={handleNavigateToContent}
          />
        )}
      </main>
    </div>
  )
}
