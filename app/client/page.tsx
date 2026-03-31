import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import ClientPortal from './components/ClientPortal'

export const dynamic = 'force-dynamic'

export default async function ClientPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()

  const { data: profile } = await adminClient
    .from('profiles')
    .select('*, clients:profile_clients(client:clients(*))')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'client') redirect('/login')

  const clients = (profile.clients || [])
    .map((pc: any) => pc.client)
    .filter(Boolean)

  if (clients.length === 0) redirect('/login')

  const clientIds = clients.map((c: any) => c.id)

  const { data: posts } = await adminClient
    .from('posts')
    .select('*, client:clients(*), images:post_images(*)')
    .in('client_id', clientIds)
    .order('scheduled_date', { ascending: true })

  const sortedPosts = (posts || [])
  sortedPosts.forEach(p => p.images?.sort((a: any, b: any) => a.position - b.position))

  return (
    <ClientPortal
      initialPosts={sortedPosts}
      clients={clients}
      profile={profile}
    />
  )
}
