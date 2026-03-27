import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PostGallery from './components/PostGallery'

export const dynamic = 'force-dynamic'

export default async function ClientPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, client:clients(*)')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'client' || !profile.client_id) {
    redirect('/login')
  }

  const { data: posts } = await supabase
    .from('posts')
    .select('*, client:clients(*)')
    .eq('client_id', profile.client_id)
    .order('scheduled_date', { ascending: true })

  return (
    <PostGallery
      initialPosts={posts || []}
      clientName={profile.client?.name || 'Your Brand'}
    />
  )
}
