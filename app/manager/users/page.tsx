import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import UsersPageClient from './UsersPageClient'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()

  const [{ data: profiles }, { data: clients }] = await Promise.all([
    adminClient
      .from('profiles')
      .select('*, clients:profile_clients(client:clients(*))')
      .order('created_at', { ascending: false }),
    adminClient
      .from('clients')
      .select('*')
      .order('name'),
  ])

  // Flatten nested client structure
  const flatProfiles = (profiles || []).map((p: any) => ({
    ...p,
    clients: (p.clients || []).map((pc: any) => pc.client).filter(Boolean),
  }))

  return (
    <UsersPageClient
      initialProfiles={flatProfiles}
      clients={clients || []}
    />
  )
}