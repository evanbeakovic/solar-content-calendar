import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UsersPageClient from './UsersPageClient'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profiles }, { data: clients }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*, client:clients(*)')
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('*')
      .order('name'),
  ])

  return (
    <UsersPageClient
      initialProfiles={profiles || []}
      clients={clients || []}
    />
  )
}
