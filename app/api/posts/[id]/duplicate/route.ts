import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

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
      const { data: fileData, error: downloadError } = await adminSupabase.storage
        .from('post-images')
        .download(img.path)

      if (downloadError || !fileData) continue

      const ext = img.path.split('.').pop() || 'jpg'
      const newPath = `${newPost.client_id}/${newPost.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await adminSupabase.storage
        .from('post-images')
        .upload(newPath, fileData)

      if (uploadError) continue

      const { data: newImgRow, error: imgInsertError } = await adminSupabase
        .from('post_images')
        .insert({ post_id: newPost.id, path: newPath, position: img.position })
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
