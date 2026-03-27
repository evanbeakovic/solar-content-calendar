'use client'

import { useState } from 'react'
import { Post, PostStatus } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { format } from 'date-fns'

interface PostCardProps {
  post: Post
  onStatusChange: (postId: string, newStatus: PostStatus) => void
}

const STATUS_STYLES: Record<PostStatus, { bg: string; text: string; dot: string }> = {
  'To Be Confirmed': { bg: 'bg-gray-800', text: 'text-gray-300', dot: 'bg-gray-500' },
  'Being Created': { bg: 'bg-blue-900 bg-opacity-60', text: 'text-blue-300', dot: 'bg-blue-400' },
  'Confirmed': { bg: 'bg-green-900 bg-opacity-60', text: 'text-green-300', dot: 'bg-green-400' },
  'Scheduled': { bg: 'bg-yellow-900 bg-opacity-60', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  'Posted': { bg: 'bg-purple-900 bg-opacity-60', text: 'text-purple-300', dot: 'bg-purple-400' },
}

const PLATFORM_ICONS: Record<string, string> = {
  Instagram: '📷',
  Facebook: '👥',
  LinkedIn: '💼',
  Twitter: '🐦',
  TikTok: '🎵',
}

export default function PostCard({ post, onStatusChange }: PostCardProps) {
  const supabase = createClient()
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [changeRequest, setChangeRequest] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [approving, setApproving] = useState(false)

  const getImageUrl = () => {
    if (!post.image_path) return null
    const { data } = supabase.storage.from('post-images').getPublicUrl(post.image_path)
    return data.publicUrl
  }

  const imageUrl = getImageUrl()
  const statusStyle = STATUS_STYLES[post.status]

  async function handleApprove() {
    setApproving(true)
    const response = await fetch(`/api/posts/${post.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Confirmed' }),
    })
    if (response.ok) {
      onStatusChange(post.id, 'Confirmed')
    }
    setApproving(false)
  }

  async function handleSubmitRequest() {
    if (!changeRequest.trim()) return
    setSubmitting(true)

    await fetch(`/api/posts/${post.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: changeRequest }),
    })

    setSubmitted(true)
    setSubmitting(false)
    setChangeRequest('')
    setTimeout(() => {
      setShowRequestForm(false)
      setSubmitted(false)
    }, 2000)
  }

  return (
    <div className="bg-[#111111] border border-white border-opacity-10 rounded-2xl overflow-hidden hover:border-opacity-20 transition-all group">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-[#1a1a1a]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={post.headline || 'Post'}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: post.background_color || '#1a1a1a' }}
          >
            <div className="text-center p-6 opacity-40">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" className="mx-auto mb-2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <p className="text-white text-xs">No image yet</p>
            </div>
          </div>
        )}

        {/* Status badge overlay */}
        <div className="absolute top-3 left-3">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${statusStyle.bg} ${statusStyle.text}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></div>
            {post.status}
          </div>
        </div>

        {/* Platform badge */}
        {post.platform && (
          <div className="absolute top-3 right-3 bg-black bg-opacity-60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
            {PLATFORM_ICONS[post.platform] || '📱'} {post.platform}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Visual Direction */}
        {post.visual_direction && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-1">Visual Direction</p>
            <p className="text-gray-300 text-sm leading-relaxed">{post.visual_direction}</p>
          </div>
        )}

        {/* Headline */}
        {post.headline && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-1">Headline</p>
            <p className="text-white font-semibold text-base leading-snug">{post.headline}</p>
          </div>
        )}

        {/* Caption */}
        {post.caption && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-1">Caption</p>
            <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">{post.caption}</p>
          </div>
        )}

        {/* CTA */}
        {post.cta && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-1">Call to Action</p>
            <div className="inline-flex items-center gap-1.5 bg-[#8EE3E3] bg-opacity-10 border border-[#8EE3E3] border-opacity-20 text-[#8EE3E3] text-sm px-3 py-1 rounded-full">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              {post.cta}
            </div>
          </div>
        )}

        {/* Date */}
        {post.scheduled_date && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Scheduled: {format(new Date(post.scheduled_date + 'T00:00:00'), 'MMMM d, yyyy')}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-white border-opacity-5 pt-4">
          {/* Action buttons */}
          {post.status !== 'Confirmed' && post.status !== 'Posted' && (
            <div className="space-y-2">
              {!showRequestForm && !submitted && (
                <div className="flex gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={approving}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {approving ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => setShowRequestForm(true)}
                    className="flex-1 border border-red-500 border-opacity-50 text-red-400 hover:bg-red-500 hover:bg-opacity-10 text-sm font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                    Request Changes
                  </button>
                </div>
              )}

              {showRequestForm && !submitted && (
                <div className="space-y-2">
                  <textarea
                    value={changeRequest}
                    onChange={(e) => setChangeRequest(e.target.value)}
                    placeholder="Describe the changes you'd like..."
                    rows={3}
                    className="w-full bg-[#1a1a1a] border border-white border-opacity-10 text-white text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#8EE3E3] focus:border-opacity-40 resize-none placeholder-gray-600"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowRequestForm(false); setChangeRequest('') }}
                      className="flex-1 border border-white border-opacity-10 text-gray-400 hover:text-gray-300 text-sm py-2 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitRequest}
                      disabled={submitting || !changeRequest.trim()}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold py-2 rounded-xl transition-all disabled:opacity-50"
                    >
                      {submitting ? 'Sending...' : 'Send Request'}
                    </button>
                  </div>
                </div>
              )}

              {submitted && (
                <div className="flex items-center justify-center gap-2 text-green-400 text-sm py-2 bg-green-500 bg-opacity-10 rounded-xl border border-green-500 border-opacity-20">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Change request sent!
                </div>
              )}
            </div>
          )}

          {post.status === 'Confirmed' && (
            <div className="flex items-center justify-center gap-2 text-green-400 text-sm py-2 bg-green-500 bg-opacity-10 rounded-xl border border-green-500 border-opacity-20">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Approved
            </div>
          )}

          {post.status === 'Posted' && (
            <div className="flex items-center justify-center gap-2 text-purple-400 text-sm py-2 bg-purple-500 bg-opacity-10 rounded-xl border border-purple-500 border-opacity-20">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
              </svg>
              Published
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
