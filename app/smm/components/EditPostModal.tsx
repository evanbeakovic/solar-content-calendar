'use client'

import { useState, useRef } from 'react'
import { Client, Post, PostStatus } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface EditPostModalProps {
  post: Post
  clients: Client[]
  onClose: () => void
  onUpdated: (post: Post) => void
  onDeleted: (postId: string) => void
}

const PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn', 'Twitter', 'TikTok']
const FORMATS = ['Single Image', 'Carousel', 'Story', 'Reel', 'Video']
const STATUSES: PostStatus[] = ['To Be Confirmed', 'Being Created', 'Confirmed', 'Scheduled', 'Posted']

export default function EditPostModal({ post, clients, onClose, onUpdated, onDeleted }: EditPostModalProps) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [form, setForm] = useState({
    client_id: post.client_id,
    scheduled_date: post.scheduled_date || '',
    platform: post.platform || '',
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
  })

  const [currentImagePath, setCurrentImagePath] = useState(post.image_path)

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null
    const { data } = supabase.storage.from('post-images').getPublicUrl(imagePath)
    return data.publicUrl
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`/api/posts/${post.id}/image`, {
      method: 'POST',
      body: formData,
    })

    if (response.ok) {
      const data = await response.json()
      setCurrentImagePath(data.post.image_path)
    } else {
      const data = await response.json()
      setError(data.error || 'Failed to upload image')
    }
    setUploadingImage(false)
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
        scheduled_date: form.scheduled_date || null,
        image_path: currentImagePath,
      }),
    })

    if (response.ok) {
      const updatedPost = await response.json()
      onUpdated({ ...updatedPost, image_path: currentImagePath })
    } else {
      const data = await response.json()
      setError(data.error || 'Failed to update post')
    }
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    const response = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' })
    if (response.ok) {
      onDeleted(post.id)
    }
  }

  const imageUrl = getImageUrl(currentImagePath)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit Post</h2>
            <p className="text-xs text-gray-500 mt-0.5">{post.client?.name || 'Unknown Client'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Image Upload Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Post Image</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative cursor-pointer rounded-xl border-2 border-dashed border-gray-200 hover:border-[#10375C] transition-colors overflow-hidden"
            >
              {imageUrl ? (
                <div className="relative h-48">
                  <Image src={imageUrl} alt="Post image" fill className="object-cover" />
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">Change Image</span>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-lg">
                    Click to change
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
                      <span className="text-sm">Click to upload image</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 bg-white"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Client</label>
            <select
              value={form.client_id}
              onChange={(e) => handleChange('client_id', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 bg-white"
            >
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          {/* Row: Date + Platform */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Scheduled Date</label>
              <input
                type="date"
                value={form.scheduled_date}
                onChange={(e) => handleChange('scheduled_date', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Platform</label>
              <select
                value={form.platform}
                onChange={(e) => handleChange('platform', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 bg-white"
              >
                <option value="">Select platform...</option>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Row: Format + Content Pillar */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Format</label>
              <select
                value={form.format}
                onChange={(e) => handleChange('format', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 bg-white"
              >
                <option value="">Select format...</option>
                {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Content Pillar</label>
              <input
                type="text"
                value={form.content_pillar}
                onChange={(e) => handleChange('content_pillar', e.target.value)}
                placeholder="e.g. Education, Promotion"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900"
              />
            </div>
          </div>

          {/* Headline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Headline</label>
            <input
              type="text"
              value={form.headline}
              onChange={(e) => handleChange('headline', e.target.value)}
              placeholder="Post headline..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900"
            />
          </div>

          {/* Body Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Body Text</label>
            <textarea
              value={form.body_text}
              onChange={(e) => handleChange('body_text', e.target.value)}
              placeholder="Main body content..."
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 resize-none"
            />
          </div>

          {/* CTA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Call to Action</label>
            <input
              type="text"
              value={form.cta}
              onChange={(e) => handleChange('cta', e.target.value)}
              placeholder="e.g. Shop Now, Learn More, Book Today"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900"
            />
          </div>

          {/* Caption */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Caption</label>
            <textarea
              value={form.caption}
              onChange={(e) => handleChange('caption', e.target.value)}
              placeholder="Social media caption..."
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 resize-none"
            />
          </div>

          {/* Hashtags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Hashtags</label>
            <input
              type="text"
              value={form.hashtags}
              onChange={(e) => handleChange('hashtags', e.target.value)}
              placeholder="#solar #energy #renewable"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900"
            />
          </div>

          {/* Row: Background Color + Visual Direction */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Background Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.background_color}
                  onChange={(e) => handleChange('background_color', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={form.background_color}
                  onChange={(e) => handleChange('background_color', e.target.value)}
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Visual Direction</label>
              <input
                type="text"
                value={form.visual_direction}
                onChange={(e) => handleChange('visual_direction', e.target.value)}
                placeholder="Visual style notes..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleDelete}
              className={`px-4 py-2.5 rounded-xl font-semibold transition-all text-sm ${
                confirmDelete
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'border border-red-200 text-red-600 hover:bg-red-50'
              }`}
            >
              {confirmDelete ? 'Confirm Delete' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-[#10375C] text-white font-semibold hover:bg-[#0d2d4a] transition-all disabled:opacity-50 shadow-lg shadow-[#10375C]/20"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
