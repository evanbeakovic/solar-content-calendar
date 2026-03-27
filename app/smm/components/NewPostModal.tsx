'use client'

import { useState } from 'react'
import { Client, Post } from '@/lib/types'

interface NewPostModalProps {
  clients: Client[]
  onClose: () => void
  onCreated: (post: Post) => void
}

const PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn', 'Twitter', 'TikTok']
const FORMATS = ['Single Image', 'Carousel', 'Story', 'Reel', 'Video']

export default function NewPostModal({ clients, onClose, onCreated }: NewPostModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    client_id: '',
    scheduled_date: '',
    platform: '',
    format: '',
    content_pillar: '',
    headline: '',
    body_text: '',
    cta: '',
    caption: '',
    hashtags: '',
    background_color: '#ffffff',
    visual_direction: '',
  })

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_id) {
      setError('Please select a client')
      return
    }

    setLoading(true)
    setError('')

    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (response.ok) {
      const newPost = await response.json()
      onCreated(newPost)
    } else {
      const data = await response.json()
      setError(data.error || 'Failed to create post')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Create New Post</h2>
            <p className="text-xs text-gray-500 mt-0.5">Status will be set to "To Be Confirmed"</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Client <span className="text-red-500">*</span></label>
            <select
              value={form.client_id}
              onChange={(e) => handleChange('client_id', e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 bg-white"
            >
              <option value="">Select a client...</option>
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
              {loading ? 'Creating...' : 'Create Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
