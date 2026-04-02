'use client'

import { useState } from 'react'
import { Profile } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type ThemeMode = 'system' | 'light' | 'dark'

interface SMMSidebarProps {
  profile: Profile
  isWide: boolean
  onToggleWidth: () => void
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  onNewPost: () => void
}

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
  {
    mode: 'system',
    label: 'System',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
  {
    mode: 'light',
    label: 'Light',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="5"/>
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>
    ),
  },
  {
    mode: 'dark',
    label: 'Dark',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
      </svg>
    ),
  },
]

const GreenCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"
    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

export default function SMMSidebar({
  profile,
  isWide,
  onToggleWidth,
  themeMode,
  setThemeMode,
  onNewPost,
}: SMMSidebarProps) {
  const supabase = createClient()
  const router = useRouter()

  // Settings accordion
  const [showSettings, setShowSettings] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)

  // Profile accordion
  const [showProfile, setShowProfile] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [currentPwError, setCurrentPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [currentPasswordSaved, setCurrentPasswordSaved] = useState(false)

  function handleSettingsClick() {
    if (!isWide) {
      onToggleWidth()
      setShowSettings(true)
    } else {
      setShowSettings(v => !v)
    }
  }

  function handleProfileClick() {
    if (!isWide) {
      onToggleWidth()
      setShowProfile(true)
    } else {
      setShowProfile(v => !v)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    setCurrentPwError('')
    setPwSuccess(false)
    setPwLoading(true)
    const res = await fetch('/api/auth/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    })
    const data = await res.json()
    if (res.ok) {
      setPwSuccess(true)
      setCurrentPasswordSaved(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } else if (data.error === 'Current password is incorrect') {
      setCurrentPwError('Incorrect password. Please try again.')
      setCurrentPassword('')
      setCurrentPasswordSaved(false)
    } else {
      setPwError(data.error || 'Failed to update password')
    }
    setPwLoading(false)
  }

  function handleSetThemeMode(mode: ThemeMode) {
    setThemeMode(mode)
    setShowThemeMenu(false)
  }

  const newPasswordOk = newPassword.length >= 6
  const passwordsMatch = newPassword.length > 0 && confirmPassword === newPassword
  const currentThemeOption = THEME_OPTIONS.find(o => o.mode === themeMode) || THEME_OPTIONS[0]

  const inputClass = 'w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#10375C]/30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500'

  return (
    <div
      className="fixed top-0 left-0 h-full z-50 flex flex-col bg-white dark:bg-[#0d1425] border-r border-gray-200 dark:border-white/[0.08] shadow-sm overflow-y-auto overflow-x-hidden transition-[width] duration-300"
      style={{ width: isWide ? 240 : 56 }}
    >
      {/* Toggle + Wordmark */}
      <div className={`flex items-center border-b border-gray-200 dark:border-gray-700 flex-shrink-0 ${isWide ? 'px-4 py-4 gap-3' : 'px-0 py-4 justify-center'}`}>
        <button
          onClick={onToggleWidth}
          title="Toggle sidebar"
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        {isWide && (
          <span className="text-sm font-bold text-[#10375C] tracking-tight whitespace-nowrap">Solar App</span>
        )}
      </div>

      {/* New Post primary CTA */}
      <div className={`pt-4 pb-2 flex-shrink-0 ${isWide ? 'px-3' : 'px-2'}`}>
        <button
          onClick={onNewPost}
          title={!isWide ? 'New Post' : undefined}
          className={`w-full flex items-center rounded-xl bg-[#10375C] text-white font-semibold hover:bg-[#0d2d4a] transition-all shadow-md shadow-[#10375C]/20 ${
            isWide ? 'gap-2.5 px-3 py-2.5 text-sm' : 'justify-center px-0 py-2.5'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-shrink-0">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {isWide && 'New Post'}
        </button>
      </div>

      {/* Main navigation */}
      <nav className="px-2 py-2 space-y-0.5 flex-shrink-0">
        {/* Content — single primary section */}
        <button
          title={!isWide ? 'Content' : undefined}
          className={`relative group w-full flex items-center rounded-xl transition-colors bg-[#10375C] text-white ${
            isWide ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-2.5'
          }`}
        >
          <span className="flex-shrink-0 flex items-center justify-center w-[18px] h-[18px]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
          </span>
          {isWide && <span className="text-sm font-medium">Content</span>}
          {!isWide && (
            <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-[60] shadow-lg transition-opacity">
              Content
            </span>
          )}
        </button>
      </nav>

      {isWide && <div className="mx-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0" />}

      {/* Settings */}
      <div className="px-2 py-2 flex-shrink-0">
        <button
          onClick={handleSettingsClick}
          title={!isWide ? 'Settings' : undefined}
          className={`relative group w-full flex items-center rounded-xl transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 ${
            isWide ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-2.5'
          }`}
        >
          <span className="flex-shrink-0 flex items-center justify-center w-[18px] h-[18px]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
              <path d="M12 2v2M12 20v2M2 12H4M20 12h2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          </span>
          {isWide && (
            <>
              <span className="flex-1 text-sm font-medium text-left">Settings</span>
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                className={`transition-transform ${showSettings ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </>
          )}
          {!isWide && (
            <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-[60] shadow-lg transition-opacity">
              Settings
            </span>
          )}
        </button>

        {isWide && showSettings && (
          <div className="ml-2 mt-1 space-y-0.5">
            <button
              onClick={() => setShowThemeMenu(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {currentThemeOption.icon}
                <span>Theme</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400 dark:text-gray-500">{currentThemeOption.label}</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  className={`transition-transform ${showThemeMenu ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </button>
            {showThemeMenu && (
              <div className="ml-2 mt-0.5 rounded-xl overflow-hidden border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                {THEME_OPTIONS.map(opt => (
                  <button key={opt.mode} onClick={() => handleSetThemeMode(opt.mode)}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <div className="flex items-center gap-2.5">{opt.icon}{opt.label}</div>
                    {themeMode === opt.mode && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom: Profile + Sign Out */}
      <div className="px-2 pb-4 flex-shrink-0 border-t border-gray-200 dark:border-gray-700 pt-2 space-y-0.5">
        {/* Profile */}
        <button
          onClick={handleProfileClick}
          title={!isWide ? 'Profile' : undefined}
          className={`relative group w-full flex items-center rounded-xl transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 ${
            isWide ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-2.5'
          }`}
        >
          <span className="flex-shrink-0 flex items-center justify-center w-[18px] h-[18px]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </span>
          {isWide && (
            <>
              <span className="flex-1 text-sm font-medium text-left truncate">
                {profile.full_name || profile.email}
              </span>
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                className={`transition-transform flex-shrink-0 ${showProfile ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </>
          )}
          {!isWide && (
            <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-[60] shadow-lg transition-opacity">
              Profile
            </span>
          )}
        </button>

        {isWide && showProfile && (
          <div className="mx-1 mt-1 mb-2 rounded-xl p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
            <p className="text-xs font-semibold mb-3 text-gray-500 dark:text-gray-400">Change password</p>
            <form onSubmit={handlePasswordChange} className="space-y-2.5">
              <div className="relative">
                <input type="password" placeholder="Current password" value={currentPassword}
                  onChange={e => { setCurrentPassword(e.target.value); setCurrentPasswordSaved(false); setCurrentPwError('') }}
                  className={inputClass} />
                {currentPasswordSaved && <GreenCheck />}
              </div>
              {currentPwError && <p className="text-xs text-red-500">{currentPwError}</p>}
              <div className="relative">
                <input type="password" placeholder="New password" value={newPassword}
                  onChange={e => setNewPassword(e.target.value)} className={inputClass} />
                {newPasswordOk && <GreenCheck />}
              </div>
              <div className="relative">
                <input type="password" placeholder="Confirm new password" value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} className={inputClass} />
                {passwordsMatch && <GreenCheck />}
              </div>
              {pwError && <p className="text-xs text-red-500">{pwError}</p>}
              {pwSuccess && <p className="text-xs text-green-500">Password updated!</p>}
              <button type="submit" disabled={pwLoading || !newPassword || !confirmPassword}
                className="w-full py-2 rounded-lg text-xs font-semibold bg-[#10375C]/5 border border-[#10375C]/15 text-[#10375C] hover:bg-[#10375C]/10 transition-colors disabled:opacity-50">
                {pwLoading ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          </div>
        )}

        {/* Sign Out */}
        <button
          onClick={handleLogout}
          title={!isWide ? 'Sign out' : undefined}
          className={`relative group w-full flex items-center rounded-xl transition-colors text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-300 ${
            isWide ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-2.5'
          }`}
        >
          <span className="flex-shrink-0 flex items-center justify-center w-[18px] h-[18px]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </span>
          {isWide && <span className="text-sm font-medium">Sign out</span>}
          {!isWide && (
            <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-[60] shadow-lg transition-opacity">
              Sign out
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
