'use client'

import { useState, useEffect } from 'react'
import { Post, Client, PostStatus } from '@/lib/types'
import { format } from 'date-fns'
import ClientPostCard from './PostCard'
import { getAspectRatioForPost, aspectRatioToCSS } from '@/lib/postFormats'

type TabKey = 'awaiting' | 'changes' | 'approved' | 'scheduled' | 'published'

const TABS: { key: TabKey; label: string; statuses: PostStatus[] }[] = [
  { key: 'awaiting',   label: 'Awaiting Your Review', statuses: ['To Be Confirmed'] },
  { key: 'changes',    label: 'Changes Requested',    statuses: ['Requested Changes'] },
  { key: 'approved',   label: 'Approved',             statuses: ['Confirmed'] },
  { key: 'scheduled',  label: 'Scheduled',            statuses: ['Scheduled'] },
  { key: 'published',  label: 'Published',            statuses: ['Posted'] },
]

interface ContentViewProps {
  posts: Post[]
  clients: Client[]
  activeClientIds: string[]
  theme: 'dark' | 'light'
  onPostUpdated: (post: Post) => void
  pendingTab?: string
  onTabConsumed?: () => void
  readOnly?: boolean
}

export default function ContentView({
  posts,
  clients,
  activeClientIds,
  theme,
  onPostUpdated,
  pendingTab,
  onTabConsumed,
  readOnly = false,
}: ContentViewProps) {
  const isDark = theme === 'dark'

  const [activeTab, setActiveTab] = useState<TabKey>('awaiting')

  useEffect(() => {
    if (pendingTab) {
      setActiveTab(pendingTab as TabKey)
      onTabConsumed?.()
    }
  }, [pendingTab])
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Inline request-changes form state
  const [showInlineRequest, setShowInlineRequest] = useState(false)
  const [requestNote, setRequestNote] = useState('')
  const [requestFiles, setRequestFiles] = useState<File[]>([])
  const [requestFilePreviews, setRequestFilePreviews] = useState<string[]>([])
  // Existing image paths the user wants to retain when editing a request
  const [keepExistingImages, setKeepExistingImages] = useState<string[]>([])
  const [requestNoteError, setRequestNoteError] = useState('')
  const [uploadDragActive, setUploadDragActive] = useState(false)
  const [submittingRequest, setSubmittingRequest] = useState(false)

  // Filter posts per tab
  function getTabPosts(tab: TabKey) {
    const t = TABS.find(t => t.key === tab)!
    return posts.filter(p => {
      if (!activeClientIds.includes(p.client_id)) return false
      if (t.statuses.includes(p.status)) return true
      // 'changes' tab: also includes 'Being Created' posts with an unfixed change request
      if (tab === 'changes' && p.status === 'Being Created' && p.change_request_note && !p.change_request_fixed) return true
      return false
    })
  }

  function getImageUrl(path: string | null) {
    if (!path) return null
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    return `https://lnxrnvypvyxykofgiael.supabase.co/storage/v1/object/public/post-images/${cleanPath}`
  }

  async function handleCardApprove(postId: string) {
    setApprovingId(postId)
    const res = await fetch(`/api/posts/${postId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Confirmed' }),
    })
    if (res.ok) {
      const updated = await res.json()
      const orig = posts.find(p => p.id === postId)
      const merged: Post = { ...updated, images: orig?.images || [], client: orig?.client }
      onPostUpdated(merged)
      if (selectedPost?.id === postId) setSelectedPost(merged)
    }
    setApprovingId(null)
  }

  function resetInlineForm() {
    setShowInlineRequest(false)
    setRequestNote('')
    setRequestFiles([])
    setRequestFilePreviews([])
    setKeepExistingImages([])
    setRequestNoteError('')
  }

  function openPost(post: Post) {
    setSelectedPost(post)
    setCarouselIndex(0)
    resetInlineForm()
  }

  // Opens the detail panel with the inline request form already expanded.
  // If the post already has a change request, pre-fills the form for editing.
  function openRequestModal(post: Post) {
    setSelectedPost(post)
    setCarouselIndex(0)
    setRequestNoteError('')
    setRequestFiles([])
    setRequestFilePreviews([])
    const isEdit = post.status === 'Requested Changes' && !post.change_request_fixed
    if (isEdit) {
      setRequestNote(post.change_request_note || '')
      setKeepExistingImages(post.change_request_images || [])
    } else {
      setRequestNote('')
      setKeepExistingImages([])
    }
    setShowInlineRequest(true)
  }

  async function handlePanelApprove() {
    if (!selectedPost) return
    await handleCardApprove(selectedPost.id)
  }

  function addFiles(files: File[]) {
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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files || []))
  }

  function removeFile(i: number) {
    setRequestFiles(prev => prev.filter((_, idx) => idx !== i))
    setRequestFilePreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleInlinePanelSubmit() {
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
      for (const path of keepExistingImages) {
        formData.append('keepPath', path)
      }
      for (const file of requestFiles) {
        formData.append('images', file)
      }
      const res = await fetch(`/api/posts/${selectedPost.id}/request-changes`, {
        method: 'PATCH',
        body: formData,
      })
      if (res.ok) {
        const updated: Post = await res.json()
        const orig = posts.find(p => p.id === selectedPost.id)
        const merged: Post = { ...updated, images: orig?.images ?? selectedPost.images ?? [], client: orig?.client ?? selectedPost.client }
        onPostUpdated(merged)

        // Post a comment for visibility in SMM view
        await fetch(`/api/posts/${selectedPost.id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: requestNote.trim() }),
        })

        setActiveTab('changes')
        setSelectedPost(merged)
        resetInlineForm()
      }
    } finally {
      setSubmittingRequest(false)
    }
  }

  // Build image list for detail panel
  const panelImages = selectedPost
    ? (selectedPost.images && selectedPost.images.length > 0
        ? [...selectedPost.images].sort((a, b) => a.position - b.position)
        : selectedPost.image_path
          ? [{ id: 'single', path: selectedPost.image_path, post_id: selectedPost.id, position: 0, created_at: '' }]
          : [])
    : []
  const currentImageUrl = panelImages[carouselIndex] ? getImageUrl(panelImages[carouselIndex].path) : null
  const isSelectedAwaiting = selectedPost && selectedPost.status === 'To Be Confirmed'

  const tabBase = isDark
    ? 'text-gray-500 hover:text-gray-300'
    : 'text-gray-500 hover:text-gray-700'
  const tabActive = isDark
    ? 'bg-white/10 text-white'
    : 'bg-white text-gray-900 shadow-sm'

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Status tabs */}
      <div className={`flex gap-1 mb-6 p-1 rounded-xl w-fit flex-wrap ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
        {TABS.map(tab => {
          const count = getTabPosts(tab.key).length
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive ? tabActive : tabBase
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                isActive
                  ? isDark ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-700'
                  : isDark ? 'bg-white/5 text-gray-500' : 'bg-gray-200/60 text-gray-500'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Posts grid */}
      {getTabPosts(activeTab).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#374151' : '#9ca3af'} strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <p className={`font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No posts here yet</p>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Your content team is working on it</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {getTabPosts(activeTab).map(post => (
            <ClientPostCard
              key={post.id}
              post={post}
              theme={theme}
              onClick={() => openPost(post)}
              onApprove={readOnly ? undefined : handleCardApprove}
              onRequestChanges={readOnly ? undefined : openRequestModal}
              approvingId={approvingId}
            />
          ))}
        </div>
      )}

      {/* ── Detail panel overlay ─────────────────────────────── */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => { setSelectedPost(null); resetInlineForm() }}
        >
          <div
            className={`relative w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col sm:flex-row ${
              isDark ? 'bg-[#0d1425] border border-white/[0.08]' : 'bg-white shadow-2xl'
            }`}
            style={{ maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => { setSelectedPost(null); resetInlineForm() }}
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
              className="relative flex-shrink-0 w-full sm:w-72 bg-black sm:aspect-auto sm:min-h-[400px] overflow-hidden"
              style={{ aspectRatio: aspectRatioToCSS(getAspectRatioForPost(selectedPost.format || '', (selectedPost.platform || '').split(' + ').filter(Boolean))) }}
            >
              {currentImageUrl ? (
                <img src={currentImageUrl} alt="Post" className="w-full h-full object-contain" />
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
                          className={`rounded-full transition-all ${
                            i === carouselIndex ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/30'
                          }`}
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
              {/* Meta */}
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

              {/* Show change request note + images in panel if present */}
              {selectedPost.change_request_note && !showInlineRequest && (selectedPost.status === 'Requested Changes' || (selectedPost.status === 'Being Created' && !selectedPost.change_request_fixed)) && (
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-1.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Your Change Request</p>
                  <p className={`text-sm leading-relaxed mb-2 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>{selectedPost.change_request_note}</p>
                  {selectedPost.change_request_images && selectedPost.change_request_images.length > 0 && (
                    <div className="flex gap-3 flex-wrap">
                      {selectedPost.change_request_images.map((path, i) => {
                        const url = getImageUrl(path)
                        if (!url) return null
                        return (
                          <button
                            key={i}
                            onClick={() => setLightboxUrl(url)}
                            className="focus:outline-none"
                          >
                            <img
                              src={url}
                              alt={`Reference ${i + 1}`}
                              className="w-24 h-24 object-cover rounded-lg border border-amber-300/50 hover:opacity-80 transition-opacity cursor-pointer"
                            />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Request fixed badge */}
              {selectedPost.change_request_fixed === true && selectedPost.change_request_note && (
                <div className={`p-3 rounded-xl border flex items-center gap-2 ${isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#4ade80' : '#16a34a'} strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <p className={`text-xs font-semibold ${isDark ? 'text-green-400' : 'text-green-700'}`}>Request fixed ✓ — being updated</p>
                </div>
              )}

              {/* Actions + inline request form */}
              <div className="mt-auto pt-2 flex flex-col gap-2">
                {readOnly && (
                  <div className={`w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 ${
                    isDark ? 'bg-white/5 border border-white/10 text-gray-500' : 'bg-gray-100 border border-gray-200 text-gray-400'
                  }`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    Manager preview — read only
                  </div>
                )}
                {!readOnly && isSelectedAwaiting && !showInlineRequest && (
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
                      onClick={() => {
                        setRequestNote('')
                        setKeepExistingImages([])
                        setShowInlineRequest(true)
                      }}
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

                {!readOnly && selectedPost.status === 'Requested Changes' && !showInlineRequest && (
                  <>
                    <div className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${
                      isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-700'
                    }`}>
                      Changes requested
                    </div>
                    <button
                      onClick={() => {
                        setRequestNote(selectedPost.change_request_note || '')
                        setKeepExistingImages(selectedPost.change_request_images || [])
                        setShowInlineRequest(true)
                      }}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                        isDark
                          ? 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
                          : 'bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Edit request
                    </button>
                  </>
                )}

                {/* ── Inline request changes form ── */}
                {showInlineRequest && (
                  <div className={`rounded-xl border p-4 flex flex-col gap-3 ${
                    isDark ? 'bg-white/[0.03] border-white/10' : 'bg-amber-50 border-amber-200'
                  }`}>
                    <p className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-amber-700'}`}>
                      Request Changes
                    </p>

                    {/* Note textarea */}
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
                        } ${requestNoteError ? '!border-red-400' : ''}`}
                      />
                      {requestNoteError && <p className="text-xs text-red-400 mt-1">{requestNoteError}</p>}
                    </div>

                    {/* Existing images (edit mode) — shown with remove option */}
                    {keepExistingImages.length > 0 && (
                      <div>
                        <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${isDark ? 'text-gray-500' : 'text-amber-600'}`}>
                          Current images
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {keepExistingImages.map((path, i) => {
                            const url = getImageUrl(path)
                            if (!url) return null
                            return (
                              <div key={i} className="relative">
                                <button
                                  onClick={() => setLightboxUrl(url)}
                                  className="focus:outline-none"
                                >
                                  <img
                                    src={url}
                                    alt={`Existing ${i + 1}`}
                                    className="w-14 h-14 object-cover rounded-lg border border-amber-200 hover:opacity-80 transition-opacity cursor-pointer"
                                  />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setKeepExistingImages(prev => prev.filter((_, idx) => idx !== i)) }}
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold hover:bg-red-600"
                                >
                                  ×
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* New image upload */}
                    <div>
                      <label
                        onDragOver={e => { e.preventDefault(); setUploadDragActive(true) }}
                        onDragEnter={e => { e.preventDefault(); setUploadDragActive(true) }}
                        onDragLeave={e => { e.preventDefault(); setUploadDragActive(false) }}
                        onDrop={e => { e.preventDefault(); setUploadDragActive(false); addFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))) }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors text-xs font-medium ${
                          uploadDragActive
                            ? 'border-amber-400 bg-amber-50 text-amber-600'
                            : isDark
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
                              <img src={src} alt={`Preview ${i + 1}`} className="w-14 h-14 object-cover rounded-lg border border-white/10" />
                              <button
                                onClick={() => removeFile(i)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold hover:bg-red-600"
                              >×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Submit / Cancel */}
                    <div className="flex gap-2">
                      <button
                        onClick={resetInlineForm}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                          isDark
                            ? 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
                            : 'bg-white border border-amber-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleInlinePanelSubmit}
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

      {/* ── Lightbox overlay ─────────────────────────────────── */}
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
