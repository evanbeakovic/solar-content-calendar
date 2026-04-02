'use client'

import { useState, useRef } from 'react'
import { Client, Post, PostImage, PostStatus } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { validateUpload, POST_FORMATS } from '@/lib/postFormats'

interface EditPostModalProps {
  post: Post
  clients: Client[]
  onClose: () => void
  onUpdated: (post: Post) => void
  onDeleted: (postId: string) => void
  onDuplicated?: (post: Post) => void
}

const PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn', 'Twitter', 'TikTok', 'YouTube']
const FORMATS = ['Post', 'Carousel', 'Story', 'Reel', 'Video', 'Thumbnail', 'Short']
const STATUSES: PostStatus[] = ['Uploads', 'Being Created', 'To Be Confirmed', 'Requested Changes', 'Confirmed', 'Scheduled', 'Posted']

function getPlatformLabel(platforms: string[], format: string): string {
  if (platforms.length === 0) return ''
  return `${platforms.join(' + ')} ${format}`
}

export default function EditPostModal({ post, clients, onClose, onUpdated, onDeleted, onDuplicated }: EditPostModalProps) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const youtubeThumbnailInputRef = useRef<HTMLInputElement>(null)
  const pendingFilesRef = useRef<File[] | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingYoutubeThumbnail, setUploadingYoutubeThumbnail] = useState(false)
  const [error, setError] = useState('')
  const [showHeaderMenu, setShowHeaderMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showUnsavedChanges, setShowUnsavedChanges] = useState(false)
  const [resolutionWarning, setResolutionWarning] = useState<string | null>(null)
  const [validationPopup, setValidationPopup] = useState<{
    incompatiblePlatforms: string[]
    suggestedFormats: string[]
    selectedSuggestedFormat: string
  } | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [ytDragActive, setYtDragActive] = useState(false)
  const [showFormatDropdown, setShowFormatDropdown] = useState(false)

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
  const [youtubeThumbnailPath, setYoutubeThumbnailPath] = useState<string | null>(post.youtube_thumbnail_path || null)
  const [originalYoutubeThumbnailPath] = useState<string | null>(post.youtube_thumbnail_path || null)

  const isVideo = form.format === 'Reel' || form.format === 'Video'
  const isCarousel = form.format === 'Carousel'
  const isStory = form.format === 'Story'
  const isMulti = isCarousel || isStory
  const acceptAttr = isVideo ? 'video/*' : 'image/*'

  const isDirty =
    JSON.stringify(form) !== JSON.stringify(originalForm) ||
    JSON.stringify([...selectedPlatforms].sort()) !== JSON.stringify([...originalPlatforms].sort()) ||
    youtubeThumbnailPath !== originalYoutubeThumbnailPath

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

  function getDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise(resolve => {
      if (file.type.startsWith('video/')) {
        const video = document.createElement('video')
        video.onloadedmetadata = () => {
          resolve({ width: video.videoWidth, height: video.videoHeight })
          URL.revokeObjectURL(video.src)
        }
        video.src = URL.createObjectURL(file)
      } else {
        const img = new window.Image()
        img.onload = () => {
          resolve({ width: img.naturalWidth, height: img.naturalHeight })
          URL.revokeObjectURL(img.src)
        }
        img.src = URL.createObjectURL(file)
      }
    })
  }

  async function doUpload(files: File[]) {
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

  async function processImageFiles(files: File[]) {
    const MAX_SIZE = 50 * 1024 * 1024
    const oversized = files.filter(f => f.size > MAX_SIZE)
    const validFiles = files.filter(f => f.size <= MAX_SIZE)

    if (oversized.length > 0) {
      setError(`These files exceed 50MB: ${oversized.map(f => f.name).join(', ')}`)
    } else {
      setError('')
    }

    if (validFiles.length === 0) return

    if (form.format && selectedPlatforms.length > 0) {
      const { width, height } = await getDimensions(validFiles[0])
      const result = validateUpload(width, height, isVideo, form.format, selectedPlatforms)

      if (result.belowMinResolution) {
        setResolutionWarning(`Low resolution (${width}×${height}px) — image may be rejected by some platforms.`)
      } else {
        setResolutionWarning(null)
      }

      if (result.incompatiblePlatforms.length > 0) {
        setSelectedPlatforms(prev => prev.filter(p => !result.incompatiblePlatforms.includes(p)))
        pendingFilesRef.current = validFiles
        setValidationPopup({
          incompatiblePlatforms: result.incompatiblePlatforms,
          suggestedFormats: result.suggestedFormats,
          selectedSuggestedFormat: '',
        })
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
    }

    await doUpload(validFiles)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const allFiles = isMulti
      ? Array.from(e.target.files || [])
      : [e.target.files?.[0]].filter(Boolean) as File[]
    if (allFiles.length === 0) return
    await processImageFiles(allFiles)
  }

  async function processYoutubeThumbnailFile(file: File) {
    if (file.size > 50 * 1024 * 1024) {
      setError('Thumbnail file exceeds 50MB limit')
      return
    }
    setUploadingYoutubeThumbnail(true)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${post.client_id}/${post.id}/youtube_thumbnail.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(path, file, { upsert: true })
    if (uploadError) {
      setError(`Failed to upload thumbnail: ${uploadError.message}`)
    } else {
      setYoutubeThumbnailPath(path)
    }
    setUploadingYoutubeThumbnail(false)
  }

  async function handleYoutubeThumbnailUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await processYoutubeThumbnailFile(file)
    if (youtubeThumbnailInputRef.current) youtubeThumbnailInputRef.current.value = ''
  }

  // Bug G: filter formats to only those compatible with selected platforms
  function getAvailableFormats(): string[] {
    if (selectedPlatforms.length === 0) return FORMATS
    const available = new Set<string>()
    for (const rule of POST_FORMATS) {
      if (rule.platforms.some(p => selectedPlatforms.includes(p))) {
        available.add(rule.format)
      }
    }
    return FORMATS.filter(f => available.has(f))
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
        youtube_thumbnail_path: youtubeThumbnailPath,
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

  function downloadImage(url: string) {
    const a = document.createElement('a')
    a.href = url
    a.download = url.split('/').pop() || 'image'
    a.target = '_blank'
    a.click()
  }

  const imageUrl = getImageUrl(currentImagePath)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-700">

        {/* Sticky header */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Post</h2>
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
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
                  <div className="absolute top-full mt-1 right-0 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 py-1.5 overflow-hidden">
                    <button
                      onClick={handleDuplicate}
                      disabled={loading}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2"/>
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                      </svg>
                      {loading ? 'Duplicating...' : 'Duplicate'}
                    </button>
                    <div className="border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
                      {!showDeleteConfirm ? (
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
                              className="flex-1 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
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
            <button onClick={requestClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable form */}
        <div className="overflow-y-auto flex-1">
          <form ref={formRef} id="edit-post-form" onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* Image Upload — Bug C, D, E, F, G */}
            <div>
              {/* Format subheading as dropdown trigger (Bug D) */}
              <div className="flex items-center gap-2 mb-2 relative">
                <button
                  type="button"
                  onClick={() => setShowFormatDropdown(v => !v)}
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  {form.format || 'Select Format'}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    className={`transition-transform ${showFormatDropdown ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {(isCarousel || isStory) && (
                  <span className="text-xs text-gray-400">{localImages.length} uploaded</span>
                )}
                {showFormatDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowFormatDropdown(false)} />
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20 min-w-[120px]">
                      {getAvailableFormats().map(f => (
                        <button
                          key={f}
                          type="button"
                          disabled={f === 'Post' && localImages.length > 1}
                          onClick={() => {
                            if (f === 'Post' && localImages.length > 1) return
                            handleChange('format', f)
                            setShowFormatDropdown(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                            form.format === f ? 'text-[#10375C] font-semibold bg-[#10375C]/5' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          } ${f === 'Post' && localImages.length > 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {form.format === 'Post' && localImages.length > 1 && (
                <p className="text-xs text-red-500 mb-2">Post format only supports 1 image. Please remove extra images first.</p>
              )}

              {isMulti ? (
                <div className={`grid gap-2 ${isStory ? 'grid-cols-5' : 'grid-cols-4'}`}>
                  {localImages.map((img, idx) => {
                    const url = getImageUrl(img.path)
                    return (
                      <div
                        key={img.id}
                        className={`relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 group ${
                          isStory ? 'aspect-[9/16]' : 'aspect-square'
                        }`}
                      >
                        {url && (
                          <img
                            src={url}
                            alt={`Image ${idx + 1}`}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setLightboxUrl(url)}
                          />
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
                  {/* Add slot with drag-and-drop (Bug D placeholder + Bug F drag) */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragActive(true) }}
                    onDragEnter={e => { e.preventDefault(); setDragActive(true) }}
                    onDragLeave={e => { e.preventDefault(); setDragActive(false) }}
                    onDrop={async e => {
                      e.preventDefault()
                      setDragActive(false)
                      const files = Array.from(e.dataTransfer.files)
                      if (files.length > 0) await processImageFiles(files)
                    }}
                    className={`rounded-xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      isStory ? 'aspect-[9/16]' : 'aspect-square'
                    } ${dragActive ? 'border-[#10375C] bg-[#10375C]/5 text-[#10375C]' : 'border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-[#10375C] hover:text-[#10375C]'}`}
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
                /* Single image/video — Bug C natural ratio + delete overlay + lightbox, Bug D placeholder, Bug F drag */
                <div
                  onDragOver={e => { e.preventDefault(); setDragActive(true) }}
                  onDragEnter={e => { e.preventDefault(); setDragActive(true) }}
                  onDragLeave={e => { e.preventDefault(); setDragActive(false) }}
                  onDrop={async e => {
                    e.preventDefault()
                    setDragActive(false)
                    const files = Array.from(e.dataTransfer.files)
                    if (files.length > 0) await processImageFiles([files[0]])
                  }}
                  className={`rounded-xl border-2 border-dashed transition-colors overflow-hidden ${
                    dragActive ? 'border-[#10375C] bg-[#10375C]/5' : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {imageUrl ? (
                    <div className="relative group">
                      {/* Natural aspect ratio thumbnail (Bug C) */}
                      <img
                        src={imageUrl}
                        alt="Post image"
                        className="w-full h-auto object-contain max-h-64 cursor-pointer"
                        onClick={() => setLightboxUrl(imageUrl)}
                      />
                      {/* Delete button overlay (Bug C) */}
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); handleRemoveAllImages() }}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        ×
                      </button>
                      {/* Replace button (Bug C) */}
                      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                          className="bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-lg"
                        >
                          Replace
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Empty placeholder — Bug D: + icon + "Add" */
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="h-32 flex flex-col items-center justify-center gap-2 cursor-pointer text-gray-400 hover:text-[#10375C] transition-colors"
                    >
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
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          <span className="text-sm">Add</span>
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

              {resolutionWarning && (
                <div className="mt-2 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <p className="text-xs text-amber-700 dark:text-amber-300">{resolutionWarning}</p>
                </div>
              )}
            </div>

            {/* YouTube Thumbnail — Bug F drag-and-drop added */}
            {selectedPlatforms.includes('YouTube') && (form.format === 'Video' || form.format === 'Thumbnail') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">YouTube Thumbnail</label>
                <div
                  onDragOver={e => { e.preventDefault(); setYtDragActive(true) }}
                  onDragEnter={e => { e.preventDefault(); setYtDragActive(true) }}
                  onDragLeave={e => { e.preventDefault(); setYtDragActive(false) }}
                  onDrop={async e => {
                    e.preventDefault()
                    setYtDragActive(false)
                    const files = Array.from(e.dataTransfer.files)
                    const file = files.find(f => f.type.startsWith('image/'))
                    if (file) await processYoutubeThumbnailFile(file)
                  }}
                  className={`rounded-xl border-2 border-dashed transition-colors overflow-hidden ${
                    ytDragActive ? 'border-[#10375C] bg-[#10375C]/5' : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {youtubeThumbnailPath ? (
                    <div className="relative group">
                      <img
                        src={`https://lnxrnvypvyxykofgiael.supabase.co/storage/v1/object/public/post-images/${youtubeThumbnailPath}`}
                        alt="YouTube thumbnail"
                        className="w-full h-auto object-contain max-h-48 cursor-pointer"
                        onClick={() => setLightboxUrl(`https://lnxrnvypvyxykofgiael.supabase.co/storage/v1/object/public/post-images/${youtubeThumbnailPath}`)}
                      />
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setYoutubeThumbnailPath(null) }}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); youtubeThumbnailInputRef.current?.click() }}
                          className="bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-lg"
                        >
                          Replace
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => youtubeThumbnailInputRef.current?.click()}
                      className="h-32 flex flex-col items-center justify-center gap-2 cursor-pointer text-gray-400 hover:text-[#10375C] transition-colors"
                    >
                      {uploadingYoutubeThumbnail ? (
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
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          <span className="text-sm">Add</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <input
                  ref={youtubeThumbnailInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleYoutubeThumbnailUpload}
                  className="hidden"
                />
              </div>
            )}

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Client */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Client</label>
              <select value={form.client_id} onChange={(e) => handleChange('client_id', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </div>

            {/* Platforms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Platform</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <label key={p} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.includes(p)}
                      onChange={() => togglePlatform(p)}
                      className="w-4 h-4 rounded accent-[#10375C]"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{p}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Scheduled Date (Bug D: format select removed — now handled by subheading dropdown above) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Scheduled Date</label>
              <input type="date" value={form.scheduled_date} onChange={(e) => handleChange('scheduled_date', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" />
            </div>

            {/* Content Pillar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Content Pillar</label>
              <input type="text" value={form.content_pillar} onChange={(e) => handleChange('content_pillar', e.target.value)}
                placeholder="e.g. Education, Promotion"
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" />
            </div>

            {/* Headline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Headline</label>
              <input type="text" value={form.headline} onChange={(e) => handleChange('headline', e.target.value)}
                placeholder="Post headline..."
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" />
            </div>

            {/* Body Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Body Text</label>
              <textarea value={form.body_text} onChange={(e) => handleChange('body_text', e.target.value)}
                placeholder="Main body content..." rows={3}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 resize-none" />
            </div>

            {/* CTA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Call to Action</label>
              <input type="text" value={form.cta} onChange={(e) => handleChange('cta', e.target.value)}
                placeholder="e.g. Shop Now, Learn More, Book Today"
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" />
            </div>

            {/* Caption */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Caption</label>
              <textarea value={form.caption} onChange={(e) => handleChange('caption', e.target.value)}
                placeholder="Social media caption..." rows={3}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 resize-none" />
            </div>

            {/* Hashtags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Hashtags</label>
              <input type="text" value={form.hashtags} onChange={(e) => handleChange('hashtags', e.target.value)}
                placeholder="#brand #marketing"
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" />
            </div>

            {/* Row: Background Color + Visual Direction */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Background Color</label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer flex-shrink-0 relative overflow-hidden"
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
                    className="flex-1 px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 font-mono text-sm"
                    placeholder="#ffffff"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Type a hex code or click the swatch to pick</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Visual Direction</label>
                <input type="text" value={form.visual_direction} onChange={(e) => handleChange('visual_direction', e.target.value)}
                  placeholder="Visual style notes..."
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" />
              </div>
            </div>
          </form>
        </div>

        {/* Sticky footer — always visible Save button */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-6 py-4 rounded-b-2xl bg-white dark:bg-gray-900">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-3">{error}</div>
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

      {/* Lightbox (Bug C) */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => downloadImage(lightboxUrl)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              title="Download"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
            </button>
            <button
              onClick={() => setLightboxUrl(null)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              title="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <img
            src={lightboxUrl}
            alt="Full size preview"
            className="max-w-full max-h-full object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Validation popup — incompatible aspect ratio */}
      {validationPopup && (
        <div className="absolute inset-0 flex items-center justify-center z-60 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Incompatible aspect ratio</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This file&apos;s aspect ratio is not compatible with{' '}
              <span className="font-semibold text-gray-900 dark:text-white">{validationPopup.incompatiblePlatforms.join(', ')}</span>.
              {' '}These platforms have been automatically removed.
            </p>
            {validationPopup.suggestedFormats.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Switch to a compatible format?</label>
                <select
                  value={validationPopup.selectedSuggestedFormat}
                  onChange={e => setValidationPopup(prev => prev ? { ...prev, selectedSuggestedFormat: e.target.value } : null)}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#10375C]"
                >
                  <option value="">— Keep current format ({form.format}) —</option>
                  {validationPopup.suggestedFormats.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (validationPopup.selectedSuggestedFormat) {
                    handleChange('format', validationPopup.selectedSuggestedFormat)
                  }
                  setValidationPopup(null)
                  const files = pendingFilesRef.current
                  pendingFilesRef.current = null
                  if (files) doUpload(files)
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#10375C] text-white font-semibold hover:bg-[#0d2d4a] transition-all text-sm"
              >
                {validationPopup.selectedSuggestedFormat ? 'Change & continue' : 'OK, continue'}
              </button>
              <button
                onClick={() => { setValidationPopup(null); pendingFilesRef.current = null }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm"
              >
                Cancel upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved changes popup */}
      {showUnsavedChanges && (
        <div className="absolute inset-0 flex items-center justify-center z-60 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Unsaved changes</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">You have unsaved changes. Would you like to save or discard them?</p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm"
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
