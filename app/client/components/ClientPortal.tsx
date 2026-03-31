'use client'

import { useState, useEffect } from 'react'
import { Post, Client, Profile } from '@/lib/types'
import ClientNavbar from './ClientNavbar'
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark')
  const [systemIsDark, setSystemIsDark] = useState(true)
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [activeClientIds, setActiveClientIds] = useState<string[]>(clients.map(c => c.id))

  // Initialise theme from localStorage (client side only)
  useEffect(() => {
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

  // Resolve effective theme
  const resolvedTheme: 'dark' | 'light' =
    themeMode === 'system' ? (systemIsDark ? 'dark' : 'light') : themeMode

  function handlePostUpdated(updatedPost: Post) {
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p))
  }

  // Increment calendarKey when leaving calendar → content, causing CalendarView to remount fresh
  function handleViewChange(newView: 'content' | 'calendar') {
    if (view === 'calendar' && newView === 'content') {
      setCalendarKey(k => k + 1)
    }
    setView(newView)
  }

  return (
    <div className={`min-h-screen ${resolvedTheme === 'dark' ? 'bg-[#0a0f1a]' : 'bg-gray-50'}`}>
      <ClientNavbar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        view={view}
        setView={handleViewChange}
        clients={clients}
        activeClientIds={activeClientIds}
        setActiveClientIds={setActiveClientIds}
        theme={resolvedTheme}
      />

      <ClientSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        theme={resolvedTheme}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        profile={profile}
      />

      <main className="pt-14">
        {view === 'content' ? (
          <ContentView
            posts={posts}
            clients={clients}
            activeClientIds={activeClientIds}
            theme={resolvedTheme}
            onPostUpdated={handlePostUpdated}
          />
        ) : (
          <CalendarView
            key={calendarKey}
            posts={posts.filter(p => activeClientIds.includes(p.client_id))}
            theme={resolvedTheme}
            onPostUpdated={handlePostUpdated}
          />
        )}
      </main>
    </div>
  )
}
