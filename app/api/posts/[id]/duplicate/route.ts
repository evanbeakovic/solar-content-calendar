import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { uploadToR2 } from '@/lib/r2'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: postId } = await params
  const adminSupabase = createAdminClient()

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['smm', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: original, error: fetchError } = await adminSupabase
    .from('posts')
    .select('*, images:post_images(*)')
    .eq('id', postId)
    .single()

  if (fetchError || !original) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at, updated_at, images, client, comments, ...postFields } = original

  const { data: newPost, error: insertError } = await adminSupabase
    .from('posts')
    .insert(postFields)
    .select('*, client:clients(*)')
    .single()

  if (insertError || !newPost) {
    return NextResponse.json({ error: 'Failed to duplicate post' }, { status: 500 })
  }

  const sortedImages = ((images || []) as any[]).sort((a: any, b: any) => a.position - b.position)
  const newImages: any[] = []

  for (const img of sortedImages) {
    try {
      // img.path is now the full R2 public URL — fetch it directly
      const fetchResponse = await fetch(img.path)
      if (!fetchResponse.ok) continue

      const fileBlob = await fetchResponse.blob()
      const urlPath = img.path.split('?')[0]
      const ext = urlPath.split('.').pop() || 'jpg'
      const newKey = `${newPost.client_id}/${newPost.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const arrayBuffer = await fileBlob.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const newUrl = await uploadToR2(buffer, newKey, fileBlob.type || 'image/jpeg')

      const { data: newImgRow, error: imgInsertError } = await adminSupabase
        .from('post_images')
        .insert({ post_id: newPost.id, path: newUrl, position: img.position })
        .select()
        .single()

      if (!imgInsertError && newImgRow) {
        newImages.push(newImgRow)
      }
    } catch {
      // Skip images that fail to copy
    }
  }

  // Update image_path on the new post if there are images
  if (newImages.length > 0) {
    await adminSupabase
      .from('posts')
      .update({ image_path: newImages[0].path })
      .eq('id', newPost.id)
    newPost.image_path = newImages[0].path
  }

  return NextResponse.json({ ...newPost, images: newImages })
}
