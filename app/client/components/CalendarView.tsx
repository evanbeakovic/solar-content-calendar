'use client'

import { useState, useMemo, useRef } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, addDays, eachDayOfInterval,
  isToday, isSameMonth, isSameDay, parseISO, isWithinInterval,
} from 'date-fns'

import { Post } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface CalendarViewProps {
  posts: Post[]
  theme: 'dark' | 'light'
  onPostUpdated: (post: Post) => void
}

type ViewMode = 'month' | 'week'

const STATUS_PILL: Record<string, { bg: string; text: string; dot: string }> = {
  'Uploaded':          { bg: 'bg-slate-500/15',  text: 'text-slate-300',  dot: 'bg-slate-400' },
  'To Be Confirmed':   { bg: 'bg-amber-500/15',  text: 'text-amber-300',  dot: 'bg-amber-400' },
  'Being Created':     { bg: 'bg-amber-500/15',  text: 'text-amber-300',  dot: 'bg-amber-400' },
  'Requested Changes': { bg: 'bg-orange-500/15', text: 'text-orange-300', dot: 'bg-orange-400' },
  'Confirmed':         { bg: 'bg-green-500/15',  text: 'text-green-300',  dot: 'bg-green-400' },
  'Scheduled':         { bg: 'bg-purple-500/15', text: 'text-purple-300', dot: 'bg-purple-400' },
  'Posted':            { bg: 'bg-blue-500/15',   text: 'text-blue-300',   dot: 'bg-blue-400' },
}
const STATUS_PILL_LIGHT: Record<string, { bg: string; text: string; dot: string }> = {
  'Uploaded':          { bg: 'bg-slate-100',  text: 'text-slate-700',  dot: 'bg-slate-400' },
  'To Be Confirmed':   { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  'Being Created':     { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  'Requested Changes': { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-400' },
  'Confirmed':         { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
  'Scheduled':         { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  'Posted':            { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const CLIENT_VISIBLE_STATUSES = ['To Be Confirmed', 'Requested Changes', 'Confirmed', 'Scheduled', 'Posted']

function getPostsForDay(posts: Post[], day: Date) {
  return posts.filter(p => {
    if (!p.scheduled_date) return false
    if (!CLIENT_VISIBLE_STATUSES.includes(p.status)) return false
    return isSameDay(parseISO(p.scheduled_date), day)
  })
}

export default function CalendarView({ posts, theme, onPostUpdated }: CalendarViewProps) {
  const supabase = createClient()
  const isDark = theme === 'dark'

  const now = useMemo(() => new Date(), [])
  const [currentDate, setCurrentDate] = useState(now)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  // Remembers the month-view date when the user switches to week view
  const lastMonthView = useRef<Date | null>(null)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [showInlineRequest, setShowInlineRequest] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Request Changes modal state
  const [requestModal, setRequestModal] = useState<{ post: Post } | null>(null)
  const [requestNote, setRequestNote] = useState('')
  const [requestFiles, setRequestFiles] = useState<File[]>([])
  const [requestFilePreviews, setRequestFilePreviews] = useState<string[]>([])
  const [requestNoteError, setRequestNoteError] = useState('')
  const [submittingRequest, setSubmittingRequest] = useState(false)

  // ── Navigation ────────────────────────────────────────────────

  // Returns the Monday starting the correct week for a given month:
  // - If that month is the current month+year: the week containing today
  // - Otherwise: the week containing the 1st of that month
  function getWeekStartForMonth(monthDate: Date): Date {
    const sameMonth =
      monthDate.getFullYear() === now.getFullYear() &&
      monthDate.getMonth() === now.getMonth()
    const target = sameMonth ? now : startOfMonth(monthDate)
    return startOfWeek(target, { weekStartsOn: 1 })
  }

  function prevPeriod() {
    if (viewMode === 'month') setCurrentDate(d => subMonths(d, 1))
    else setCurrentDate(d => addDays(d, -7))
  }
  function nextPeriod() {
    if (viewMode === 'month') setCurrentDate(d => addMonths(d, 1))
    else setCurrentDate(d => addDays(d, 7))
  }
  function goToToday() { setCurrentDate(now) }

  // When switching to week view, save the current month date and jump to the correct week.
  // When switching back to month view, restore the saved month date.
  function handleSetViewMode(mode: ViewMode) {
    if (mode === 'week' && viewMode !== 'week') {
      lastMonthView.current = currentDate
      setCurrentDate(getWeekStartForMonth(currentDate))
    } else if (mode === 'month' && viewMode !== 'month') {
      if (lastMonthView.current) {
        setCurrentDate(lastMonthView.current)
      }
    }
    setViewMode(mode)
  }

  function navigateToWeekForDay(day: Date) {
    lastMonthView.current = currentDate
    setCurrentDate(startOfWeek(day, { weekStartsOn: 1 }))
    setViewMode('week')
  }

  // ── Calendar day arrays ───────────────────────────────────────
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    const end = endOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  // ── Stats ─────────────────────────────────────────────────────
  const startCurMonth = startOfMonth(now)
  const endCurMonth = endOfMonth(now)
  const startLastMonth = startOfMonth(subMonths(now, 1))
  const endLastMonth = endOfMonth(subMonths(now, 1))

  const thisMonthPosts = posts.filter(p =>
    p.scheduled_date && isWithinInterval(parseISO(p.scheduled_date), { start: startCurMonth, end: endCurMonth })
  )
  const awaitingCount = posts.filter(p =>
    p.status === 'To Be Confirmed'
  ).length
  const approvedThisMonth = thisMonthPosts.filter(p => p.status === 'Confirmed').length
  const approvalRate = thisMonthPosts.length > 0
    ? Math.round((approvedThisMonth / thisMonthPosts.length) * 100)
    : 0
  const publishedAllTime = posts.filter(p => p.status === 'Posted').length
  const publishedLastMonth = posts.filter(p =>
    p.status === 'Posted' &&
    p.scheduled_date &&
    isWithinInterval(parseISO(p.scheduled_date), { start: startLastMonth, end: endLastMonth })
  ).length
  const publishedThisMonth = posts.filter(p =>
    p.status === 'Posted' &&
    p.scheduled_date &&
    isWithinInterval(parseISO(p.scheduled_date), { start: startCurMonth, end: endCurMonth })
  ).length
  const pubDiff = publishedThisMonth - publishedLastMonth

  // ── Detail panel helpers ──────────────────────────────────────
  function getImageUrl(path: string | null) {
    if (!path) return null
    const { data } = supabase.storage.from('post-images').getPublicUrl(path)
    return data.publicUrl
  }

  function getChangeRequestImageUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    return `https://lnxrnvypvyxykofgiael.supabase.co/storage/v1/object/public/post-images/${cleanPath}`
  }

  async function downloadImage(url: string, filename: string) {
    const res = await fetch(`/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function openPost(post: Post) {
    setSelectedPost(post)
    setCarouselIndex(0)
    setShowInlineRequest(false)
    setRequestNote('')
    setRequestFiles([])
    setRequestFilePreviews([])
    setRequestNoteError('')
  }

  const panelImages = selectedPost
    ? (selectedPost.images && selectedPost.images.length > 0
        ? [...selectedPost.images].sort((a, b) => a.position - b.position)
        : selectedPost.image_path
          ? [{ id: 'single', path: selectedPost.image_path, post_id: selectedPost.id, position: 0, created_at: '' }]
          : [])
    : []
  const currentImageUrl = panelImages[carouselIndex] ? getImageUrl(panelImages[carouselIndex].path) : null
  const isSelectedAwaiting = selectedPost && selectedPost.status === 'To Be Confirmed'

  async function handlePanelApprove() {
    if (!selectedPost) return
    setApprovingId(selectedPost.id)
    const res = await fetch(`/api/posts/${selectedPost.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Confirmed' }),
    })
    if (res.ok) {
      const updated = await res.json()
      const merged: Post = { ...updated, images: selectedPost.images || [], client: selectedPost.client }
      onPostUpdated(merged)
      setSelectedPost(merged)
    }
    setApprovingId(null)
  }

  async function handleInlineSubmit() {
    if (!selectedPost) return
    if (!requestNote.trim()) {
      setRequestNoteError("Please describe the changes you'd like before submitting")
      return
    }
    setRequestNoteError('')
    setSubmittingRequest(true)
    try {
      const formData = new FormData()
      formData.append('note', requestNote.trim())
      for (const file of requestFiles) {
        formData.append('images', file)
      }
      const res = await fetch(`/api/posts/${selectedPost.id}/request-changes`, {
        method: 'PATCH',
        body: formData,
      })
      if (res.ok) {
        const updated: Post = await res.json()
        const merged: Post = { ...updated, images: selectedPost.images || [], client: selectedPost.client }
        onPostUpdated(merged)
        setSelectedPost(merged)
        setShowInlineRequest(false)
        setRequestNote('')
        setRequestFiles([])
        setRequestFilePreviews([])
        setRequestNoteError('')
      }
    } finally {
      setSubmittingRequest(false)
    }
  }

  function openRequestModal(post: Post) {
    setRequestModal({ post })
    setRequestNote('')
    setRequestFiles([])
    setRequestFilePreviews([])
    setRequestNoteError('')
  }

  function closeRequestModal() {
    setRequestModal(null)
    setRequestNote('')
    setRequestFiles([])
    setRequestFilePreviews([])
    setRequestNoteError('')
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setRequestFiles(prev => [...prev, ...files])
    files.forEach(f => {
      const reader = new FileReader()
      reader.onload = ev => {
        setRequestFilePreviews(prev => [...prev, ev.target?.result as string])
      }
      reader.readAsDataURL(f)
    })
  }

  function removeFile(i: number) {
    setRequestFiles(prev => prev.filter((_, idx) => idx !== i))
    setRequestFilePreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmitRequest() {
    if (!requestModal) return
    if (!requestNote.trim()) {
      setRequestNoteError("Please describe the changes you'd like before submitting")
      return
    }
    setRequestNoteError('')
    setSubmittingRequest(true)
    try {
      const { post } = requestModal
      const formData = new FormData()
      formData.append('note', requestNote.trim())
      for (const file of requestFiles) {
        formData.append('images', file)
      }
      const res = await fetch(`/api/posts/${post.id}/request-changes`, {
        method: 'PATCH',
        body: formData,
      })
      if (res.ok) {
        const updated: Post = await res.json()
        onPostUpdated(updated)
        setSelectedPost(null)
        closeRequestModal()
      }
    } finally {
      setSubmittingRequest(false)
    }
  }

  // ── Shared styles ─────────────────────────────────────────────
  const cardBg = isDark ? 'bg-[#0d1a2d]' : 'bg-white'
  const cardBorder = isDark ? 'border border-white/[0.07]' : 'border border-black/[0.07] shadow-sm'
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-400'
  const textPrimary = isDark ? 'text-white' : 'text-gray-900'

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">

      {/* ── Stats row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* This month */}
        <div className={`rounded-2xl p-5 ${cardBg} ${cardBorder}`}>
          <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${textMuted}`}>This month</p>
          <p className={`text-3xl font-bold ${textPrimary}`}>{thisMonthPosts.length}</p>
          <p className={`text-xs mt-1 ${textMuted}`}>posts scheduled</p>
        </div>

        {/* Awaiting review */}
        <div className={`rounded-2xl p-5 ${cardBg} ${cardBorder}`}>
          <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${textMuted}`}>Awaiting review</p>
          <p className="text-3xl font-bold text-amber-400">{awaitingCount}</p>
          <p className={`text-xs mt-1 ${textMuted}`}>need your approval</p>
        </div>

        {/* Approved this month */}
        <div className={`rounded-2xl p-5 ${cardBg} ${cardBorder}`}>
          <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${textMuted}`}>Approved this month</p>
          <p className="text-3xl font-bold text-green-400">{approvedThisMonth}</p>
          <p className={`text-xs mt-1 ${textMuted}`}>{approvalRate}% approval rate</p>
        </div>

        {/* Published all time */}
        <div className={`rounded-2xl p-5 ${cardBg} ${cardBorder}`}>
          <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${textMuted}`}>Published all time</p>
          <p className={`text-3xl font-bold ${textPrimary}`}>{publishedAllTime}</p>
          <p className={`text-xs mt-1 ${textMuted}`}>
            {pubDiff > 0 ? `+${pubDiff}` : pubDiff < 0 ? `${pubDiff}` : '±0'} vs last month
          </p>
        </div>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={prevPeriod}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              isDark ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span className={`text-base font-semibold min-w-[160px] text-center ${textPrimary}`}>
            {viewMode === 'month'
              ? format(currentDate, 'MMMM yyyy')
              : `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
            }
          </span>
          <button
            onClick={nextPeriod}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              isDark ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <button
            onClick={goToToday}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isDark ? 'text-gray-400 border border-white/10 hover:bg-white/5 hover:text-white' : 'text-gray-600 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            Today
          </button>
        </div>

        <div className={`flex items-center p-1 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
          {(['month', 'week'] as const).map(m => (
            <button
              key={m}
              onClick={() => handleSetViewMode(m)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all capitalize ${
                viewMode === m
                  ? isDark ? 'bg-white/10 text-white' : 'bg-white text-gray-900 shadow-sm'
                  : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ── Calendar grid ─────────────────────────────────────── */}
      <div className={`rounded-2xl overflow-hidden ${cardBg} ${cardBorder}`}>
        {/* Day headers */}
        <div className={`grid grid-cols-7 border-b ${isDark ? 'border-white/[0.07]' : 'border-black/[0.07]'}`}>
          {DAYS_OF_WEEK.map(d => (
            <div
              key={d}
              className={`text-center py-3 text-xs font-semibold uppercase tracking-widest ${textMuted}`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Month view */}
        {viewMode === 'month' && (
          <div className="grid grid-cols-7">
            {monthDays.map((day, idx) => {
              const dayPosts = getPostsForDay(posts, day)
              const inMonth = isSameMonth(day, currentDate)
              const todayHighlight = isToday(day)
              const isLast = idx === monthDays.length - 1

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => navigateToWeekForDay(day)}
                  className={`min-h-[100px] p-2 border-r border-b cursor-pointer ${
                    isDark ? 'border-white/[0.05]' : 'border-black/[0.05]'
                  } ${(idx + 1) % 7 === 0 ? (isDark ? '!border-r-0' : '!border-r-0') : ''} ${
                    isLast ? '!border-b-0' : ''
                  } ${todayHighlight ? isDark ? 'bg-white/[0.03]' : 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-center justify-center mb-1.5 w-fit">
                    <span
                      className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                        todayHighlight
                          ? 'bg-blue-500 text-white'
                          : inMonth
                            ? isDark ? 'text-gray-300' : 'text-gray-700'
                            : isDark ? 'text-gray-700' : 'text-gray-300'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {dayPosts.slice(0, 3).map(post => {
                      const s = isDark ? STATUS_PILL[post.status] : STATUS_PILL_LIGHT[post.status]
                      return (
                        <button
                          key={post.id}
                          onClick={e => { e.stopPropagation(); openPost(post) }}
                          className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate transition-opacity hover:opacity-80 ${s?.bg} ${s?.text}`}
                        >
                          {post.format ? `${post.format} · ` : ''}{post.headline || '(no headline)'}
                        </button>
                      )
                    })}
                    {dayPosts.length > 3 && (
                      <button
                        onClick={e => { e.stopPropagation(); navigateToWeekForDay(day) }}
                        className={`text-[10px] px-1 text-left w-full hover:underline ${textMuted}`}
                      >
                        +{dayPosts.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Week view */}
        {viewMode === 'week' && (
          <div className="grid grid-cols-7">
            {weekDays.map(day => {
              const dayPosts = getPostsForDay(posts, day)
              const todayHighlight = isToday(day)

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[200px] p-2 border-r last:border-r-0 ${
                    isDark ? 'border-white/[0.05]' : 'border-black/[0.05]'
                  } ${todayHighlight ? isDark ? 'bg-white/[0.03]' : 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-center justify-center mb-2 w-fit">
                    <span
                      className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                        todayHighlight
                          ? 'bg-blue-500 text-white'
                          : isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayPosts.map(post => {
                      const s = isDark ? STATUS_PILL[post.status] : STATUS_PILL_LIGHT[post.status]
                      return (
                        <button
                          key={post.id}
                          onClick={() => openPost(post)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-medium transition-opacity hover:opacity-80 ${s?.bg} ${s?.text}`}
                        >
                          <div className="flex items-center gap-1 mb-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s?.dot}`} />
                            {post.format && <span className="opacity-70">{post.format}</span>}
                          </div>
                          <div className="truncate">{post.headline || '(no headline)'}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Legend ────────────────────────────────────────────── */}
      <div className={`flex items-center gap-4 mt-4 flex-wrap text-xs ${textMuted}`}>
        {[
          { label: 'Awaiting review', color: 'bg-amber-400' },
          { label: 'Changes Requested', color: 'bg-orange-400' },
          { label: 'Approved', color: 'bg-green-400' },
          { label: 'Scheduled', color: 'bg-purple-400' },
          { label: 'Published', color: 'bg-blue-400' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${item.color}`} />
            {item.label}
          </div>
        ))}
      </div>

      {/* ── Request Changes Modal ─────────────────────────────── */}
      {requestModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={closeRequestModal}
        >
          <div
            className={`relative w-full max-w-lg rounded-2xl p-6 ${
              isDark ? 'bg-[#0d1425] border border-white/[0.08]' : 'bg-white shadow-2xl'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={closeRequestModal}
              className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isDark ? 'bg-white/10 text-gray-300 hover:bg-white/20' : 'bg-black/10 text-gray-700 hover:bg-black/15'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <h2 className={`text-lg font-bold mb-5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Request Changes
            </h2>
            <div className="mb-4">
              <label className={`text-xs font-semibold uppercase tracking-widest block mb-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Describe the changes you&apos;d like
              </label>
              <textarea
                value={requestNote}
                onChange={e => { setRequestNote(e.target.value); setRequestNoteError('') }}
                placeholder="Describe the changes you'd like..."
                rows={4}
                className={`w-full text-sm px-3 py-2.5 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-[#8EE3E3]/30 ${
                  isDark
                    ? 'bg-white/5 border border-white/10 text-white placeholder-gray-600'
                    : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                } ${requestNoteError ? 'border-red-400' : ''}`}
              />
              {requestNoteError && <p className="text-xs text-red-400 mt-1">{requestNoteError}</p>}
            </div>
            <div className="mb-6">
              <label className={`text-xs font-semibold uppercase tracking-widest block mb-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Attach images (optional)
              </label>
              <label
                className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                  isDark
                    ? 'border-white/10 hover:border-white/20 text-gray-500 hover:text-gray-400'
                    : 'border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-500'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
                <span className="text-xs font-medium">Click to upload images</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
              </label>
              {requestFilePreviews.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-3">
                  {requestFilePreviews.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} alt={`Preview ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-white/10" />
                      <button
                        onClick={() => removeFile(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold hover:bg-red-600"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={closeRequestModal}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isDark
                    ? 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
                    : 'bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200'
                }`}
              >Cancel</button>
              <button
                onClick={handleSubmitRequest}
                disabled={submittingRequest || !requestNote.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingRequest ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Submitting...
                  </>
                ) : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail panel (same as ContentView) ────────────────── */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className={`relative w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col sm:flex-row ${
              isDark ? 'bg-[#0d1425] border border-white/[0.08]' : 'bg-white shadow-2xl'
            }`}
            style={{ maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPost(null)}
              className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isDark ? 'bg-white/10 text-gray-300 hover:bg-white/20' : 'bg-black/10 text-gray-700 hover:bg-black/15'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            {/* Left: image */}
            <div
              className={`relative flex-shrink-0 w-full sm:w-72 bg-gray-900 ${
                selectedPost.format === 'Story' ? 'aspect-[9/16]' : 'aspect-square'
              } sm:aspect-auto sm:min-h-[400px]`}
            >
              {currentImageUrl ? (
                <img src={currentImageUrl} alt="Post" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ backgroundColor: selectedPost.background_color || '#1a2436' }}
                >
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
              )}
              {panelImages.length > 1 && (
                <>
                  <div className="absolute bottom-3 left-0 right-0 flex flex-col items-center gap-2">
                    <p className="text-white/60 text-xs">
                      Slide {carouselIndex + 1} of {panelImages.length} · swipe to browse
                    </p>
                    <div className="flex gap-1">
                      {panelImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCarouselIndex(i)}
                          className={`rounded-full transition-all ${i === carouselIndex ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/30'}`}
                        />
                      ))}
                    </div>
                  </div>
                  {carouselIndex > 0 && (
                    <button
                      onClick={() => setCarouselIndex(i => i - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="15 18 9 12 15 6"/>
                      </svg>
                    </button>
                  )}
                  {carouselIndex < panelImages.length - 1 && (
                    <button
                      onClick={() => setCarouselIndex(i => i + 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Right: details */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                {selectedPost.platform && (
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Platform</p>
                    <p className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{selectedPost.platform}</p>
                  </div>
                )}
                {selectedPost.scheduled_date && (
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Scheduled</p>
                    <p className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                      {format(new Date(selectedPost.scheduled_date + 'T00:00:00'), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>

              {selectedPost.caption && (
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-1.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Caption</p>
                  <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{selectedPost.caption}</p>
                </div>
              )}

              {selectedPost.cta && (
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-1.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Call to Action</p>
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{selectedPost.cta}</p>
                </div>
              )}

              {/* Change request note + images */}
              {selectedPost.change_request_note && !showInlineRequest && (
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-1.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Your Change Request</p>
                  <p className={`text-sm leading-relaxed mb-2 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>{selectedPost.change_request_note}</p>
                  {selectedPost.change_request_images && selectedPost.change_request_images.length > 0 && (
                    <div>
                      <div className="flex gap-3 flex-wrap mb-2">
                        {selectedPost.change_request_images.map((path, i) => {
                          const url = getChangeRequestImageUrl(path)
                          return (
                            <div key={i} className="flex flex-col items-center gap-1">
                              <button
                                onClick={() => setLightboxUrl(url)}
                                className="focus:outline-none"
                              >
                                <img
                                  src={url}
                                  alt={`Reference ${i + 1}`}
                                  className="w-24 h-24 object-cover rounded-lg border border-amber-300/50 hover:opacity-80 transition-opacity cursor-pointer"
                                />
                              </button>
                              <button
                                onClick={() => downloadImage(url, `reference-${i + 1}.jpg`)}
                                className={`text-[10px] font-medium ${isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-800'}`}
                              >
                                Download
                              </button>
                            </div>
                          )
                        })}
                      </div>
                      {selectedPost.change_request_images.length > 1 && (
                        <button
                          onClick={async () => {
                            for (let i = 0; i < selectedPost.change_request_images!.length; i++) {
                              const url = getChangeRequestImageUrl(selectedPost.change_request_images![i])
                              await downloadImage(url, `reference-${i + 1}.jpg`)
                            }
                          }}
                          className={`text-xs font-semibold border rounded-lg px-3 py-1.5 transition-colors ${
                            isDark
                              ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                              : 'border-amber-200 text-amber-700 hover:bg-amber-100'
                          }`}
                        >
                          Download all ({selectedPost.change_request_images.length})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-auto pt-2 flex flex-col gap-2">
                {isSelectedAwaiting && !showInlineRequest && (
                  <>
                    <button
                      onClick={handlePanelApprove}
                      disabled={approvingId === selectedPost.id}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold bg-green-500 hover:bg-green-400 text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {approvingId === selectedPost.id ? 'Approving...' : 'Approve this post'}
                    </button>
                    <button
                      onClick={() => setShowInlineRequest(true)}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                        isDark
                          ? 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
                          : 'bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      ↩ Request changes
                    </button>
                  </>
                )}

                {/* Inline request changes form */}
                {showInlineRequest && (
                  <div className={`rounded-xl border p-4 flex flex-col gap-3 ${
                    isDark ? 'bg-white/[0.03] border-white/10' : 'bg-amber-50 border-amber-200'
                  }`}>
                    <p className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-amber-700'}`}>
                      Request Changes
                    </p>
                    <div>
                      <textarea
                        value={requestNote}
                        onChange={e => { setRequestNote(e.target.value); setRequestNoteError('') }}
                        placeholder="Describe the changes you'd like..."
                        rows={3}
                        className={`w-full text-sm px-3 py-2 rounded-lg resize-none focus:outline-none focus:ring-1 ${
                          isDark
                            ? 'bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:ring-[#8EE3E3]/30'
                            : 'bg-white border border-amber-200 text-gray-900 placeholder-gray-400 focus:ring-amber-300'
                        } ${requestNoteError ? 'border-red-400' : ''}`}
                      />
                      {requestNoteError && <p className="text-xs text-red-400 mt-1">{requestNoteError}</p>}
                    </div>
                    <div>
                      <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors text-xs font-medium ${
                        isDark
                          ? 'border-white/10 hover:border-white/20 text-gray-500'
                          : 'border-amber-200 hover:border-amber-300 text-amber-600'
                      }`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                        </svg>
                        Attach images (optional)
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
                      </label>
                      {requestFilePreviews.length > 0 && (
                        <div className="flex gap-2 flex-wrap mt-2">
                          {requestFilePreviews.map((src, i) => (
                            <div key={i} className="relative">
                              <img src={src} alt={`Preview ${i + 1}`} className="w-12 h-12 object-cover rounded-lg border border-white/10" />
                              <button
                                onClick={() => removeFile(i)}
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold hover:bg-red-600"
                              >×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowInlineRequest(false)
                          setRequestNote('')
                          setRequestFiles([])
                          setRequestFilePreviews([])
                          setRequestNoteError('')
                        }}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                          isDark
                            ? 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
                            : 'bg-white border border-amber-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >Cancel</button>
                      <button
                        onClick={handleInlineSubmit}
                        disabled={submittingRequest || !requestNote.trim()}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-400 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {submittingRequest ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Submitting...
                          </>
                        ) : 'Submit Request'}
                      </button>
                    </div>
                  </div>
                )}
                {selectedPost.status === 'Confirmed' && (
                  <div className="w-full py-2.5 rounded-xl text-sm font-semibold bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Approved ✓
                  </div>
                )}
                {selectedPost.status === 'Scheduled' && (
                  <div className="w-full py-2.5 rounded-xl text-sm font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center gap-2">
                    Scheduled
                  </div>
                )}
                {selectedPost.status === 'Posted' && (
                  <div className="w-full py-2.5 rounded-xl text-sm font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center gap-2">
                    Published
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox overlay ──────────────────────────────────── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <img
            src={lightboxUrl}
            alt="Full size"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
