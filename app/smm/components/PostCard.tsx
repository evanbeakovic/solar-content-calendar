'use client'

// NOTE: Requires DB migration before Fix 3 works:
// ALTER TABLE posts ADD COLUMN IF NOT EXISTS change_request_fixed boolean DEFAULT false;

import { useState } from 'react'
import { Post, PostStatus } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { format } from 'date-fns'

interface PostCardProps {
  post: Post
  onClick: () => void
  onStatusChange: (postId: string, newStatus: PostStatus) => void
  onSelect?: (postId: string) => void
  isSelected?: boolean
  isSelectionMode?: boolean
  onDuplicated?: (post: Post) => void
  onDeleted?: (postId: string) => void
}

const STATUS_ORDER: PostStatus[] = [
  'Uploads', 'Being Created', 'To Be Confirmed', 'Requested Changes', 'Confirmed', 'Scheduled', 'Posted',
]

export default function PostCard({ post, onClick, onStatusChange, onSelect, isSelected, isSelectionMode, onDuplicated, onDeleted }: PostCardProps) {
  const supabase = createClient()
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showRequestNoteModal, setShowRequestNoteModal] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedImageIndices, setSelectedImageIndices] = useState<Set<number>>(new Set())

  const brandPrimary = post.client?.brand_primary || '#10375C'
  const brandSecondary = post.client?.brand_secondary || '#8EE3E3'

  const getNextStatus = (): PostStatus | null => {
    // Requested Changes → Confirmed (SMM marks as fixed and confirms in one step)
    if (post.status === 'Requested Changes') return 'Confirmed'
    // To Be Confirmed → Confirmed (skip Requested Changes; only clients can set that)
    if (post.status === 'To Be Confirmed') return 'Confirmed'
    // Being Created → To Be Confirmed always (even after a change request cycle)
    if (post.status === 'Being Created') return 'To Be Confirmed'
    const currentIndex = STATUS_ORDER.indexOf(post.status)
    return currentIndex < STATUS_ORDER.length - 1 ? STATUS_ORDER[currentIndex + 1] : null
  }

  const nextStatus = getNextStatus()

  function getStorageUrl(path: string): string {
    const { data } = supabase.storage.from('post-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleAdvanceStatus(e: React.MouseEvent) {
    e.stopPropagation()
    if (!nextStatus) return
    if (post.status === 'Requested Changes') {
      // Mark as fixed (fire-and-forget) then move directly to Confirmed
      fetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change_request_fixed: true }),
      })
      onStatusChange(post.id, 'Confirmed')
      return
    }
    onStatusChange(post.id, nextStatus)
  }

  const getImageUrl = () => {
    if (!post.image_path) return null
    const { data } = supabase.storage.from('post-images').getPublicUrl(post.image_path)
    return data.publicUrl
  }

  const imageUrl = getImageUrl()

  const badgeLabel = post.platform && post.format
    ? `${post.platform} ${post.format}`
    : post.platform || post.format || null

  async function handleDuplicate(e: React.MouseEvent) {
    e.stopPropagation()
    setDuplicating(true)
    const res = await fetch(`/api/posts/${post.id}/duplicate`, { method: 'POST' })
    if (res.ok) {
      const newPost = await res.json()
      onDuplicated?.(newPost)
    }
    setDuplicating(false)
    setShowMenu(false)
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    setDeleting(true)
    const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' })
    if (res.ok) {
      onDeleted?.(post.id)
    }
    setDeleting(false)
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

  function closeRequestNoteModal() {
    setShowRequestNoteModal(false)
    setSelectionMode(false)
    setSelectedImageIndices(new Set())
  }

  const isFixed = post.change_request_fixed === true
  const hasChangeRequest = !!post.change_request_note
  const hasChangeImages = !!(post.change_request_images && post.change_request_images.length > 0)

  return (
    <div
      onClick={isSelectionMode ? (e) => { e.stopPropagation(); onSelect?.(post.id) } : onClick}
      className={`relative bg-white dark:bg-gray-900 rounded-xl shadow-sm border transition-all cursor-pointer group overflow-hidden flex flex-col ${
        isSelected
          ? 'border-[#10375C] ring-2 ring-[#10375C]/20 shadow-md'
          : 'border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      {/* Image / color header */}
      <div className="relative flex-shrink-0">
        {imageUrl ? (
          <div className="relative aspect-square w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
            <Image src={imageUrl} alt={post.headline || 'Post image'} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
        ) : (
          <div className="aspect-square w-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 dark:text-gray-500">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}

        {/* Checkbox */}
        {isSelectionMode && !isSelected && (
          <div className="absolute top-2 left-2 w-5 h-5 rounded-full border-2 border-white bg-black/20 shadow-sm" />
        )}
        {isSelected && (
          <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-[#10375C] flex items-center justify-center shadow-sm">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        )}

        {/* Three-dot menu */}
        <div
          className="absolute top-2 right-2"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={e => { e.stopPropagation(); setShowMenu(v => !v); setShowDeleteConfirm(false) }}
            className="w-6 h-6 rounded-md bg-white/80 backdrop-blur-sm flex items-center justify-center text-gray-600 hover:bg-white hover:shadow-sm transition-all opacity-0 group-hover:opacity-100"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5"/>
              <circle cx="12" cy="12" r="1.5"/>
              <circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute top-full mt-1 right-0 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 py-1.5 overflow-hidden">
                {onSelect && (
                  <button
                    onClick={e => { e.stopPropagation(); onSelect(post.id); setShowMenu(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9"/>
                      <polyline points="9 12 11 14 15 10"/>
                    </svg>
                    Select
                  </button>
                )}
                <button
                  onClick={handleDuplicate}
                  disabled={duplicating}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                  {duplicating ? 'Duplicating...' : 'Duplicate'}
                </button>
                {!showDeleteConfirm ? (
                  <button
                    onClick={e => { e.stopPropagation(); setShowDeleteConfirm(true) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                    </svg>
                    Delete
                  </button>
                ) : (
                  <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-red-600 mb-2">Delete this post?</p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 py-1.5 text-xs rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 transition-all"
                      >
                        {deleting ? '...' : 'Delete'}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setShowDeleteConfirm(false) }}
                        className="flex-1 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content — flex column so advance button pins to bottom */}
      <div className="p-3 flex flex-col flex-1">
        <div className="mb-2">
          <span className="text-xs font-semibold block text-gray-500 dark:text-gray-400">
            {post.client?.name || 'Unknown Client'}
          </span>
          {post.platform && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-md font-medium inline-block mt-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              title={badgeLabel || ''}
            >
              {badgeLabel}
            </span>
          )}
        </div>

        {post.headline && (
          <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-2 leading-snug">
            {post.headline}
          </p>
        )}

        {post.scheduled_date && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {format(new Date(post.scheduled_date + 'T00:00:00'), 'MMM d')}
          </div>
        )}

        {/* ── Client request note — inline preview ── */}
        {hasChangeRequest && (
          <div className="mb-2" onClick={e => e.stopPropagation()}>
            {isFixed ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-200">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <p className="text-xs text-green-700 font-medium">Request fixed ✓</p>
              </div>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); setShowRequestNoteModal(true) }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                <p className="text-xs leading-snug text-amber-800">
                  <span className="font-bold">Client request:</span>{' '}
                  {(post.change_request_note || '').length > 80
                    ? post.change_request_note!.slice(0, 80) + '…'
                    : post.change_request_note}
                </p>
                {hasChangeImages && (
                  <span className="flex items-center gap-0.5 mt-0.5 text-[10px] text-amber-600">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                    {post.change_request_images!.length} image{post.change_request_images!.length !== 1 ? 's' : ''} attached
                  </span>
                )}
              </button>
            )}
          </div>
        )}

        {/* Download + Advance buttons — pinned to bottom */}
        <div className="mt-auto">
        {imageUrl && (
          <button
            onClick={async (e: React.MouseEvent) => {
              e.stopPropagation()
              const images = post.images && post.images.length > 0 ? post.images : null

              if (images && images.length > 1) {
                for (let i = 0; i < images.length; i++) {
                  const sb = (await import('@/lib/supabase/client')).createClient()
                  const { data } = sb.storage.from('post-images').getPublicUrl(images[i].path)
                  const filename = `${post.client?.name || 'post'}-${i + 1}.jpg`.replace(/\s+/g, '-').toLowerCase()
                  const res = await fetch(`/api/download?url=${encodeURIComponent(data.publicUrl)}&filename=${encodeURIComponent(filename)}`)
                  const blob = await res.blob()
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(blob)
                  a.download = filename
                  a.click()
                  URL.revokeObjectURL(a.href)
                }
              } else {
                const filename = `${post.client?.name || 'post'}-${post.scheduled_date || 'image'}.jpg`.replace(/\s+/g, '-').toLowerCase()
                const res = await fetch(`/api/download?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(filename)}`)
                const blob = await res.blob()
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = filename
                a.click()
                URL.revokeObjectURL(a.href)
              }
            }}
            className="mb-1 w-full text-xs py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            {post.images && post.images.length > 1 ? `Download all (${post.images.length}) images` : 'Download Image'}
          </button>
        )}

        {/* Advance / Posted button */}
        <div className="pt-1">
          {nextStatus && (
            <button
              onClick={handleAdvanceStatus}
              className="w-full text-xs py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1 border"
              style={{
                backgroundColor: brandPrimary + '10',
                borderColor: brandPrimary + '30',
                color: brandPrimary,
              }}
            >
              {post.status === 'Requested Changes' ? (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Mark as Fixed
                </>
              ) : (
                <>
                  Move to {nextStatus}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9,18 15,12 9,6"/>
                  </svg>
                </>
              )}
            </button>
          )}

          {post.status === 'Posted' && (
            <div
              className="w-full text-xs py-1.5 rounded-lg font-medium text-center border"
              style={{
                backgroundColor: brandSecondary + '20',
                borderColor: brandSecondary + '40',
                color: brandPrimary,
              }}
            >
              Posted
            </div>
          )}
        </div>
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90"
          onClick={e => { e.stopPropagation(); setLightboxUrl(null) }}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={async e => { e.stopPropagation(); await downloadImage(lightboxUrl, 'image.jpg') }}
              className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
            </button>
            <button
              onClick={e => { e.stopPropagation(); setLightboxUrl(null) }}
              className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <img
            src={lightboxUrl}
            alt="Full size"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* ── Client request note modal ── */}
      {showRequestNoteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => { e.stopPropagation(); closeRequestNoteModal() }}
        >
          <div
            className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={e => { e.stopPropagation(); closeRequestNoteModal() }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/10 text-gray-700 hover:bg-black/15 flex items-center justify-center transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <h3 className={`text-sm font-bold mb-3 ${isFixed ? 'text-green-700' : 'text-amber-700'}`}>
              {isFixed ? 'Client Request (Fixed ✓)' : 'Client Request'}
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">{post.change_request_note}</p>
            {hasChangeImages && (
              <div>
                {void console.log('[SMM PostCard modal] change_request_images:', post.change_request_images)}
                <div className="flex gap-3 flex-wrap mb-2">
                  {post.change_request_images!.map((path, i) => {
                    const cleanPath = path.startsWith('/') ? path.slice(1) : path
                    const url = `https://lnxrnvypvyxykofgiael.supabase.co/storage/v1/object/public/post-images/${cleanPath}`
                    const isChecked = selectedImageIndices.has(i)
                    return (
                      <div key={i} className="relative">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            if (selectionMode) {
                              setSelectedImageIndices(prev => {
                                const next = new Set(prev)
                                next.has(i) ? next.delete(i) : next.add(i)
                                return next
                              })
                            } else {
                              setLightboxUrl(url)
                            }
                          }}
                          className="focus:outline-none"
                        >
                          <img
                            src={url}
                            alt={`Reference ${i + 1}`}
                            className={`w-24 h-24 object-cover rounded-lg border transition-opacity cursor-pointer ${
                              selectionMode && isChecked
                                ? 'border-amber-500 ring-2 ring-amber-400'
                                : 'border-amber-200 hover:opacity-80'
                            }`}
                          />
                        </button>
                        {selectionMode && (
                          <div
                            className={`absolute top-1 left-1 w-5 h-5 rounded flex items-center justify-center border-2 pointer-events-none ${
                              isChecked ? 'bg-amber-500 border-amber-500' : 'bg-white/80 border-gray-400'
                            }`}
                          >
                            {isChecked && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {selectionMode ? (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setSelectedImageIndices(new Set(post.change_request_images!.map((_, i) => i)))
                      }}
                      className="text-xs font-medium text-amber-700 border border-amber-200 rounded-lg px-3 py-1.5 hover:bg-amber-50 transition-colors"
                    >
                      Select all
                    </button>
                    <button
                      disabled={selectedImageIndices.size === 0}
                      onClick={async e => {
                        e.stopPropagation()
                        const indices = Array.from(selectedImageIndices).sort((a, b) => a - b)
                        for (const i of indices) {
                          const cleanPath = post.change_request_images![i].startsWith('/') ? post.change_request_images![i].slice(1) : post.change_request_images![i]
                          const url = `https://lnxrnvypvyxykofgiael.supabase.co/storage/v1/object/public/post-images/${cleanPath}`
                          await downloadImage(url, `reference-${i + 1}.jpg`)
                        }
                      }}
                      className="text-xs font-semibold border border-amber-300 text-amber-700 rounded-lg px-3 py-1.5 hover:bg-amber-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Download ({selectedImageIndices.size})
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setSelectionMode(false)
                        setSelectedImageIndices(new Set())
                      }}
                      className="text-xs font-medium text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setSelectionMode(true)
                        setSelectedImageIndices(new Set())
                      }}
                      className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center hover:bg-amber-200 transition-colors"
                      title="Download images"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
