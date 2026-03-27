import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ManagerNavbar from './components/ManagerNavbar'

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'manager') redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <ManagerNavbar profile={profile} />
      <main className="pt-16">
        {children}
      </main>
    </div>
  )
}
