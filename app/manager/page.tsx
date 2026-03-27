import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { addDays, startOfDay } from 'date-fns'
import StatsCards from './components/StatsCards'
import ClientTable from './components/ClientTable'

export const dynamic = 'force-dynamic'

export default async function ManagerPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all data
  const [{ data: clients }, { data: posts }] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    supabase.from('posts').select('*'),
  ])

  const allClients = clients || []
  const allPosts = posts || []

  // Calculate stats
  const totalPosts = allPosts.length

  const postsByStatus = allPosts.reduce((acc, post) => {
    acc[post.status] = (acc[post.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Build per-client stats
  const today = startOfDay(new Date())
  const nextWeek = addDays(today, 7)

  const clientsWithStats = allClients.map(client => {
    const clientPosts = allPosts.filter(p => p.client_id === client.id)

    const postCounts = clientPosts.reduce((acc, post) => {
      acc[post.status] = (acc[post.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Flag if no Confirmed posts in the next 7 days
    const upcomingConfirmed = clientPosts.filter(p => {
      if (p.status !== 'Confirmed') return false
      if (!p.scheduled_date) return false
      const postDate = new Date(p.scheduled_date + 'T00:00:00')
      return postDate >= today && postDate <= nextWeek
    })

    const isFlagged = upcomingConfirmed.length === 0

    return {
      ...client,
      postCounts,
      totalPosts: clientPosts.length,
      isFlagged,
    }
  })

  const flaggedCount = clientsWithStats.filter(c => c.isFlagged).length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Overview across all clients and content pipelines</p>
      </div>

      <div className="space-y-6">
        <StatsCards
          totalClients={allClients.length}
          totalPosts={totalPosts}
          postsByStatus={postsByStatus}
          flaggedClients={flaggedCount}
        />

        <ClientTable clients={clientsWithStats} />
      </div>
    </div>
  )
}
