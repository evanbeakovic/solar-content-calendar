'use client'

import { useState } from 'react'
import { Post, Client, PostStatus } from '@/lib/types'
import PostCard from './PostCard'
import NewPostModal from './NewPostModal'
import EditPostModal from './EditPostModal'
import CSVImportModal from './CSVImportModal'

interface KanbanBoardProps {
  initialPosts: Post[]
  clients: Client[]
}

const STATUSES: PostStatus[] = [
  'To Be Confirmed',
  'Being Created',
  'Confirmed',
  'Scheduled',
  'Posted',
]

const STATUS_STYLES: Record<PostStatus, { bg: string; border: string; dot: string; header: string }> = {
  'To Be Confirmed': {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
    header: 'text-gray-600',
  },
  'Being Created': {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    header: 'text-blue-700',
  },
  'Confirmed': {
    bg: 'bg-green-50',
    border: 'border-green-200',
    dot: 'bg-green-500',
    header: 'text-green-700',
  },
  'Scheduled': {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    dot: 'bg-yellow-500',
    header: 'text-yellow-700',
  },
  'Posted': {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    header: 'text-purple-700',
  },
}

export default function KanbanBoard({ initialPosts, clients }: KanbanBoardProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [showNewPost, setShowNewPost] = useState(false)
  const [showCSVImport, setShowCSVImport] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)

  const getPostsByStatus = (status: PostStatus) =>
    posts.filter(p => p.status === status)

  async function handleStatusChange(postId: string, newStatus: PostStatus) {
    const response = await fetch(`/api/posts/${postId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })

    if (response.ok) {
      const updatedPost = await response.json()
      setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p))
    }
  }

  function handlePostCreated(newPost: Post) {
    setPosts(prev => [newPost, ...prev])
    setShowNewPost(false)
  }

  function handlePostUpdated(updatedPost: Post) {
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p))
    setEditingPost(null)
  }

  function handlePostDeleted(postId: string) {
    setPosts(prev => prev.filter(p => p.id !== postId))
    setEditingPost(null)
  }

  function handleImportComplete(newPosts: Post[]) {
    setPosts(prev => [...newPosts, ...prev])
    setShowCSVImport(false)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Pipeline</h1>
          <p className="text-gray-500 text-sm mt-0.5">{posts.length} total posts across all clients</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCSVImport(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-[#10375C] text-[#10375C] font-semibold hover:bg-[#10375C] hover:text-white transition-all text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Import CSV
          </button>
          <button
            onClick={() => setShowNewPost(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#10375C] text-white font-semibold hover:bg-[#0d2d4a] transition-all text-sm shadow-lg shadow-[#10375C]/20"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Post
          </button>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 180px)' }}>
        {STATUSES.map(status => {
          const statusPosts = getPostsByStatus(status)
          const styles = STATUS_STYLES[status]

          return (
            <div
              key={status}
              className={`flex-shrink-0 w-72 rounded-2xl ${styles.bg} border ${styles.border} flex flex-col`}
            >
              {/* Column header */}
              <div className="p-4 border-b border-inherit">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${styles.dot}`}></div>
                  <h3 className={`font-semibold text-sm ${styles.header}`}>{status}</h3>
                  <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${styles.bg} ${styles.header} border ${styles.border}`}>
                    {statusPosts.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 kanban-column">
                {statusPosts.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-2xl mb-1 opacity-30">○</div>
                    <p className="text-xs">No posts here</p>
                  </div>
                )}
                {statusPosts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onClick={() => setEditingPost(post)}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modals */}
      {showNewPost && (
        <NewPostModal
          clients={clients}
          onClose={() => setShowNewPost(false)}
          onCreated={handlePostCreated}
        />
      )}

      {editingPost && (
        <EditPostModal
          post={editingPost}
          clients={clients}
          onClose={() => setEditingPost(null)}
          onUpdated={handlePostUpdated}
          onDeleted={handlePostDeleted}
        />
      )}

      {showCSVImport && (
        <CSVImportModal
          clients={clients}
          onClose={() => setShowCSVImport(false)}
          onImported={handleImportComplete}
        />
      )}
    </div>
  )
}
