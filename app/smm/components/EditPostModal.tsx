'use client'

import { useState, useRef } from 'react'
import { Client, Post, PostImage, PostStatus } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface EditPostModalProps {
  post: Post
  clients: Client[]
  onClose: () => void
  onUpdated: (post: Post) => void
  onDeleted: (postId: string) => void
  onDuplicated?: (post: Post) => void
}

const PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn', 'Twitter', 'TikTok']
const FORMATS = ['Post', 'Carousel', 'Story', 'Reel', 'Video']
const STATUSES: PostStatus[] = ['Uploads', 'Being Created', 'To Be Confirmed', 'Requested Changes', 'Confirmed', 'Scheduled', 'Posted']

function getPlatformLabel(platforms: string[], format: string): string {
  if (platforms.length === 0) return ''
  return `${platforms.join(' + ')} ${format}`
}

export default function EditPostModal({ post, clients, onClose, onUpdated, onDeleted, onDuplicated }: EditPostModalProps) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState('')
  const [showHeaderMenu, setShowHeaderMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showUnsavedChanges, setShowUnsavedChanges] = useState(false)

  const [localImages, setLocalImages] = useState<PostImage[]>(
    (post.images || []).sort((a, b) => a.position - b.position)
  )

  const initialPlatforms = post.platform ? post.platform.split(' + ') : ['Instagram', 'Facebook']
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(initialPlatforms)

  const initialFormValues = {
    client_id: post.client_id,
    scheduled_date: post.scheduled_date || '',
    format: post.format || '',
    content_pillar: post.content_pillar || '',
    headline: post.headline || '',
    body_text: post.body_text || '',
    cta: post.cta || '',
    caption: post.caption || '',
    hashtags: post.hashtags || '',
    background_color: post.background_color || '#ffffff',
    visual_direction: post.visual_direction || '',
    status: post.status,
  }

  const [form, setForm] = useState(initialFormValues)
  // Snapshot for dirty detection — never mutated
  const [originalForm] = useState({ ...initialFormValues })
  const [originalPlatforms] = useState([...initialPlatforms])

  const [currentImagePath, setCurrentImagePath] = useState(post.image_path)

  const isVideo = form.format === 'Reel' || form.format === 'Video'
  const isCarousel = form.format === 'Carousel'
  const isStory = form.format === 'Story'
  const isMulti = isCarousel || isStory
  const acceptAttr = isVideo ? 'video/*' : 'image/*'

  const isDirty =
    JSON.stringify(form) !== JSON.stringify(originalForm) ||
    JSON.stringify([...selectedPlatforms].sort()) !== JSON.stringify([...originalPlatforms].sort())

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function togglePlatform(p: string) {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  const getImageUrl = (path: string | null) => {
    if (!path) return null
    const { data } = supabase.storage.from('post-images').getPublicUrl(path)
    return data.publicUrl
  }

  function requestClose() {
    if (isDirty) {
      setShowUnsavedChanges(true)
    } else {
      onClose()
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const allFiles = isMulti
      ? Array.from(e.target.files || [])
      : [e.target.files?.[0]].filter(Boolean) as File[]
    if (allFiles.length === 0) return

    const MAX_SIZE = 50 * 1024 * 1024
    const oversized = allFiles.filter(f => f.size > MAX_SIZE)
    const files = allFiles.filter(f => f.size <= MAX_SIZE)

    if (oversized.length > 0) {
      setError(`These files exceed 50MB: ${oversized.map(f => f.name).join(', ')}`)
    } else {
      setError('')
    }

    if (files.length === 0) return

    setUploadingImage(true)

    if (!isMulti && localImages.length > 0) {
      const existingImageId = localImages[0].id
      await fetch(`/api/posts/${post.id}/image`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: existingImageId }),
      })
      setLocalImages([])
      setCurrentImagePath(null)
    }

    const formData = new FormData()
    files.forEach(file => formData.append('file', file))

    const response = await fetch(`/api/posts/${post.id}/image`, {
      method: 'POST',
      body: formData,
    })

    if (response.ok) {
      const data = await response.json()
      if (data.images && data.images.length > 0) {
        setLocalImages(prev => [...prev, ...data.images].sort((a, b) => a.position - b.position))
        setCurrentImagePath(data.images[0].path)
      }
    } else {
      const data = await response.json()
      setError(data.error || 'Failed to upload file')
    }
    setUploadingImage(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleRemoveImage(imageId: string) {
    const res = await fetch(`/api/posts/${post.id}/image`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageId }),
    })
    if (res.ok) {
      const updated = localImages.filter(img => img.id !== imageId)
      setLocalImages(updated)
      setCurrentImagePath(updated.length > 0 ? updated[0].path : null)
    }
  }

  async function handleRemoveAllImages() {
    const res = await fetch(`/api/posts/${post.id}/image`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageId: 'all' }),
    })
    if (res.ok) {
      setLocalImages([])
      setCurrentImagePath(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const response = await fetch(`/api/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        platform: selectedPlatforms.join(' + '),
        scheduled_date: form.scheduled_date || null,
        image_path: currentImagePath,
      }),
    })

    if (response.ok) {
      const updatedPost = await response.json()
      onUpdated({ ...updatedPost, image_path: currentImagePath, images: localImages })
    } else {
      const data = await response.json()
      setError(data.error || 'Failed to update post')
    }
    setLoading(false)
  }

  async function handleDelete() {
    if (!showDeleteConfirm) { setShowDeleteConfirm(true); return }
    const response = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' })
    if (response.ok) onDeleted(post.id)
  }

  async function handleDuplicate() {
    setLoading(true)
    setError('')
    setShowHeaderMenu(false)
    const response = await fetch(`/api/posts/${post.id}/duplicate`, { method: 'POST' })
    if (response.ok) {
      const newPost = await response.json()
      onDuplicated?.(newPost)
      onClose()
    } else {
      const data = await response.json()
      setError(data.error || 'Failed to duplicate post')
    }
    setLoading(false)
  }

  const imageUrl = getImageUrl(currentImagePath)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Sticky header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit Post</h2>
            {selectedPlatforms.length > 0 && form.format ? (
              <p className="text-xs text-[#10375C] font-semibold mt-0.5">
                {getPlatformLabel(selectedPlatforms, form.format)}
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">{post.client?.name || 'Unknown Client'}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Three-dot menu */}
            <div className="relative">
              <button
                onClick={() => { setShowHeaderMenu(v => !v); setShowDeleteConfirm(false) }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.5"/>
                  <circle cx="12" cy="12" r="1.5"/>
                  <circle cx="12" cy="19" r="1.5"/>
                </svg>
              </button>
              {showHeaderMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowHeaderMenu(false)} />
                  <div className="absolute top-full mt-1 right-0 w-44 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 py-1.5 overflow-hidden">
                    <button
                      onClick={handleDuplicate}
                      disabled={loading}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2"/>
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                      </svg>
                      {loading ? 'Duplicating...' : 'Duplicate'}
                    </button>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      {!showDeleteConfirm ? (
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                          </svg>
                          Delete post
                        </button>
                      ) : (
                        <div className="px-3 py-2">
                          <p className="text-xs font-semibold text-red-600 mb-2">Delete this post?</p>
                          <div className="flex gap-1.5">
                            <button
                              onClick={handleDelete}
                              className="flex-1 py-1.5 text-xs rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-all"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(false)}
                              className="flex-1 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Close button */}
            <button onClick={requestClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable form */}
        <div className="overflow-y-auto flex-1">
          <form ref={formRef} id="edit-post-form" onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isVideo
                  ? 'Video'
                  : isCarousel
                  ? `Carousel Images (${localImages.length} uploaded)`
                  : isStory
                  ? `Stories (${localImages.length} uploaded)`
                  : 'Image'}
              </label>

              {isMulti ? (
                <div className={`grid gap-2 ${isStory ? 'grid-cols-5' : 'grid-cols-4'}`}>
                  {localImages.map((img, idx) => {
                    const url = getImageUrl(img.path)
                    return (
                      <div
                        key={img.id}
                        className={`relative rounded-xl overflow-hidden bg-gray-100 group ${
                          isStory ? 'aspect-[9/16]' : 'aspect-square'
                        }`}
                      >
                        {url && (
                          <img src={url} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(img.id)}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`rounded-xl border-2 border-dashed border-gray-200 hover:border-[#10375C] transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-[#10375C] ${
                      isStory ? 'aspect-[9/16]' : 'aspect-square'
                    }`}
                  >
                    {uploadingImage ? (
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        <span className="text-xs font-medium">Add</span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative cursor-pointer rounded-xl border-2 border-dashed border-gray-200 hover:border-[#10375C] transition-colors overflow-hidden"
                >
                  {imageUrl ? (
                    <div className="relative h-48">
                      <Image src={imageUrl} alt="Post image" fill className="object-cover" />
                      <div className="absolute bottom-2 right-2 flex items-center gap-2">
                        <span className="bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-lg">
                          Click to change
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemoveAllImages() }}
                          className="bg-red-600 bg-opacity-80 hover:bg-opacity-100 text-white text-xs px-2 py-1 rounded-lg transition-all"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 flex flex-col items-center justify-center gap-2 text-gray-400">
                      {uploadingImage ? (
                        <>
                          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          <span className="text-sm">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                          </svg>
                          <span className="text-sm">
                            {isVideo ? 'Click to upload video' : 'Click to upload image'}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={acceptAttr}
                multiple={isMulti}
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 bg-white">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Client */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Client</label>
              <select value={form.client_id} onChange={(e) => handleChange('client_id', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 bg-white">
                {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </div>

            {/* Platforms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <label key={p} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.includes(p)}
                      onChange={() => togglePlatform(p)}
                      className="w-4 h-4 rounded accent-[#10375C]"
                    />
                    <span className="text-sm text-gray-700">{p}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Row: Date + Format */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Scheduled Date</label>
                <input type="date" value={form.scheduled_date} onChange={(e) => handleChange('scheduled_date', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Format</label>
                <select
                  value={form.format}
                  onChange={(e) => {
                    const newFormat = e.target.value
                    if (newFormat === 'Post' && localImages.length > 1) return
                    handleChange('format', newFormat)
                  }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 bg-white"
                >
                  <option value="">Select format...</option>
                  {FORMATS.map(f => (
                    <option
                      key={f}
                      value={f}
                      disabled={f === 'Post' && localImages.length > 1}
                    >
                      {f}{f === 'Post' && localImages.length > 1 ? ' — remove extra images first' : ''}
                    </option>
                  ))}
                </select>
                {form.format === 'Post' && localImages.length > 1 && (
                  <p className="text-xs text-red-500 mt-1">Post format only supports 1 image. Please remove extra images first.</p>
                )}
              </div>
            </div>

            {/* Content Pillar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Content Pillar</label>
              <input type="text" value={form.content_pillar} onChange={(e) => handleChange('content_pillar', e.target.value)}
                placeholder="e.g. Education, Promotion"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900" />
            </div>

            {/* Headline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Headline</label>
              <input type="text" value={form.headline} onChange={(e) => handleChange('headline', e.target.value)}
                placeholder="Post headline..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900" />
            </div>

            {/* Body Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Body Text</label>
              <textarea value={form.body_text} onChange={(e) => handleChange('body_text', e.target.value)}
                placeholder="Main body content..." rows={3}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 resize-none" />
            </div>

            {/* CTA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Call to Action</label>
              <input type="text" value={form.cta} onChange={(e) => handleChange('cta', e.target.value)}
                placeholder="e.g. Shop Now, Learn More, Book Today"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900" />
            </div>

            {/* Caption */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Caption</label>
              <textarea value={form.caption} onChange={(e) => handleChange('caption', e.target.value)}
                placeholder="Social media caption..." rows={3}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 resize-none" />
            </div>

            {/* Hashtags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Hashtags</label>
              <input type="text" value={form.hashtags} onChange={(e) => handleChange('hashtags', e.target.value)}
                placeholder="#brand #marketing"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900" />
            </div>

            {/* Row: Background Color + Visual Direction */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Background Color</label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer flex-shrink-0 relative overflow-hidden"
                    style={{ backgroundColor: form.background_color }}
                  >
                    <input
                      type="color"
                      value={form.background_color}
                      onChange={(e) => handleChange('background_color', e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <input
                    type="text"
                    value={form.background_color}
                    onChange={(e) => handleChange('background_color', e.target.value)}
                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 font-mono text-sm"
                    placeholder="#ffffff"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Type a hex code or click the swatch to pick</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Visual Direction</label>
                <input type="text" value={form.visual_direction} onChange={(e) => handleChange('visual_direction', e.target.value)}
                  placeholder="Visual style notes..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900" />
              </div>
            </div>
          </form>
        </div>

        {/* Sticky footer — always visible Save button */}
        <div className="flex-shrink-0 border-t border-gray-100 px-6 py-4 rounded-b-2xl bg-white">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-3">{error}</div>
          )}
          <button
            type="submit"
            form="edit-post-form"
            disabled={loading}
            className="w-full px-6 py-2.5 rounded-xl bg-[#10375C] text-white font-semibold hover:bg-[#0d2d4a] transition-all disabled:opacity-50 shadow-lg shadow-[#10375C]/20"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Unsaved changes popup */}
      {showUnsavedChanges && (
        <div className="absolute inset-0 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-base font-bold text-gray-900 mb-1">Unsaved changes</h3>
            <p className="text-sm text-gray-500 mb-5">You have unsaved changes. Would you like to save or discard them?</p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all text-sm"
              >
                Discard
              </button>
              <button
                onClick={() => { setShowUnsavedChanges(false); formRef.current?.requestSubmit() }}
                className="flex-1 py-2.5 rounded-xl bg-[#10375C] text-white font-semibold hover:bg-[#0d2d4a] transition-all text-sm shadow-lg shadow-[#10375C]/20"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
