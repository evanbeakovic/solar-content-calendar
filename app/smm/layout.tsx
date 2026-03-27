import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SMMNavbar from './components/SMMNavbar'

export default async function SMMLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
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
