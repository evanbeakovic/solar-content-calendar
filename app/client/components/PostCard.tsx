'use client'

import { Post } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

interface ClientPostCardProps {
  post: Post
  onClick: () => void
  onApprove: (postId: string) => void
  onRequestChanges: (post: Post) => void
  theme: 'dark' | 'light'
  approvingId?: string | null
}

const STATUS_DOT: Record<string, string> = {
  'Uploads':           'bg-slate-400',
  'To Be Confirmed':   'bg-amber-400',
  'Being Created':     'bg-amber-400',
  'Requested Changes': 'bg-orange-400',
  'Confirmed':         'bg-green-400',
  'Scheduled':         'bg-purple-400',
  'Posted':            'bg-blue-400',
}

export default function ClientPostCard({
  post,
  onClick,
  onApprove,
  onRequestChanges,
  theme,
  approvingId,
}: ClientPostCardProps) {
  const supabase = createClient()
  const isDark = theme === 'dark'

  const sortedImages = (post.images || []).slice().sort((a, b) => a.position - b.position)
  const firstImage = sortedImages[0] || null
  const imageCount = sortedImages.length

  function getImageUrl(path: string | null) {
    if (!path) return null
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    return `https://lnxrnvypvyxykofgiael.supabase.co/storage/v1/object/public/post-images/${cleanPath}`
  }

  const imageUrl = getImageUrl(firstImage?.path || post.image_path || null)

  const platforms = post.platform ? post.platform.split(' + ') : []
  const platformLabel = platforms.length > 2
    ? `${platforms[0]} +${platforms.length - 1}`
    : platforms.join(' + ')
  const badgeLabel = platformLabel && post.format
    ? `${platformLabel} · ${post.format}`
    : platformLabel || post.format || null

  const isStory = post.format === 'Story'
  const isCarousel = post.format === 'Carousel'
  const isMulti = isCarousel || isStory

  const isAwaiting = post.status === 'To Be Confirmed'
  const isRequestedChanges = post.status === 'Requested Changes'
  const isConfirmed = post.status === 'Confirmed'
  const isScheduled = post.status === 'Scheduled'
  const isPosted = post.status === 'Posted'
  // Badge: being worked on after a change request
  const isBeingWorkedOn = (post.status === 'Being Created') && !!post.change_request_note

  const approving = approvingId === post.id

  return (
    <div
      className={`rounded-2xl overflow-hidden border transition-all group cursor-pointer flex flex-col ${
        isDark
          ? 'bg-[#111827] border-white/[0.07] hover:border-white/[0.18]'
          : 'bg-white border-black/[0.07] hover:border-black/[0.15] shadow-sm hover:shadow-md'
      }`}
      onClick={onClick}
    >
      {/* Image area */}
      <div
        className={`relative overflow-hidden flex-shrink-0 ${
          isStory ? 'aspect-[9/16] max-h-[200px]' : 'h-40'
        }`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={post.headline || 'Post'}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: post.background_color || (isDark ? '#1a2436' : '#e5e7eb') }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#374151' : '#9ca3af'} strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}

        {/* Platform badge — top left */}
        {badgeLabel && (
          <div className="absolute top-2.5 left-2.5">
            <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-full">
              {badgeLabel}
            </span>
          </div>
        )}

        {/* Status dot — top right */}
        <div className="absolute top-3 right-3">
          <div className={`w-2 h-2 rounded-full shadow-sm ${STATUS_DOT[post.status] || 'bg-gray-400'}`} />
        </div>

        {/* Image count badge — bottom right (multi) */}
        {isMulti && imageCount > 1 && (
          <div className="absolute bottom-2 right-2">
            <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
              1 / {imageCount}
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3.5 flex flex-col flex-1">
        {post.scheduled_date && (
          <p className={`text-[11px] mb-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            {format(new Date(post.scheduled_date + 'T00:00:00'), 'MMM d, yyyy')}
          </p>
        )}
        {post.headline && (
          <p className={`text-sm font-semibold leading-snug mb-1.5 line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {post.headline}
          </p>
        )}

        {/* "Request fixed ✓" badge — shown when SMM has marked the request as fixed */}
        {post.change_request_fixed === true && post.change_request_note && (
          <div className={`mb-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
            isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'
          }`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#4ade80' : '#16a34a'} strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <p className={`text-[11px] font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>Request fixed ✓</p>
          </div>
        )}

        {/* "We are working on your request" badge — only when NOT yet fixed */}
        {isBeingWorkedOn && !post.change_request_fixed && (
          <div className="mb-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <p className="text-[11px] text-amber-500 font-medium">We are working on your request...</p>
          </div>
        )}

        {/* Change request note (shown in Changes Requested tab) */}
        {isRequestedChanges && post.change_request_note && (
          <div className={`mb-2 p-2.5 rounded-lg border ${
            isDark
              ? 'bg-amber-500/10 border-amber-500/20'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
              {post.change_request_note}
            </p>
          </div>
        )}

        {/* Change request image thumbnails */}
        {isRequestedChanges && post.change_request_images && post.change_request_images.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-2" onClick={e => e.stopPropagation()}>
            {post.change_request_images.map((path, i) => {
              const url = getImageUrl(path)
              return url ? (
                <button
                  key={i}
                  onClick={() => window.open(url, '_blank')}
                  className="focus:outline-none"
                >
                  <img
                    src={url}
                    alt={`Reference ${i + 1}`}
                    className="w-12 h-12 object-cover rounded-lg border border-amber-500/20 hover:opacity-80 transition-opacity cursor-pointer"
                  />
                </button>
              ) : null
            })}
          </div>
        )}

        {post.caption && !isRequestedChanges && (
          <p className={`text-xs leading-relaxed line-clamp-2 mb-3 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            {post.caption}
          </p>
        )}

        {/* Action buttons — stop propagation so they don't open detail panel */}
        <div
          className="flex gap-2 mt-auto"
          onClick={e => e.stopPropagation()}
        >
          {isAwaiting && (
            <>
              <button
                onClick={() => onApprove(post.id)}
                disabled={approving}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {approving ? '...' : 'Approve'}
              </button>
              <button
                onClick={() => onRequestChanges(post)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1 ${
                  isDark
                    ? 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                Changes
              </button>
            </>
          )}

          {isRequestedChanges && (
            <button
              onClick={() => onRequestChanges(post)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1 ${
                isDark
                  ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                  : 'border-amber-300 text-amber-700 hover:bg-amber-50'
              }`}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit request
            </button>
          )}

          {isConfirmed && (
            <div className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Approved
            </div>
          )}

          {isScheduled && (
            <div className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center gap-1">
              Scheduled
            </div>
          )}

          {isPosted && (
            <div className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
