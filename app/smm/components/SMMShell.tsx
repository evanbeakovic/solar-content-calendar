'use client'

import { useState, useEffect } from 'react'
import { Profile, Client } from '@/lib/types'
import SMMSidebar from './SMMSidebar'

type ThemeMode = 'system' | 'light' | 'dark'

export default function SMMShell({
  profile,
  children,
}: {
  profile: Profile
  children: React.ReactNode
}) {
  const [isWide, setIsWide] = useState(true)
  const [themeMode, setThemeMode] = useState<ThemeMode>('system')

  useEffect(() => {
    const savedWidth = localStorage.getItem('solar-smm-sidebar-width')
    if (savedWidth === 'slim') setIsWide(false)
    const savedTheme = (localStorage.getItem('solar-smm-theme') as ThemeMode) || 'system'
    setThemeMode(savedTheme)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (themeMode === 'dark') {
      root.classList.add('dark')
    } else if (themeMode === 'light') {
      root.classList.remove('dark')
    } else {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      root.classList.toggle('dark', mq.matches)
      const handler = (e: MediaQueryListEvent) => root.classList.toggle('dark', e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [themeMode])

  function toggleWidth() {
    const next = !isWide
    setIsWide(next)
    localStorage.setItem('solar-smm-sidebar-width', next ? 'wide' : 'slim')
  }

  function handleSetThemeMode(mode: ThemeMode) {
    setThemeMode(mode)
    localStorage.setItem('solar-smm-theme', mode)
  }

  function handleNewPost() {
    window.dispatchEvent(new CustomEvent('smm:new-post'))
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0a0f1a]">
      <SMMSidebar
        profile={profile}
        isWide={isWide}
        onToggleWidth={toggleWidth}
        themeMode={themeMode}
        setThemeMode={handleSetThemeMode}
        onNewPost={handleNewPost}
      />
      <main
        className="flex-1 min-w-0 transition-[margin-left] duration-300 dark:text-gray-100"
        style={{ marginLeft: isWide ? 240 : 56 }}
      >
        {children}
      </main>
    </div>
  )
}
