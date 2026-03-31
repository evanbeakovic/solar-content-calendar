import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import KanbanBoard from './components/KanbanBoard'

export const dynamic = 'force-dynamic'

export default async function SMMPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()

  const [{ data: posts }, { data: clients }] = await Promise.all([
    adminClient
      .from('posts')
      .select('*, client:clients(*), images:post_images(*)')
      .order('scheduled_date', { ascending: true }),
    adminClient
      .from('clients')
      .select('*')
      .order('name'),
  ])

  // Sort images by position
  const postsWithSortedImages = (posts || []).map(post => ({
    ...post,
    images: (post.images || []).sort((a: any, b: any) => a.position - b.position),
  }))

  return (
    <KanbanBoard
      initialPosts={postsWithSortedImages}
      clients={clients || []}
    />
  )
}