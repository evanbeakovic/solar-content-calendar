'use client'

import { useSearchParams } from 'next/navigation'
import { Post, Client, Profile } from '@/lib/types'
import StatsCards from './StatsCards'
import ClientTable from './ClientTable'
import ManagerPostsTab from './ManagerPostsTab'
import UsersPageClient from '../users/UsersPageClient'
import ContentView from '@/app/client/components/ContentView'

interface ClientWithStats extends Client {
  postCounts: Record<string, number>
  totalPosts: number
  isFlagged: boolean
}

interface ManagerDashboardClientProps {
  initialPosts: Post[]
  clients: Client[]
  clientsWithStats: ClientWithStats[]
  totalPosts: number
  postsByStatus: Record<string, number>
  flaggedCount: number
  initialProfiles: (Profile & { clients?: Client[] })[]
}

type Section = 'dashboard' | 'content' | 'users' | 'preview'

export default function ManagerDashboardClient({
  initialPosts,
  clients,
  clientsWithStats,
  totalPosts,
  postsByStatus,
  flaggedCount,
  initialProfiles,
}: ManagerDashboardClientProps) {
  const searchParams = useSearchParams()
  const activeSection = (searchParams.get('section') || 'dashboard') as Section

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {activeSection === 'dashboard' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">Overview across all clients and content pipelines</p>
          </div>
          <StatsCards
            totalClients={clients.length}
            totalPosts={totalPosts}
            postsByStatus={postsByStatus}
            flaggedClients={flaggedCount}
            flaggedClientList={clientsWithStats}
          />
          <ClientTable clients={clientsWithStats} />
        </div>
      )}

      {activeSection === 'content' && (
        <ManagerPostsTab initialPosts={initialPosts} clients={clients} />
      )}

      {activeSection === 'users' && (
        <UsersPageClient
          initialProfiles={initialProfiles}
          clients={clients}
        />
      )}

      {activeSection === 'preview' && (
        <div className="rounded-2xl bg-[#0a0f1a] overflow-hidden">
          <ContentView
            posts={initialPosts}
            clients={clients}
            activeClientIds={clients.map(c => c.id)}
            theme="dark"
            onPostUpdated={() => {}}
            readOnly
          />
        </div>
      )}
    </div>
  )
}
