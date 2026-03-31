'use client'

import { useState, useEffect } from 'react'
import { Profile } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type ThemeMode = 'dark' | 'light' | 'system'

interface ClientSidebarProps {
  open: boolean
  onClose: () => void
  theme: 'dark' | 'light'
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  profile: Profile
}

export default function ClientSidebar({ open, onClose, theme, themeMode, setThemeMode, profile }: ClientSidebarProps) {
  const supabase = createClient()
  const router = useRouter()
  const isDark = theme === 'dark'

  const [showProfile, setShowProfile] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [currentPwError, setCurrentPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [currentPasswordSaved, setCurrentPasswordSaved] = useState(false)

  // Auto-close profile section when sidebar closes
  useEffect(() => {
    if (!open) {
      setShowProfile(false)
      setShowThemeMenu(false)
    }
  }, [open])

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
    localStorage.setItem('solar-theme', mode)
    setShowThemeMenu(false)
  }

  // Password validation states
  const newPasswordOk = newPassword.length >= 6
  const passwordsMatch = newPassword.length > 0 && confirmPassword === newPassword

  const inputClass = `w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#8EE3E3]/40 ${
    isDark
      ? 'bg-white/5 border border-white/10 text-white placeholder-gray-600'
      : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400'
  }`

  const divider = <div className={`mx-5 my-1 border-t ${isDark ? 'border-white/[0.08]' : 'border-black/[0.06]'}`} />

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

  const currentThemeOption = THEME_OPTIONS.find(o => o.mode === themeMode) || THEME_OPTIONS[0]

  const GreenCheck = () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#22c55e"
      strokeWidth="2.5"
      className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
    >
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={`fixed top-0 left-0 h-full z-50 flex flex-col overflow-y-auto transition-transform duration-300 border-r ${
          open ? 'translate-x-0' : '-translate-x-full'
        } ${
          isDark
            ? 'bg-[#0d1425] border-white/[0.08]'
            : 'bg-white border-black/[0.08] shadow-xl'
        }`}
        style={{ width: 280 }}
      >
        {/* Header */}
        <div className={`px-5 py-5 border-b ${isDark ? 'border-white/[0.08]' : 'border-black/[0.06]'}`}>
          <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Content Portal
          </p>
          <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {profile.full_name || profile.email}
          </p>
        </div>

        {/* ACCOUNT section */}
        <div className="px-4 pt-5 pb-3">
          <p className={`text-xs font-semibold uppercase tracking-widest px-1 mb-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            Account
          </p>
          <button
            onClick={() => setShowProfile(v => !v)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isDark
                ? 'text-gray-300 hover:bg-white/5 hover:text-white'
                : 'text-gray-700 hover:bg-black/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              My profile
            </div>
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              className={`transition-transform ${showProfile ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {showProfile && (
            <div className={`mx-1 mt-1 mb-2 rounded-xl p-4 ${
              isDark ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-black/[0.02] border border-black/[0.06]'
            }`}>
              <p className={`text-xs font-semibold mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Change password</p>
              <form onSubmit={handlePasswordChange} className="space-y-2.5">
                {/* Current password — checkmark only after successful save */}
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={e => { setCurrentPassword(e.target.value); setCurrentPasswordSaved(false); setCurrentPwError('') }}
                    className={inputClass}
                  />
                  {currentPasswordSaved && <GreenCheck />}
                </div>
                {currentPwError && <p className="text-xs text-red-400">{currentPwError}</p>}

                {/* New password — checkmark when 6+ characters (Supabase minimum) */}
                <div className="relative">
                  <input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className={inputClass}
                  />
                  {newPasswordOk && <GreenCheck />}
                </div>

                {/* Confirm password with checkmark when matching */}
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className={inputClass}
                  />
                  {passwordsMatch && <GreenCheck />}
                </div>

                {pwError && <p className="text-xs text-red-400">{pwError}</p>}
                {pwSuccess && <p className="text-xs text-green-400">Password updated!</p>}
                <button
                  type="submit"
                  disabled={pwLoading || !newPassword || !confirmPassword}
                  className="w-full py-2 rounded-lg text-xs font-semibold bg-[#8EE3E3]/10 border border-[#8EE3E3]/20 text-[#8EE3E3] hover:bg-[#8EE3E3]/15 transition-colors disabled:opacity-50"
                >
                  {pwLoading ? 'Saving...' : 'Save changes'}
                </button>
              </form>
            </div>
          )}
        </div>

        {divider}

        {/* PREFERENCES section */}
        <div className="px-4 pt-4 pb-3">
          <p className={`text-xs font-semibold uppercase tracking-widest px-1 mb-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            Preferences
          </p>

          {/* Theme button */}
          <div className="relative">
            <button
              onClick={() => setShowThemeMenu(v => !v)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isDark
                  ? 'text-gray-300 hover:bg-white/5 hover:text-white'
                  : 'text-gray-700 hover:bg-black/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {currentThemeOption.icon}
                Theme
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {currentThemeOption.label}
                </span>
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  className={`transition-transform ${showThemeMenu ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </button>

            {showThemeMenu && (
              <div className={`mt-1 mx-1 rounded-xl overflow-hidden border ${
                isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'
              }`}>
                {THEME_OPTIONS.map(opt => (
                  <button
                    key={opt.mode}
                    onClick={() => handleSetThemeMode(opt.mode)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                      isDark
                        ? 'text-gray-300 hover:bg-white/5'
                        : 'text-gray-700 hover:bg-black/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {opt.icon}
                      {opt.label}
                    </div>
                    {themeMode === opt.mode && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {divider}

        {/* Sign out */}
        <div className="px-4 pt-4 mt-auto pb-8">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Sign out
          </button>
        </div>
      </div>
    </>
  )
}
