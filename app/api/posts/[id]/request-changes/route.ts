import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const note = formData.get('note')
  const imageFiles = formData.getAll('images') as File[]
  // Existing image paths the client wants to retain (used when editing a request)
  const keepPaths = (formData.getAll('keepPath') as string[]).filter(
    (p): p is string => typeof p === 'string' && p.length > 0
  )

  if (!note || typeof note !== 'string' || !note.trim()) {
    return NextResponse.json({ error: 'note is required' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Upload each new image file server-side via admin storage client
  const newImagePaths: string[] = []
  for (const file of imageFiles) {
    if (!(file instanceof File) || file.size === 0) continue
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `change-requests/${id}/${Date.now()}-${safeName}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const { error } = await adminClient.storage
      .from('post-images')
      .upload(path, buffer, { contentType: file.type, upsert: true })
    if (!error) newImagePaths.push(path)
  }

  const { data, error } = await adminClient
    .from('posts')
    .update({
      status: 'Requested Changes',
      change_request_note: note.trim(),
      change_request_images: [...keepPaths, ...newImagePaths],
      change_request_fixed: false,
    })
    .eq('id', id)
    .select('*, client:clients(*), images:post_images(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
