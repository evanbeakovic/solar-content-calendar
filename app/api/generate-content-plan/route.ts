import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAnthropicKey } from '@/lib/getAnthropicKey'
import {
  buildContentPlanPrompt,
  buildSinglePostPrompt,
  FrequencyRule,
  HistoryPost,
} from '@/lib/contentPlanPrompt'

const REQUIRED_FIELDS = [
  'date',
  'platforms',
  'format',
  'content_pillar',
  'headline',
  'body_text',
  'cta',
  'caption',
  'hashtags',
]

function missingFields(post: any): string[] {
  return REQUIRED_FIELDS.filter(f => !(f in post))
}

function normalizePost(post: any): any {
  if (!Array.isArray(post.hashtags)) {
    post.hashtags =
      typeof post.hashtags === 'string'
        ? post.hashtags.split(/\s+/).filter(Boolean)
        : []
  }
  if (!Array.isArray(post.platforms)) {
    post.platforms = post.platforms ? [post.platforms] : []
  }
  return post
}

function toMonthLabel(month: string): string {
  // Convert "2026-05" → "May 2026"; pass through if already a label
  if (!/^\d{4}-\d{2}$/.test(month)) return month
  const [y, m] = month.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      client_id,
      month,
      frequency_template_id,
      platforms,
      month_notes,
      generated_by,
      // Single-post regeneration
      mode,
      post_index,
      current_posts,
    } = body

    if (!client_id || !month) {
      return NextResponse.json(
        { error: 'client_id and month are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Fetch client name
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('name')
      .eq('id', client_id)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Fetch brief
    const { data: brief, error: briefError } = await supabase
      .from('client_briefs')
      .select('*')
      .eq('client_id', client_id)
      .maybeSingle()

    if (briefError) throw briefError

    if (!brief) {
      return NextResponse.json(
        {
          error:
            'No client brief found. Please fill in the client brief before generating a content plan.',
        },
        { status: 400 }
      )
    }

    // TODO: account_id should come from the authenticated session in a multi-tenant future
    const apiKey = await getAnthropicKey('default')

    const monthLabel = toMonthLabel(month)

    // ── SINGLE POST REGENERATION MODE ────────────────────────────────────────
    if (
      mode === 'single' &&
      typeof post_index === 'number' &&
      Array.isArray(current_posts)
    ) {
      const prompt = buildSinglePostPrompt({
        month: monthLabel,
        clientName: client.name,
        brief,
        currentPosts: current_posts,
        postIndex: post_index,
      })

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error?.message || 'Claude API error')
      }

      const data = await response.json()
      const raw = (data.content?.[0]?.text || '').trim()

      let post: any
      try {
        post = JSON.parse(raw)
      } catch {
        return NextResponse.json(
          { error: 'Failed to parse regenerated post', raw: raw.slice(0, 500) },
          { status: 422 }
        )
      }

      const missing = missingFields(post)
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Regenerated post missing fields: ${missing.join(', ')}`, raw },
          { status: 422 }
        )
      }

      return NextResponse.json({ post: normalizePost(post) })
    }

    // ── FULL PLAN GENERATION MODE ────────────────────────────────────────────
    const frequencyRules: FrequencyRule[] = Array.isArray(platforms) ? platforms : []

    if (frequencyRules.length === 0) {
      return NextResponse.json(
        { error: 'platforms (frequency rules) are required' },
        { status: 400 }
      )
    }

    // Fetch posted history (last 90 days)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { data: historyRows } = await supabase
      .from('posts')
      .select('headline, caption, format, content_pillar')
      .eq('client_id', client_id)
      .eq('status', 'Posted')
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(50)

    const postedHistory: HistoryPost[] = (historyRows || []).map(p => ({
      headline: p.headline || '',
      caption: p.caption || '',
      format: p.format || '',
      content_pillar: p.content_pillar || '',
    }))

    const prompt = buildContentPlanPrompt({
      month: monthLabel,
      clientName: client.name,
      brief,
      frequencyRules,
      postedHistory,
      monthNotes: month_notes || '',
    })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || 'Claude API error')
    }

    const data = await response.json()
    const raw = (data.content?.[0]?.text || '').trim()

    // Parse
    let posts: any[]
    try {
      posts = JSON.parse(raw)
    } catch {
      return NextResponse.json(
        {
          error: 'Claude returned invalid JSON. Please try again.',
          raw: raw.slice(0, 500),
        },
        { status: 422 }
      )
    }

    if (!Array.isArray(posts)) {
      return NextResponse.json(
        { error: 'Expected a JSON array from Claude.', raw: raw.slice(0, 500) },
        { status: 422 }
      )
    }

    // Validate and normalize each post
    const validationErrors: string[] = []
    posts = posts.map((post, i) => {
      const missing = missingFields(post)
      if (missing.length > 0) {
        validationErrors.push(`Post ${i + 1} missing: ${missing.join(', ')}`)
      }
      return normalizePost(post)
    })

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: `Validation failed:\n${validationErrors.slice(0, 5).join('\n')}`,
          raw: raw.slice(0, 500),
        },
        { status: 422 }
      )
    }

    // Dismiss existing pending previews for same client + month
    await supabase
      .from('content_plan_previews')
      .update({ status: 'dismissed' })
      .eq('client_id', client_id)
      .eq('month', monthLabel)
      .eq('status', 'pending')

    // Save to DB directly
    const { data: preview, error: previewError } = await supabase
      .from('content_plan_previews')
      .insert({
        client_id,
        generated_by: generated_by || 'manager',
        month: monthLabel,
        frequency_template_id: frequency_template_id || null,
        month_notes: month_notes || null,
        posts,
        status: 'pending',
      })
      .select()
      .single()

    if (previewError) throw previewError

    return NextResponse.json({
      preview_id: preview.id,
      month: monthLabel,
      posts,
      count: posts.length,
    })
  } catch (err: any) {
    console.error('POST /api/generate-content-plan error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
