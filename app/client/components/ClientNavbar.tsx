'use client'

import { useState, useRef, useEffect } from 'react'
import { Client } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface ClientNavbarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  view: 'content' | 'calendar'
  setView: (view: 'content' | 'calendar') => void
  clients: Client[]
  activeClientIds: string[]
  setActiveClientIds: (ids: string[]) => void
  theme: 'dark' | 'light'
}

export default function ClientNavbar({
  sidebarOpen,
  setSidebarOpen,
  view,
  setView,
  clients,
  activeClientIds,
  setActiveClientIds,
  theme,
}: ClientNavbarProps) {
  const supabase = createClient()
  const isDark = theme === 'dark'
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Primary client for display (first selected, or first overall)
  const primaryClient =
    clients.find(c => activeClientIds.includes(c.id)) || clients[0]

  function getLogoUrl(logoPath: string | null | undefined): string | null {
    if (!logoPath) return null
    const { data } = supabase.storage.from('post-images').getPublicUrl(logoPath)
    return data.publicUrl
  }

  const logoUrl = getLogoUrl(primaryClient?.logo_path)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const allSelected = activeClientIds.length === clients.length

  function toggleAll() {
    setActiveClientIds(allSelected ? [] : clients.map(c => c.id))
  }

  function toggleOne(id: string) {
    setActiveClientIds(
      activeClientIds.includes(id)
        ? activeClientIds.filter(x => x !== id)
        : [...activeClientIds, id]
    )
  }

  // Label shown next to the logo
  const clientLabel =
    allSelected || clients.length === 1
      ? primaryClient?.name
      : activeClientIds.length === 0
      ? 'No clients'
      : activeClientIds.length === 1
      ? (clients.find(c => c.id === activeClientIds[0])?.name ?? '1 client')
      : `${activeClientIds.length} clients`

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-5 border-b ${
        isDark
          ? 'bg-[#0d1425] border-white/[0.08]'
          : 'bg-white border-black/[0.08] shadow-sm'
      }`}
    >
      {/* Left: client identity */}
      <div ref={dropdownRef} className="relative flex items-center">
        {/* Logo + name → opens sidebar */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-l-xl transition-colors ${
            clients.length > 1 ? 'rounded-r-none pr-2' : 'rounded-xl'
          } ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={primaryClient?.name}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#8EE3E3]/20 flex items-center justify-center text-[#8EE3E3] text-xs font-bold flex-shrink-0">
              {primaryClient?.name[0]?.toUpperCase()}
            </div>
          )}
          <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {clientLabel}
          </span>
        </button>

        {/* Chevron → opens multi-client dropdown (only if 2+ clients) */}
        {clients.length > 1 && (
          <button
            onClick={() => setDropdownOpen(v => !v)}
            className={`flex items-center px-2 py-1.5 rounded-r-xl transition-colors border-l ${
              isDark
                ? 'hover:bg-white/5 border-white/10'
                : 'hover:bg-black/5 border-black/10'
            }`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''} ${
                isDark ? 'text-gray-500' : 'text-gray-400'
              }`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}

        {/* Multi-client dropdown */}
        {dropdownOpen && clients.length > 1 && (
          <div
            className={`absolute top-full mt-2 left-0 w-60 rounded-2xl shadow-2xl border z-50 p-2 ${
              isDark
                ? 'bg-[#0d1425] border-white/[0.08]'
                : 'bg-white border-black/[0.08]'
            }`}
          >
            {/* Select All */}
            <label
              className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer mb-1 border-b ${
                isDark
                  ? 'hover:bg-white/5 border-white/[0.06]'
                  : 'hover:bg-gray-50 border-black/[0.06]'
              }`}
            >
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="w-4 h-4 rounded accent-[#8EE3E3]"
              />
              <span className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                Select All
              </span>
            </label>

            {clients.map(c => {
              const cLogoUrl = getLogoUrl(c.logo_path)
              return (
                <label
                  key={c.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer ${
                    isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={activeClientIds.includes(c.id)}
                    onChange={() => toggleOne(c.id)}
                    className="w-4 h-4 rounded accent-[#8EE3E3]"
                  />
                  {cLogoUrl ? (
                    <img
                      src={cLogoUrl}
                      alt={c.name}
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#8EE3E3]/20 flex items-center justify-center text-[#8EE3E3] text-xs font-bold flex-shrink-0">
                      {c.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className={`text-sm flex-1 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    {c.name}
                  </span>
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* Right: single view toggle button */}
      <div className="ml-auto">
        <button
          onClick={() => setView(view === 'content' ? 'calendar' : 'content')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
            isDark
              ? 'bg-white/10 text-white hover:bg-white/15'
              : 'bg-gray-900 text-white hover:bg-gray-700'
          }`}
        >
          {view === 'content' ? (
            <>
              {/* Calendar icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Calendar
            </>
          ) : (
            <>
              {/* Grid icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
              My Content
            </>
          )}
        </button>
      </div>
    </nav>
  )
}
