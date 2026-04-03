'use client'

import { useState, useMemo, useEffect } from 'react'
import { Post, Client, PostStatus } from '@/lib/types'
import { format, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'
import PostCard from './PostCard'
import NewPostModal from './NewPostModal'
import EditPostModal from './EditPostModal'
import CSVImportModal from './CSVImportModal'

interface KanbanBoardProps {
  initialPosts: Post[]
  clients: Client[]
}

const STATUSES: PostStatus[] = [
  'Uploads',
  'Being Created',
  'To Be Confirmed',
  'Requested Changes',
  'Confirmed',
  'Scheduled',
  'Posted',
]

const STATUS_STYLES: Record<PostStatus, { active: string; dot: string }> = {
  'Uploads':           { active: 'bg-slate-600 text-white',  dot: 'bg-slate-400' },
  'Being Created':     { active: 'bg-blue-600 text-white',   dot: 'bg-blue-500' },
  'To Be Confirmed':   { active: 'bg-gray-800 text-white',   dot: 'bg-gray-400' },
  'Requested Changes': { active: 'bg-amber-500 text-white',  dot: 'bg-amber-400' },
  'Confirmed':         { active: 'bg-green-600 text-white',  dot: 'bg-green-500' },
  'Scheduled':         { active: 'bg-yellow-500 text-white', dot: 'bg-yellow-400' },
  'Posted':            { active: 'bg-purple-600 text-white', dot: 'bg-purple-500' },
}

type Period = 'this-week' | 'next-week' | '2-weeks' | 'this-month' | 'custom' | 'all'
type SortBy = 'date-asc' | 'date-desc' | 'added-asc' | 'added-desc'

function getPeriodRange(period: Period, customFrom: string, customTo: string): { start: Date; end: Date } | null {
  const now = new Date()
  if (period === 'all') return null
  if (period === 'this-week') return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
  if (period === 'next-week') {
    const next = addWeeks(now, 1)
    return { start: startOfWeek(next, { weekStartsOn: 1 }), end: endOfWeek(next, { weekStartsOn: 1 }) }
  }
  if (period === '2-weeks') return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 }) }
  if (period === 'this-month') return { start: startOfMonth(now), end: endOfMonth(now) }
  if (period === 'custom' && customFrom && customTo) return { start: new Date(customFrom), end: new Date(customTo) }
  return null
}

// ── Multi-select client dropdown ─────────────────────────────────
function ClientDropdown({ clients, selected, onChange }: {
  clients: Client[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)

  const allSelected = selected.length === clients.length
  const label = allSelected
    ? 'All Clients'
    : selected.length === 0
    ? 'No Clients'
    : selected.length === 1
    ? clients.find(c => c.id === selected[0])?.name || '1 Client'
    : `${selected.length} Clients`

  function toggleAll() {
    onChange(allSelected ? [] : clients.map(c => c.id))
  }

  function toggleOne(id: string) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500 transition-colors min-w-[160px]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
        <span className="flex-1 text-left">{label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-2 left-0 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-30 p-2">
            <label className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-700 mb-1">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="w-4 h-4 rounded accent-[#10375C]"
              />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Select All</span>
            </label>
            {clients.map(c => (
              <label key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={() => toggleOne(c.id)}
                  className="w-4 h-4 rounded accent-[#10375C]"
                />
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-slate-600 flex items-center justify-center text-white text-xs font-bold">
                    {c.name[0]}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-200">{c.name}</span>
                </div>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────
export default function KanbanBoard({ initialPosts, clients }: KanbanBoardProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [activeStatus, setActiveStatus] = useState<PostStatus>('Uploads')
  const [selectedClients, setSelectedClients] = useState<string[]>(clients.map(c => c.id))
  const [period, setPeriod] = useState<Period>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('date-asc')
  const [showNewPost, setShowNewPost] = useState(false)
  const [showCSVImport, setShowCSVImport] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set())
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)

  useEffect(() => {
    function handleNewPost() { setShowNewPost(true) }
    window.addEventListener('smm:new-post', handleNewPost)
    return () => window.removeEventListener('smm:new-post', handleNewPost)
  }, [])

  const periodRange = getPeriodRange(period, customFrom, customTo)

  const filteredPosts = posts.filter(post => {
    if (!selectedClients.includes(post.client_id)) return false
    if (post.status !== activeStatus) return false
    if (periodRange && post.scheduled_date) {
      const postDate = parseISO(post.scheduled_date)
      if (!isWithinInterval(postDate, periodRange)) return false
    }
    return true
  })

  // Fix 1 — sort
  const sortedFilteredPosts = useMemo(() => {
    return [...filteredPosts].sort((a, b) => {
      if (sortBy === 'date-asc' || sortBy === 'date-desc') {
        const aVal = a.scheduled_date ? new Date(a.scheduled_date).getTime() : Infinity
        const bVal = b.scheduled_date ? new Date(b.scheduled_date).getTime() : Infinity
        return sortBy === 'date-asc' ? aVal - bVal : bVal - aVal
      }
      const aVal = new Date(a.created_at).getTime()
      const bVal = new Date(b.created_at).getTime()
      return sortBy === 'added-asc' ? aVal - bVal : bVal - aVal
    })
  }, [filteredPosts, sortBy])

  // Fix 5 — dedup
  const uniquePosts = Array.from(new Map(sortedFilteredPosts.map(p => [p.id, p])).values())

  const countByStatus = (status: PostStatus) =>
    posts.filter(p =>
      selectedClients.includes(p.client_id) &&
      p.status === status &&
      (periodRange && p.scheduled_date
        ? isWithinInterval(parseISO(p.scheduled_date), periodRange)
        : true)
    ).length

  async function handleStatusChange(postId: string, newStatus: PostStatus) {
    const response = await fetch(`/api/posts/${postId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (response.ok) {
      const updatedPost = await response.json()
      setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p))
    }
  }

  function handlePostCreated(newPost: Post) {
    setPosts(prev => [newPost, ...prev])
    setShowNewPost(false)
  }

  function handlePostUpdated(updatedPost: Post) {
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p))
    setEditingPost(null)
  }

  function handlePostDeleted(postId: string) {
    setPosts(prev => prev.filter(p => p.id !== postId))
    setEditingPost(null)
    setSelectedPostIds(prev => { const next = new Set(prev); next.delete(postId); return next })
  }

  function handlePostDuplicated(newPost: Post) {
    setPosts(prev => [newPost, ...prev])
    setEditingPost(null)
  }

  // Fix 4 — handle replaced posts from CSV import
  function handleImportComplete(newPosts: Post[], replacedPosts?: Post[]) {
    const replaced = replacedPosts || []
    const replacedIds = new Set(replaced.map(p => p.id))
    setPosts(prev => {
      const updated = prev.map(p => replacedIds.has(p.id) ? (replaced.find(r => r.id === p.id) ?? p) : p)
      const brandNew = newPosts.filter(p => !replacedIds.has(p.id))
      return [...brandNew, ...updated]
    })
    setShowCSVImport(false)
  }

  // ── Bulk selection ──────────────────────────────────────────────
  function toggleSelectPost(id: string) {
    setSelectedPostIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSelectAll() {
    if (selectedPostIds.size === uniquePosts.length && uniquePosts.length > 0) {
      setSelectedPostIds(new Set())
    } else {
      setSelectedPostIds(new Set(uniquePosts.map(p => p.id)))
    }
  }

  async function handleBulkDuplicate() {
    const ids = Array.from(selectedPostIds)
    const results = await Promise.all(ids.map(id =>
      fetch(`/api/posts/${id}/duplicate`, { method: 'POST' })
    ))
    const newPosts = await Promise.all(
      results.filter(r => r.ok).map(r => r.json())
    )
    setPosts(prev => [...newPosts, ...prev])
    setSelectedPostIds(new Set())
  }

  async function handleBulkDelete() {
    if (!bulkDeleteConfirm) {
      setBulkDeleteConfirm(true)
      return
    }
    const ids = Array.from(selectedPostIds)
    await Promise.all(ids.map(id => fetch(`/api/posts/${id}`, { method: 'DELETE' })))
    setPosts(prev => prev.filter(p => !selectedPostIds.has(p.id)))
    setSelectedPostIds(new Set())
    setBulkDeleteConfirm(false)
  }

  async function handleBulkDownload() {
    const selectedPosts = posts.filter(p => selectedPostIds.has(p.id))
    for (const post of selectedPosts) {
      const images = post.images && post.images.length > 0 ? post.images : null
      if (!images && !post.image_path) continue
      if (images && images.length > 1) {
        for (let i = 0; i < images.length; i++) {
          const filename = `${post.client?.name || 'post'}-${i + 1}.jpg`.replace(/\s+/g, '-').toLowerCase()
          const res = await fetch(`/api/download?url=${encodeURIComponent(images[i].path)}&filename=${encodeURIComponent(filename)}`)
          const blob = await res.blob()
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.download = filename
          a.click()
          URL.revokeObjectURL(a.href)
        }
      } else if (post.image_path) {
        const filename = `${post.client?.name || 'post'}-${post.scheduled_date || 'image'}.jpg`.replace(/\s+/g, '-').toLowerCase()
        const res = await fetch(`/api/download?url=${encodeURIComponent(post.image_path)}&filename=${encodeURIComponent(filename)}`)
        const blob = await res.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = filename
        a.click()
        URL.revokeObjectURL(a.href)
      }
    }
    setSelectedPostIds(new Set())
  }

  async function handleBulkMoveTo(newStatus: PostStatus) {
    const ids = Array.from(selectedPostIds)
    await Promise.all(ids.map(id =>
      fetch(`/api/posts/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    ))
    setPosts(prev => prev.map(p => selectedPostIds.has(p.id) ? { ...p, status: newStatus } : p))
    setSelectedPostIds(new Set())
  }

  const PERIOD_OPTIONS: { label: string; value: Period }[] = [
    { label: 'All', value: 'all' },
    { label: 'This Week', value: 'this-week' },
    { label: 'Next Week', value: 'next-week' },
    { label: '2 Weeks', value: '2-weeks' },
    { label: 'This Month', value: 'this-month' },
    { label: 'Custom', value: 'custom' },
  ]

  const allFilteredSelected = uniquePosts.length > 0 && selectedPostIds.size === uniquePosts.length

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Top header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Content Pipeline</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{posts.length} total posts</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCSVImport(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-600 bg-slate-700 text-slate-200 font-semibold hover:bg-slate-600 hover:text-white transition-all text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Import
          </button>
          <button
            onClick={() => setShowNewPost(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#10375C] text-white font-semibold hover:bg-[#0d2d4a] transition-all text-sm shadow-lg shadow-[#10375C]/20"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 mb-5 flex flex-wrap items-center gap-4">
        <ClientDropdown
          clients={clients}
          selected={selectedClients}
          onChange={setSelectedClients}
        />

        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 hidden sm:block" />

        <div className="flex items-center gap-1.5 flex-wrap">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === opt.value
                  ? 'bg-[#10375C] text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#10375C]/20"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#10375C]/20"
            />
          </div>
        )}

        {/* Sort dropdown — far right */}
        <div className="ml-auto">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
            className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#10375C]/20 font-medium cursor-pointer"
          >
            <option value="date-asc">Post Date: Oldest First</option>
            <option value="date-desc">Post Date: Newest First</option>
            <option value="added-asc">First Added</option>
            <option value="added-desc">Last Added</option>
          </select>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {STATUSES.map(status => {
          const count = countByStatus(status)
          const isActive = activeStatus === status
          const styles = STATUS_STYLES[status]
          return (
            <button
              key={status}
              onClick={() => { setActiveStatus(status); setSelectedPostIds(new Set()) }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                isActive
                  ? `${styles.active} border-transparent shadow-sm`
                  : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-white/70' : styles.dot}`} />
              {status}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Posts grid */}
      {uniquePosts.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <p className="text-gray-400 dark:text-gray-500 font-medium">No posts in &quot;{activeStatus}&quot;</p>
          <p className="text-gray-300 dark:text-gray-600 text-sm mt-1">Try changing the filters or time period</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {uniquePosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onClick={() => setEditingPost(post)}
              onStatusChange={handleStatusChange}
              onSelect={toggleSelectPost}
              isSelectionMode={selectedPostIds.size > 0}
              isSelected={selectedPostIds.has(post.id)}
              onDuplicated={handlePostDuplicated}
              onDeleted={handlePostDeleted}
            />
          ))}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedPostIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#10375C] text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4 z-50 flex-wrap">
          <span className="text-sm font-bold">{selectedPostIds.size} selected</span>
          <div className="w-px h-5 bg-white/20" />
          <button
            onClick={handleSelectAll}
            className="text-sm font-medium hover:text-[#8EE3E3] transition-colors"
          >
            {allFilteredSelected ? 'Deselect All' : 'Select All'}
          </button>
          <button
            onClick={handleBulkDuplicate}
            className="text-sm font-medium hover:text-[#8EE3E3] transition-colors flex items-center gap-1.5"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            Duplicate
          </button>
          {!bulkDeleteConfirm ? (
            <button
              onClick={handleBulkDelete}
              className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              </svg>
              Delete
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-300 font-medium">Delete {selectedPostIds.size} posts?</span>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 text-xs rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-all"
              >
                Confirm
              </button>
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                className="px-3 py-1 text-xs rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
            </div>
          )}
          <button
            onClick={handleBulkDownload}
            className="text-sm font-medium hover:text-[#8EE3E3] transition-colors flex items-center gap-1.5"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Download All
          </button>
          <select
            value=""
            onChange={e => e.target.value && handleBulkMoveTo(e.target.value as PostStatus)}
            className="bg-white/10 text-white text-sm rounded-lg px-3 py-1.5 cursor-pointer hover:bg-white/20 transition-all border border-white/20 font-medium"
          >
            <option value="" disabled className="text-gray-900">Move To...</option>
            {STATUSES.map(s => (
              <option key={s} value={s} className="text-gray-900">{s}</option>
            ))}
          </select>
          <button
            onClick={() => { setSelectedPostIds(new Set()); setBulkDeleteConfirm(false) }}
            className="text-white/50 hover:text-white transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Modals */}
      {showNewPost && (
        <NewPostModal
          clients={clients}
          onClose={() => setShowNewPost(false)}
          onCreated={handlePostCreated}
        />
      )}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          clients={clients}
          onClose={() => setEditingPost(null)}
          onUpdated={handlePostUpdated}
          onDeleted={handlePostDeleted}
          onDuplicated={handlePostDuplicated}
        />
      )}
      {showCSVImport && (
        <CSVImportModal
          clients={clients}
          onClose={() => setShowCSVImport(false)}
          onImported={handleImportComplete}
        />
      )}
    </div>
  )
}
