'use client'

import { useState } from 'react'
import { Profile } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { POST_FORMATS, CUSTOM_FORMATS, FormatRule, AspectRatio } from '@/lib/postFormats'
import ApiKeySettings from './ApiKeySettings'

type ThemeMode = 'system' | 'light' | 'dark'
type Section = 'dashboard' | 'content' | 'plans' | 'users' | 'preview'

interface ManagerSidebarProps {
  profile: Profile
  isWide: boolean
  onToggleWidth: () => void
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
}

const ALL_PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn', 'Twitter', 'TikTok', 'YouTube']
const ALL_RATIOS: AspectRatio[] = ['1:1', '4:5', '9:16', '16:9', '1.91:1', 'any']

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

const emptyNewFormat = {
  format: '',
  platforms: [] as string[],
  aspectRatios: [] as AspectRatio[],
  isVideo: false,
  minWidth: 1080,
  minHeight: 1080,
}

const GreenCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"
    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

function NavItem({
  icon,
  label,
  active,
  onClick,
  slim,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick: () => void
  slim: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={slim ? label : undefined}
      className={`relative group w-full flex items-center rounded-xl transition-colors text-left ${
        slim ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
      } ${
        active
          ? 'bg-[#10375C] text-white'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
      }`}
    >
      <span className="flex-shrink-0 flex items-center justify-center w-[18px] h-[18px]">
        {icon}
      </span>
      {!slim && <span className="text-sm font-medium truncate">{label}</span>}
      {slim && (
        <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-[60] shadow-lg transition-opacity">
          {label}
        </span>
      )}
    </button>
  )
}

export default function ManagerSidebar({
  profile,
  isWide,
  onToggleWidth,
  themeMode,
  setThemeMode,
}: ManagerSidebarProps) {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeSection = (searchParams.get('section') || 'dashboard') as Section

  // Settings accordion
  const [showSettings, setShowSettings] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [showFormats, setShowFormats] = useState(false)
  const [showApiKeys, setShowApiKeys] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [customFormats, setCustomFormats] = useState<FormatRule[]>([...CUSTOM_FORMATS])
  const [newFormat, setNewFormat] = useState({ ...emptyNewFormat })
  const [addError, setAddError] = useState('')

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

  // Bug H: built-in format edit/delete state
  const [formatMenu, setFormatMenu] = useState<string | null>(null)
  const [editBuiltInKey, setEditBuiltInKey] = useState<string | null>(null)
  const [editBuiltInForm, setEditBuiltInForm] = useState<{
    format: string
    platformLabel: string
    aspectRatios: AspectRatio[]
    isVideo: boolean
    minWidth: number
    minHeight: number
  } | null>(null)
  const [builtInEdits, setBuiltInEdits] = useState<Record<string, FormatRule>>({})
  const [builtInDeleted, setBuiltInDeleted] = useState<Set<string>>(new Set())

  function navigate(section: Section) {
    router.push(`/manager?section=${section}`)
  }

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

  function handleAddFormat(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    if (!newFormat.format.trim()) { setAddError('Format name is required'); return }
    if (newFormat.platforms.length === 0) { setAddError('Select at least one platform'); return }
    if (newFormat.aspectRatios.length === 0) { setAddError('Select at least one aspect ratio'); return }
    const rule: FormatRule = {
      format: newFormat.format.trim(),
      platforms: newFormat.platforms,
      aspectRatios: newFormat.aspectRatios,
      isVideo: newFormat.isVideo,
      minWidth: newFormat.minWidth,
      minHeight: newFormat.minHeight,
    }
    CUSTOM_FORMATS.push(rule)
    setCustomFormats([...CUSTOM_FORMATS])
    setNewFormat({ ...emptyNewFormat })
    setShowAddForm(false)
  }

  function handleDeleteCustom(idx: number) {
    CUSTOM_FORMATS.splice(idx, 1)
    setCustomFormats([...CUSTOM_FORMATS])
  }

  function toggleNewPlatform(p: string) {
    setNewFormat(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p) ? prev.platforms.filter(x => x !== p) : [...prev.platforms, p],
    }))
  }

  function toggleNewRatio(r: AspectRatio) {
    setNewFormat(prev => ({
      ...prev,
      aspectRatios: prev.aspectRatios.includes(r) ? prev.aspectRatios.filter(x => x !== r) : [...prev.aspectRatios, r],
    }))
  }

  // Bug H helpers
  function getEffectiveBuiltInGroups(): Record<string, Array<{ key: string; format: string }>> {
    const groups: Record<string, Array<{ key: string; format: string }>> = {}
    for (const rule of POST_FORMATS) {
      const platform = rule.platforms[0]
      const key = `${platform}::${rule.format}`
      if (builtInDeleted.has(key)) continue
      const effective = builtInEdits[key] || rule
      for (const p of effective.platforms) {
        if (!groups[p]) groups[p] = []
        if (!groups[p].find(x => x.key === key)) {
          groups[p].push({ key, format: effective.format })
        }
      }
    }
    return groups
  }

  function openEditBuiltIn(key: string) {
    const [platform, originalFormat] = key.split('::')
    const original = POST_FORMATS.find(r => r.platforms.includes(platform) && r.format === originalFormat)
    if (!original) return
    const current = builtInEdits[key] || original
    setEditBuiltInKey(key)
    setEditBuiltInForm({
      format: current.format,
      platformLabel: platform,
      aspectRatios: [...current.aspectRatios],
      isVideo: current.isVideo,
      minWidth: current.minWidth,
      minHeight: current.minHeight,
    })
    setFormatMenu(null)
  }

  function saveEditBuiltIn() {
    if (!editBuiltInKey || !editBuiltInForm) return
    const [, originalFormat] = editBuiltInKey.split('::')
    const original = POST_FORMATS.find(r => r.format === originalFormat && r.platforms.some(p => editBuiltInKey.startsWith(p)))
    if (!original) return
    setBuiltInEdits(prev => ({
      ...prev,
      [editBuiltInKey]: {
        format: editBuiltInForm.format,
        platforms: original.platforms,
        aspectRatios: editBuiltInForm.aspectRatios,
        isVideo: editBuiltInForm.isVideo,
        minWidth: editBuiltInForm.minWidth,
        minHeight: editBuiltInForm.minHeight,
      },
    }))
    setEditBuiltInKey(null)
    setEditBuiltInForm(null)
  }

  const newPasswordOk = newPassword.length >= 6
  const passwordsMatch = newPassword.length > 0 && confirmPassword === newPassword
  const currentThemeOption = THEME_OPTIONS.find(o => o.mode === themeMode) || THEME_OPTIONS[0]
  const effectiveBuiltInGroups = getEffectiveBuiltInGroups()

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
          <span className="text-sm font-bold text-blue-900 dark:text-white tracking-tight whitespace-nowrap">Solar App</span>
        )}
      </div>

      {/* New Post primary CTA */}
      <div className={`pt-4 pb-2 flex-shrink-0 ${isWide ? 'px-3' : 'px-2'}`}>
        <button
          onClick={() => navigate('content')}
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
        <NavItem
          slim={!isWide}
          label="Dashboard"
          active={activeSection === 'dashboard'}
          onClick={() => navigate('dashboard')}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          }
        />
        <NavItem
          slim={!isWide}
          label="Content"
          active={activeSection === 'content'}
          onClick={() => navigate('content')}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
          }
        />
        <NavItem
          slim={!isWide}
          label="Plans"
          active={activeSection === 'plans'}
          onClick={() => navigate('plans')}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          }
        />
        <NavItem
          slim={!isWide}
          label="Users"
          active={activeSection === 'users'}
          onClick={() => navigate('users')}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
          }
        />
        <NavItem
          slim={!isWide}
          label="Client Preview"
          active={activeSection === 'preview'}
          onClick={() => navigate('preview')}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          }
        />
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
            {/* Theme */}
            <div>
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

            {/* Post Formats */}
            <div>
              <button
                onClick={() => setShowFormats(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9h18M9 21V9"/>
                  </svg>
                  <span>Post Formats</span>
                </div>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  className={`transition-transform ${showFormats ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {showFormats && (
                <div className="ml-2 mt-1 rounded-xl p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 space-y-2">
                  {Object.entries(effectiveBuiltInGroups).map(([platform, items]) => (
                    <div key={platform}>
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{platform}</p>
                      <div className="flex flex-wrap gap-1">
                        {items.map(({ key, format }) => (
                          <div key={key} className="relative">
                            <button
                              type="button"
                              onClick={() => setFormatMenu(formatMenu === key ? null : key)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{format}</span>
                              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="6 9 12 15 18 9"/>
                              </svg>
                            </button>
                            {formatMenu === key && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setFormatMenu(null)} />
                                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-20 min-w-[90px]">
                                  <button
                                    type="button"
                                    onClick={() => openEditBuiltIn(key)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setBuiltInDeleted(prev => new Set([...prev, key])); setFormatMenu(null) }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {editBuiltInForm && (
                    <div className="mt-2 rounded-xl p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 space-y-3">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Edit: {editBuiltInForm.platformLabel}</p>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 mb-1">Format name</p>
                        <input
                          type="text"
                          value={editBuiltInForm.format}
                          onChange={e => setEditBuiltInForm(prev => prev ? { ...prev, format: e.target.value } : null)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Aspect Ratios</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ALL_RATIOS.map(r => (
                            <label key={r} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editBuiltInForm.aspectRatios.includes(r)}
                                onChange={() => setEditBuiltInForm(prev => prev ? {
                                  ...prev,
                                  aspectRatios: prev.aspectRatios.includes(r)
                                    ? prev.aspectRatios.filter(x => x !== r)
                                    : [...prev.aspectRatios, r],
                                } : null)}
                                className="w-3.5 h-3.5 rounded accent-[#10375C]"
                              />
                              <span className="text-xs text-gray-700">{r}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 mb-1">Min width (px)</p>
                          <input type="number" value={editBuiltInForm.minWidth}
                            onChange={e => setEditBuiltInForm(prev => prev ? { ...prev, minWidth: Number(e.target.value) } : null)}
                            className={inputClass} />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 mb-1">Min height (px)</p>
                          <input type="number" value={editBuiltInForm.minHeight}
                            onChange={e => setEditBuiltInForm(prev => prev ? { ...prev, minHeight: Number(e.target.value) } : null)}
                            className={inputClass} />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editBuiltInForm.isVideo}
                          onChange={e => setEditBuiltInForm(prev => prev ? { ...prev, isVideo: e.target.checked } : null)}
                          className="w-3.5 h-3.5 rounded accent-[#10375C]"
                        />
                        <span className="text-xs text-gray-700">Video format</span>
                      </label>
                      <div className="flex gap-2">
                        <button type="button" onClick={saveEditBuiltIn}
                          className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-[#10375C] text-white hover:bg-[#0d2d4a] transition-colors">
                          Save
                        </button>
                        <button type="button" onClick={() => { setEditBuiltInKey(null); setEditBuiltInForm(null) }}
                          className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Custom formats */}
                  {customFormats.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Custom</p>
                      {customFormats.map((rule, idx) => (
                        <div key={idx} className="flex items-center justify-between px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900">
                          <div>
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{rule.format}</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">{rule.platforms.join(', ')}</p>
                          </div>
                          <button onClick={() => handleDeleteCustom(idx)}
                            className="w-5 h-5 flex items-center justify-center rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add custom format */}
                  {!showAddForm ? (
                    <button onClick={() => setShowAddForm(true)}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-[#10375C] hover:bg-[#10375C]/5 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Add format
                    </button>
                  ) : (
                    <form onSubmit={handleAddFormat} className="mt-1 rounded-xl p-3 bg-white border border-gray-200 space-y-3">
                      <p className="text-xs font-semibold text-gray-700">New custom format</p>
                      <input type="text" placeholder="Format name" value={newFormat.format}
                        onChange={e => setNewFormat(prev => ({ ...prev, format: e.target.value }))}
                        className={inputClass} />
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Platforms</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ALL_PLATFORMS.map(p => (
                            <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                              <input type="checkbox" checked={newFormat.platforms.includes(p)}
                                onChange={() => toggleNewPlatform(p)} className="w-3.5 h-3.5 rounded accent-[#10375C]" />
                              <span className="text-xs text-gray-700">{p}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Aspect Ratios</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ALL_RATIOS.map(r => (
                            <label key={r} className="flex items-center gap-1.5 cursor-pointer">
                              <input type="checkbox" checked={newFormat.aspectRatios.includes(r)}
                                onChange={() => toggleNewRatio(r)} className="w-3.5 h-3.5 rounded accent-[#10375C]" />
                              <span className="text-xs text-gray-700">{r}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 mb-1">Min width</p>
                          <input type="number" value={newFormat.minWidth}
                            onChange={e => setNewFormat(prev => ({ ...prev, minWidth: Number(e.target.value) }))}
                            className={inputClass} />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 mb-1">Min height</p>
                          <input type="number" value={newFormat.minHeight}
                            onChange={e => setNewFormat(prev => ({ ...prev, minHeight: Number(e.target.value) }))}
                            className={inputClass} />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={newFormat.isVideo}
                          onChange={e => setNewFormat(prev => ({ ...prev, isVideo: e.target.checked }))}
                          className="w-3.5 h-3.5 rounded accent-[#10375C]" />
                        <span className="text-xs text-gray-700">Video format</span>
                      </label>
                      {addError && <p className="text-xs text-red-500">{addError}</p>}
                      <div className="flex gap-2">
                        <button type="submit"
                          className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-[#10375C] text-white hover:bg-[#0d2d4a] transition-colors">
                          Add
                        </button>
                        <button type="button" onClick={() => { setShowAddForm(false); setAddError(''); setNewFormat({ ...emptyNewFormat }) }}
                          className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* API Keys */}
            <div>
              <button
                onClick={() => setShowApiKeys(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                  </svg>
                  <span>API Keys</span>
                </div>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  className={`transition-transform ${showApiKeys ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {showApiKeys && <ApiKeySettings />}
            </div>
          </div>
        )}
      </div>

      {/* Spacer pushes profile/signout to bottom */}
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
            <p className="text-xs font-semibold mb-3 text-gray-500">Change password</p>
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
