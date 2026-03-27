'use client'

import { Post, PostStatus } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { format } from 'date-fns'

interface PostCardProps {
  post: Post
  onClick: () => void
  onStatusChange: (postId: string, newStatus: PostStatus) => void
}

const STATUS_ORDER: PostStatus[] = [
  'To Be Confirmed',
  'Being Created',
  'Confirmed',
  'Scheduled',
  'Posted',
]

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: 'bg-pink-100 text-pink-700',
  Facebook: 'bg-blue-100 text-blue-700',
  LinkedIn: 'bg-blue-100 text-blue-800',
  Twitter: 'bg-sky-100 text-sky-700',
  TikTok: 'bg-gray-900 text-white',
}

export default function PostCard({ post, onClick, onStatusChange }: PostCardProps) {
  const supabase = createClient()

  const getNextStatus = (): PostStatus | null => {
    const currentIndex = STATUS_ORDER.indexOf(post.status)
    if (currentIndex < STATUS_ORDER.length - 1) {
      return STATUS_ORDER[currentIndex + 1]
    }
    return null
  }

  const nextStatus = getNextStatus()

  async function handleAdvanceStatus(e: React.MouseEvent) {
    e.stopPropagation()
    if (!nextStatus) return
    onStatusChange(post.id, nextStatus)
  }

  const getImageUrl = () => {
    if (!post.image_path) return null
    const { data } = supabase.storage.from('post-images').getPublicUrl(post.image_path)
    return data.publicUrl
  }

  const imageUrl = getImageUrl()

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer group card-hover overflow-hidden"
    >
      {/* Image thumbnail */}
      {imageUrl && (
        <div className="relative h-32 w-full overflow-hidden bg-gray-100">
          <Image
            src={imageUrl}
            alt={post.headline || 'Post image'}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      {/* No image placeholder */}
      {!imageUrl && post.background_color && (
        <div
          className="h-16 w-full"
          style={{ backgroundColor: post.background_color }}
        />
      )}

      <div className="p-3">
        {/* Client + Platform row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-[#10375C] truncate">
            {post.client?.name || 'Unknown Client'}
          </span>
          {post.platform && (
            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium flex-shrink-0 ${PLATFORM_COLORS[post.platform] || 'bg-gray-100 text-gray-600'}`}>
              {post.platform}
            </span>
          )}
        </div>

        {/* Headline */}
        {post.headline && (
          <p className="text-sm font-medium text-gray-800 line-clamp-2 mb-2 leading-snug">
            {post.headline}
          </p>
        )}

        {/* Format + Date */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {post.format && (
            <span className="bg-gray-50 px-1.5 py-0.5 rounded text-gray-500">{post.format}</span>
          )}
          {post.scheduled_date && (
            <span className="flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {format(new Date(post.scheduled_date + 'T00:00:00'), 'MMM d')}
            </span>
          )}
        </div>

        {/* Advance status button */}
        {nextStatus && (
          <button
            onClick={handleAdvanceStatus}
            className="mt-2 w-full text-xs py-1.5 rounded-lg bg-[#10375C] bg-opacity-5 hover:bg-opacity-10 text-[#10375C] font-medium transition-all flex items-center justify-center gap-1 border border-[#10375C] border-opacity-10"
          >
            Move to {nextStatus}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9,18 15,12 9,6"/>
            </svg>
          </button>
        )}

        {post.status === 'Posted' && (
          <div className="mt-2 w-full text-xs py-1.5 rounded-lg bg-purple-50 text-purple-600 font-medium text-center border border-purple-100">
            ✓ Posted
          </div>
        )}
      </div>
    </div>
  )
}
