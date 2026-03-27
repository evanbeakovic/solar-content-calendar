import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import KanbanBoard from './components/KanbanBoard'

export const dynamic = 'force-dynamic'

export default async function SMMPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: posts }, { data: clients }] = await Promise.all([
    supabase
      .from('posts')
      .select('*, client:clients(*)')
      .order('scheduled_date', { ascending: true }),
    supabase
      .from('clients')
      .select('*')
      .order('name'),
  ])

  return (
    <KanbanBoard
      initialPosts={posts || []}
      clients={clients || []}
    />
  )
}
