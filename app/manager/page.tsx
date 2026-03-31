import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { addDays, startOfDay } from 'date-fns'
import ManagerDashboardClient from './components/ManagerDashboardClient'

export const dynamic = 'force-dynamic'

export default async function ManagerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminSupabase = createAdminClient()

  const [{ data: clients }, { data: posts }, { data: profiles }] = await Promise.all([
    adminSupabase.from('clients').select('*').order('name'),
    adminSupabase
      .from('posts')
      .select('*, client:clients(*), images:post_images(*)')
      .order('scheduled_date', { ascending: true }),
    adminSupabase
      .from('profiles')
      .select('*, clients:profile_clients(client:clients(*))')
      .order('created_at', { ascending: false }),
  ])

  const allClients = clients || []

  // Sort images by position
  const allPosts = (posts || []).map((post: any) => ({
    ...post,
    images: (post.images || []).sort((a: any, b: any) => a.position - b.position),
  }))

  // Flatten nested client structure in profiles
  const flatProfiles = (profiles || []).map((p: any) => ({
    ...p,
    clients: (p.clients || []).map((pc: any) => pc.client).filter(Boolean),
  }))

  const totalPosts = allPosts.length
  const postsByStatus = allPosts.reduce((acc: Record<string, number>, post: any) => {
    acc[post.status] = (acc[post.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const today = startOfDay(new Date())
  const nextWeek = addDays(today, 7)

  const clientsWithStats = allClients.map((client: any) => {
    const clientPosts = allPosts.filter((p: any) => p.client_id === client.id)
    const postCounts = clientPosts.reduce((acc: Record<string, number>, post: any) => {
      acc[post.status] = (acc[post.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const upcomingConfirmed = clientPosts.filter((p: any) => {
      if (p.status !== 'Confirmed') return false
      if (!p.scheduled_date) return false
      const postDate = new Date(p.scheduled_date + 'T00:00:00')
      return postDate >= today && postDate <= nextWeek
    })

    const isFlagged = upcomingConfirmed.length === 0

    return { ...client, postCounts, totalPosts: clientPosts.length, isFlagged }
  })

  const flaggedCount = clientsWithStats.filter((c: any) => c.isFlagged).length

  return (
    <ManagerDashboardClient
      initialPosts={allPosts}
      clients={allClients}
      clientsWithStats={clientsWithStats}
      totalPosts={totalPosts}
      postsByStatus={postsByStatus}
      flaggedCount={flaggedCount}
      initialProfiles={flatProfiles}
    />
  )
}
