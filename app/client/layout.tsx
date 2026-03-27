import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientNavbar from './components/ClientNavbar'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, client:clients(*)')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'client') redirect('/login')

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <ClientNavbar profile={profile} clientName={profile.client?.name || 'Portal'} />
      <main className="pt-16">
        {children}
      </main>
    </div>
  )
}
