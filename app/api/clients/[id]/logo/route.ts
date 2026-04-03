// Migration note:
// Run this in Supabase SQL editor before deploying:
// ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_path text;

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { uploadToR2, deleteFromR2 } from '@/lib/r2'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient()

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Validate type and size (max 2MB)
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, or WebP.' }, { status: 400 })
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'File exceeds 2MB limit' }, { status: 400 })
  }

  const fileExt = file.name.split('.').pop()
  const key = `client-logos/${clientId}/${Date.now()}.${fileExt}`

  // Remove previous logo if it exists
  const { data: existing } = await adminClient
    .from('clients')
    .select('logo_path')
    .eq('id', clientId)
    .single()

  if (existing?.logo_path) {
    await deleteFromR2(existing.logo_path)
  }

  let publicUrl: string
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    publicUrl = await uploadToR2(buffer, key, file.type)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const { error: updateError } = await adminClient
    .from('clients')
    .update({ logo_path: publicUrl })
    .eq('id', clientId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ logo_path: publicUrl, publicUrl })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient()

  const { data: client } = await adminClient
    .from('clients')
    .select('logo_path')
    .eq('id', clientId)
    .single()

  if (client?.logo_path) {
    await deleteFromR2(client.logo_path)
  }

  await adminClient
    .from('clients')
    .update({ logo_path: null })
    .eq('id', clientId)

  return NextResponse.json({ success: true })
}
