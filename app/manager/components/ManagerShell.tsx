'use client'

import { useState, useEffect } from 'react'
import { Profile } from '@/lib/types'
import ManagerSidebar from './ManagerSidebar'

type ThemeMode = 'system' | 'light' | 'dark'

export default function ManagerShell({
  profile,
  children,
}: {
  profile: Profile
  children: React.ReactNode
}) {
  const [isWide, setIsWide] = useState(true)
  const [themeMode, setThemeMode] = useState<ThemeMode>('system')

  useEffect(() => {
    const savedWidth = localStorage.getItem('solar-manager-sidebar-width')
    if (savedWidth === 'slim') setIsWide(false)
    const savedTheme = (localStorage.getItem('solar-manager-theme') as ThemeMode) || 'system'
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
    localStorage.setItem('solar-manager-sidebar-width', next ? 'wide' : 'slim')
  }

  function handleSetThemeMode(mode: ThemeMode) {
    setThemeMode(mode)
    localStorage.setItem('solar-manager-theme', mode)
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0a0f1a]">
      <ManagerSidebar
        profile={profile}
        isWide={isWide}
        onToggleWidth={toggleWidth}
        themeMode={themeMode}
        setThemeMode={handleSetThemeMode}
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
