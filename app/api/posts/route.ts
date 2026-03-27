import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('posts')
    .select('*, client:clients(*)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('posts')
    .insert({
      client_id: body.client_id,
      scheduled_date: body.scheduled_date || null,
      platform: body.platform || null,
      format: body.format || null,
      content_pillar: body.content_pillar || null,
      headline: body.headline || null,
      body_text: body.body_text || null,
      cta: body.cta || null,
      caption: body.caption || null,
      hashtags: body.hashtags || null,
      background_color: body.background_color || null,
      visual_direction: body.visual_direction || null,
      status: body.status || 'To Be Confirmed',
    })
    .select('*, client:clients(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
