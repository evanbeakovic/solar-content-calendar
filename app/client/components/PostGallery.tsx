'use client'

import { useState } from 'react'
import { Post, PostStatus } from '@/lib/types'
import PostCard from './PostCard'

interface PostGalleryProps {
  initialPosts: Post[]
  clientName: string
}

const STATUS_FILTERS: (PostStatus | 'all')[] = [
  'all',
  'To Be Confirmed',
  'Being Created',
  'Confirmed',
  'Scheduled',
  'Posted',
]

export default function PostGallery({ initialPosts, clientName }: PostGalleryProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [activeFilter, setActiveFilter] = useState<PostStatus | 'all'>('all')

  const filteredPosts = activeFilter === 'all'
    ? posts
    : posts.filter(p => p.status === activeFilter)

  function handleStatusChange(postId: string, newStatus: PostStatus) {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: newStatus } : p))
  }

  const statusCounts = STATUS_FILTERS.reduce((acc, status) => {
    if (status === 'all') {
      acc[status] = posts.length
    } else {
      acc[status] = posts.filter(p => p.status === status).length
    }
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero header */}
      <div className="relative px-6 pt-12 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-2">
            <span className="text-[#8EE3E3] text-xs font-medium tracking-widest uppercase">Content Calendar</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">{clientName}</h1>
          <p className="text-gray-500 text-sm">
            {posts.length} posts · Review and approve your content below
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-16 z-10 bg-[#0a0a0a] bg-opacity-95 backdrop-blur-xl border-b border-white border-opacity-5 px-6 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            {STATUS_FILTERS.map(status => (
              <button
                key={status}
                onClick={() => setActiveFilter(status)}
                className={`flex-shrink-0 text-xs font-medium px-4 py-2 rounded-full transition-all flex items-center gap-1.5 ${
                  activeFilter === status
                    ? 'bg-white text-black'
                    : 'text-gray-500 hover:text-gray-300 bg-white bg-opacity-5 hover:bg-opacity-10'
                }`}
              >
                {status === 'all' ? 'All Posts' : status}
                <span className={`text-xs ${activeFilter === status ? 'text-gray-600' : 'text-gray-600'}`}>
                  {statusCounts[status]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gallery grid */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 rounded-full bg-white bg-opacity-5 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <p className="text-gray-500 text-lg font-medium">No posts found</p>
              <p className="text-gray-700 text-sm mt-1">
                {activeFilter !== 'all' ? `No posts with status "${activeFilter}"` : 'Your content will appear here'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
