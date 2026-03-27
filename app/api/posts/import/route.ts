import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface ImportPost {
  client_id: string
  scheduled_date?: string
  platform?: string
  format?: string
  content_pillar?: string
  headline?: string
  body_text?: string
  cta?: string
  caption?: string
  hashtags?: string
  background_color?: string
  visual_direction?: string
}

export async function POST(request: Request) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'smm') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { posts } = body as { posts: ImportPost[] }

  if (!Array.isArray(posts) || posts.length === 0) {
    return NextResponse.json({ error: 'No posts provided' }, { status: 400 })
  }

  const postsToInsert = posts.map(post => ({
    client_id: post.client_id,
    scheduled_date: post.scheduled_date || null,
    platform: post.platform || null,
    format: post.format || null,
    content_pillar: post.content_pillar || null,
    headline: post.headline || null,
    body_text: post.body_text || null,
    cta: post.cta || null,
    caption: post.caption || null,
    hashtags: post.hashtags || null,
    background_color: post.background_color || null,
    visual_direction: post.visual_direction || null,
    status: 'To Be Confirmed' as const,
  }))

  const { data, error } = await supabase
    .from('posts')
    .insert(postsToInsert)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ created: data.length, posts: data }, { status: 201 })
}
