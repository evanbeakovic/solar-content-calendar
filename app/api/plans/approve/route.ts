import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAnthropicKey } from '@/lib/getAnthropicKey'

interface PlanPost {
  date: string
  platforms: string[]
  format: string
  content_pillar: string
  headline: string
  body_text: string
  cta: string
  caption: string
  hashtags: string[]
}

async function refreshStyleSummary(clientId: string): Promise<void> {
  const supabase = createAdminClient()

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: historyRows } = await supabase
    .from('posts')
    .select('headline, caption, format, content_pillar')
    .eq('client_id', clientId)
    .eq('status', 'Posted')
    .gte('created_at', ninetyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(50)

  if (!historyRows || historyRows.length === 0) return

  const historyLines = historyRows
    .map(p => `[${p.content_pillar || 'General'}][${p.format || 'Post'}] ${p.headline || ''} — ${(p.caption || '').slice(0, 100)}`)
    .join('\n')

  const prompt = `You are analyzing a brand's posted social media content to extract a concise style summary that will guide future AI-generated content.

Recent posted content (last 90 days):
${historyLines}

Write a 2-4 paragraph style summary covering: tone and voice patterns, recurring themes and angles, what formats/lengths work for this brand, and any distinct stylistic choices. Be specific and actionable. This summary will be injected into future content generation prompts.`

  const apiKey = await getAnthropicKey('default')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) return

  const data = await response.json()
  const summary = (data.content?.[0]?.text || '').trim()
  if (!summary) return

  await supabase
    .from('client_briefs')
    .update({ ai_style_summary: summary, updated_at: new Date().toISOString() })
    .eq('client_id', clientId)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { client_id, posts, preview_id } = body as {
      client_id: string
      posts: PlanPost[]
      preview_id: string
    }

    if (!client_id || !Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json(
        { error: 'client_id and a non-empty posts array are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Expand each PlanPost into one row per platform
    const rows = posts.flatMap(post =>
      post.platforms.map(platform => ({
        client_id,
        scheduled_date: post.date || null,
        platform,
        format: post.format || null,
        content_pillar: post.content_pillar || null,
        headline: post.headline || null,
        body_text: post.body_text || null,
        cta: post.cta || null,
        caption: post.caption || null,
        hashtags: Array.isArray(post.hashtags) ? post.hashtags.join(' ') : (post.hashtags || null),
        status: 'Uploads' as const,
      }))
    )

    const { error: insertError } = await supabase.from('posts').insert(rows)
    if (insertError) throw insertError

    // Mark the preview as approved
    if (preview_id) {
      await supabase
        .from('content_plan_previews')
        .update({ status: 'approved', posts })
        .eq('id', preview_id)
    }

    // Fire-and-forget: regenerate ai_style_summary
    refreshStyleSummary(client_id).catch(err =>
      console.error('refreshStyleSummary error (non-fatal):', err)
    )

    return NextResponse.json({ success: true, count: rows.length })
  } catch (err: any) {
    console.error('POST /api/plans/approve error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
