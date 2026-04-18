import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

const VALID_PLATFORMS = new Set(['Instagram', 'Facebook', 'LinkedIn', 'Twitter', 'TikTok', 'YouTube'])

function normalizePlatform(raw: string | undefined | null): string | null {
  if (!raw) return null
  const normalized = raw
    .split(' + ')
    .map(part => {
      const words = part.trim().split(/\s+/)
      for (let i = words.length; i >= 1; i--) {
        const candidate = words.slice(0, i).join(' ')
        if (VALID_PLATFORMS.has(candidate)) return candidate
      }
      return part.trim()
    })
    .join(' + ')
  return normalized || null
}

const FORMAT_MAP: Record<string, string> = {
  'Single Image': 'Post',
  'Image':        'Post',
  'Video':        'Video',
  'Reel':         'Reel',
  'Carousel':     'Carousel',
  'Story':        'Story',
  'Short':        'Short',
}

function normalizeFormat(raw: string | undefined | null): string | null {
  if (!raw) return null
  return FORMAT_MAP[raw] ?? raw
}

function normalizeDate(raw: string | undefined | null): string | null {
  if (!raw) return null
  const parts = raw.split('/')
  if (parts.length === 3 && parts[0].length <= 2) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
  }
  return raw || null
}

function normalizePost(post: ImportPost) {
  return {
    client_id:        post.client_id,
    scheduled_date:   normalizeDate(post.scheduled_date),
    platform:         normalizePlatform(post.platform),
    format:           normalizeFormat(post.format),
    content_pillar:   post.content_pillar   || null,
    headline:         post.headline         || null,
    body_text:        post.body_text        || null,
    cta:              post.cta              || null,
    caption:          post.caption          || null,
    hashtags:         post.hashtags         || null,
    background_color: post.background_color || null,
    visual_direction: post.visual_direction || null,
    status: 'Uploads' as const,
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient()

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['smm', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { posts } = body as { posts: ImportPost[] }

  if (!Array.isArray(posts) || posts.length === 0) {
    return NextResponse.json({ error: 'No posts provided' }, { status: 400 })
  }

  const normalized = posts.map(normalizePost)

  let skipped = 0
  const toInsert: typeof normalized = []
  const errors: string[] = []

  for (let i = 0; i < normalized.length; i++) {
    const post = normalized[i]
    const rowLabel = `Row ${i + 1}`

    if (!post.client_id) {
      errors.push(`${rowLabel}: missing client_id`)
      continue
    }

    // Duplicate detection: client_id + scheduled_date + platform + format
    let query = adminClient
      .from('posts')
      .select('id')
      .eq('client_id', post.client_id)

    if (post.scheduled_date) query = query.eq('scheduled_date', post.scheduled_date)
    if (post.platform)       query = query.eq('platform', post.platform)
    if (post.format)         query = query.eq('format', post.format)

    const { data: existing } = await query.limit(1)
    if (existing && existing.length > 0) {
      skipped++
      continue
    }

    toInsert.push(post)
  }

  let insertedPosts: any[] = []
  if (toInsert.length > 0) {
    const { data, error } = await adminClient
      .from('posts')
      .insert(toInsert)
      .select('*, client:clients(*)')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    insertedPosts = data || []
  }

  return NextResponse.json(
    {
      success: true,
      imported: insertedPosts.length,
      skipped,
      errors,
      posts: insertedPosts,
    },
    { status: 201 }
  )
}
