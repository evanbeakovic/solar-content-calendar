import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import SMMNavbar from './components/SMMNavbar'

export default async function SMMLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'smm') redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <SMMNavbar profile={profile} />
      <main className="pt-16">
        {children}
      </main>
    </div>
  )
}
