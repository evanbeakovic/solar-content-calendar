import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get the post to find client_id
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, client_id')
    .eq('id', id)
    .single()

  if (postError || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const fileExt = file.name.split('.').pop()
  const filePath = `${post.client_id}/${post.id}/${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('post-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Update post with image_path
  const { data: updatedPost, error: updateError } = await supabase
    .from('posts')
    .update({ image_path: filePath })
    .eq('id', id)
    .select('*, client:clients(*)')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('post-images')
    .getPublicUrl(filePath)

  return NextResponse.json({ post: updatedPost, publicUrl })
}
