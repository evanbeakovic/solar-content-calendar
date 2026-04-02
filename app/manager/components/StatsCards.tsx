'use client'

import { useState } from 'react'

interface ClientWithStats {
  id: string
  name: string
  isFlagged: boolean
}

interface StatsCardsProps {
  totalClients: number
  totalPosts: number
  postsByStatus: Record<string, number>
  flaggedClients: number
  flaggedClientList: ClientWithStats[]
}

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  'To Be Confirmed': { bg: 'bg-gray-100', text: 'text-gray-700', icon: '⏳' },
  'Being Created': { bg: 'bg-blue-50', text: 'text-blue-700', icon: '✏️' },
  'Confirmed': { bg: 'bg-green-50', text: 'text-green-700', icon: '✓' },
  'Scheduled': { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: '📅' },
  'Posted': { bg: 'bg-purple-50', text: 'text-purple-700', icon: '🚀' },
}

export default function StatsCards({
  totalClients,
  totalPosts,
  postsByStatus,
  flaggedClients,
  flaggedClientList,
}: StatsCardsProps) {
  const [showFlagPopover, setShowFlagPopover] = useState(false)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Clients */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#10375C] bg-opacity-10 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10375C" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{totalClients}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Clients</div>
        </div>

        {/* Total Posts */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#8EE3E3] bg-opacity-20 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d8282" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{totalPosts}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Posts</div>
        </div>

        {/* Confirmed Posts */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{postsByStatus['Confirmed'] || 0}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Confirmed Posts</div>
        </div>

        {/* Flagged Clients — interactive */}
        <div className="relative">
          <button
            onClick={() => setShowFlagPopover(v => !v)}
            className={`w-full text-left rounded-2xl p-6 border shadow-sm transition-all ${
              flaggedClients > 0
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${flaggedClients > 0 ? 'bg-red-100 dark:bg-red-900/40' : 'bg-gray-50 dark:bg-gray-800'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={flaggedClients > 0 ? '#dc2626' : '#9ca3af'} strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>
                </svg>
              </div>
              {flaggedClients > 0 && (
                <span className="text-xs text-red-400 font-medium">Click for details</span>
              )}
            </div>
            <div className={`text-3xl font-bold ${flaggedClients > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
              {flaggedClients}
            </div>
            <div className={`text-sm mt-1 ${flaggedClients > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
              Clients Flagged
              <span className="block text-xs opacity-70">No confirmed posts this week</span>
            </div>
          </button>

          {/* Popover */}
          {showFlagPopover && flaggedClients > 0 && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFlagPopover(false)} />
              <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">⚠️ Flagged Clients</h4>
                  <button onClick={() => setShowFlagPopover(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                  These clients have no posts with <strong>Confirmed</strong> status scheduled in the next 7 days.
                </p>
                <div className="space-y-2">
                  {flaggedClientList.filter(c => c.isFlagged).map(client => (
                    <div key={client.id} className="flex items-center gap-2.5 py-1.5">
                      <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-700 dark:text-red-400 font-bold text-xs flex-shrink-0">
                        {client.name[0]}
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{client.name}</span>
                      <span className="ml-auto text-xs text-red-500 dark:text-red-400 font-medium">No posts</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status breakdown */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Posts by Status</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(STATUS_COLORS).map(([status, styles]) => (
            <div key={status} className={`${styles.bg} rounded-xl p-4 text-center`}>
              <div className="text-2xl mb-1">{styles.icon}</div>
              <div className={`text-2xl font-bold ${styles.text}`}>{postsByStatus[status] || 0}</div>
              <div className={`text-xs ${styles.text} opacity-70 mt-0.5 font-medium`}>{status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}