import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient()

  const { data: currentProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!currentProfile || currentProfile.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await adminClient
    .from('profiles')
    .select('*, clients:profile_clients(client:clients(*))')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Flatten nested client structure
  const profiles = (data || []).map((p: any) => ({
    ...p,
    clients: (p.clients || []).map((pc: any) => pc.client).filter(Boolean),
  }))

  return NextResponse.json(profiles)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: currentProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!currentProfile || currentProfile.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { email, password, role, full_name, client_ids } = body

  if (!email || !password || !role) {
    return NextResponse.json({ error: 'Email, password, and role are required' }, { status: 400 })
  }

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, full_name },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  if (authData.user) {
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ role, full_name: full_name || null })
      .eq('id', authData.user.id)

    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

    // Insert into profile_clients join table
    if (client_ids && client_ids.length > 0) {
      const rows = client_ids.map((cid: string) => ({
        profile_id: authData.user!.id,
        client_id: cid,
      }))
      const { error: joinError } = await adminClient.from('profile_clients').insert(rows)
      if (joinError) return NextResponse.json({ error: joinError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ user: authData.user }, { status: 201 })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: currentProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!currentProfile || currentProfile.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { id, full_name, role, client_ids, password } = body

  if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 })

  if (password) {
    const { error: pwError } = await adminClient.auth.admin.updateUserById(id, { password })
    if (pwError) return NextResponse.json({ error: pwError.message }, { status: 500 })
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ full_name: full_name || null, role })
    .eq('id', id)

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  // Replace all client assignments
  await adminClient.from('profile_clients').delete().eq('profile_id', id)

  if (client_ids && client_ids.length > 0) {
    const rows = client_ids.map((cid: string) => ({ profile_id: id, client_id: cid }))
    const { error: joinError } = await adminClient.from('profile_clients').insert(rows)
    if (joinError) return NextResponse.json({ error: joinError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: currentProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!currentProfile || currentProfile.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 })

  if (id === user.id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
  }

  const { error } = await adminClient.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}