import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient()

  const { data: post, error: postError } = await adminClient
    .from('posts')
    .select('id, client_id')
    .eq('id', postId)
    .single()

  if (postError || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const formData = await request.formData()
  const files = formData.getAll('file') as File[]

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }

  // Get current max position
  const { data: existingImages } = await adminClient
    .from('post_images')
    .select('position')
    .eq('post_id', postId)
    .order('position', { ascending: false })
    .limit(1)

  let nextPosition = existingImages && existingImages.length > 0
    ? existingImages[0].position + 1
    : 0

  const uploadedImages = []

  for (const file of files) {
    const fileExt = file.name.split('.').pop()
    const filePath = `${post.client_id}/${post.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

    const { error: uploadError } = await adminClient.storage
      .from('post-images')
      .upload(filePath, file, { cacheControl: '3600', upsert: true })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: imageRow, error: insertError } = await adminClient
      .from('post_images')
      .insert({ post_id: postId, path: filePath, position: nextPosition })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = adminClient.storage
      .from('post-images')
      .getPublicUrl(filePath)

    uploadedImages.push({ ...imageRow, publicUrl })
    nextPosition++
  }

  // Keep image_path in sync with first image for backwards compatibility
  if (uploadedImages.length > 0) {
    const { data: firstImage } = await adminClient
      .from('post_images')
      .select('path')
      .eq('post_id', postId)
      .order('position', { ascending: true })
      .limit(1)
      .single()

    if (firstImage) {
      await adminClient
        .from('posts')
        .update({ image_path: firstImage.path })
        .eq('id', postId)
    }
  }

  return NextResponse.json({ images: uploadedImages })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient()
  const { imageId } = await request.json()

  // Handle "delete all images for this post"
  if (imageId === 'all') {
    const { data: allImages } = await adminClient
      .from('post_images')
      .select('path')
      .eq('post_id', postId)

    if (allImages && allImages.length > 0) {
      const paths = allImages.map((img: { path: string }) => img.path)
      await adminClient.storage.from('post-images').remove(paths)
      await adminClient.from('post_images').delete().eq('post_id', postId)
    }

    await adminClient
      .from('posts')
      .update({ image_path: null })
      .eq('id', postId)

    return NextResponse.json({ success: true })
  }

  // Handle delete of a single image by id
  const { data: image } = await adminClient
    .from('post_images')
    .select('path')
    .eq('id', imageId)
    .single()

  if (image) {
    await adminClient.storage.from('post-images').remove([image.path])
    await adminClient.from('post_images').delete().eq('id', imageId)
  }

  // Update image_path to next remaining image
  const { data: remaining } = await adminClient
    .from('post_images')
    .select('path')
    .eq('post_id', postId)
    .order('position', { ascending: true })
    .limit(1)

  await adminClient
    .from('posts')
    .update({ image_path: remaining && remaining.length > 0 ? remaining[0].path : null })
    .eq('id', postId)

  return NextResponse.json({ success: true })
}
