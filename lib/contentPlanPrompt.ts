// Prompt version — bump when prompt logic changes to track which version generated a plan
export const PROMPT_VERSION = '1.0.0'

export interface FrequencyRule {
  platform: string
  posts: number
  stories: number
  reels: number
}

export interface BriefForPrompt {
  business_type: string
  industry: string
  target_audience: string
  brand_voice: string
  content_pillars: string[]
  tone_examples: string
  language: string
  extra_notes: string
  brand_guidelines: string
  ai_style_summary: string
}

export interface HistoryPost {
  headline: string
  caption: string
  format: string
  content_pillar: string
}

export interface BuildContentPlanPromptParams {
  month: string // Human-readable, e.g. "May 2026"
  clientName: string
  brief: BriefForPrompt
  frequencyRules: FrequencyRule[]
  postedHistory: HistoryPost[]
  monthNotes: string
}

export function buildContentPlanPrompt(params: BuildContentPlanPromptParams): string {
  const { month, clientName, brief, frequencyRules, postedHistory, monthNotes } = params

  const pillars =
    brief.content_pillars.length > 0 ? brief.content_pillars.join(', ') : 'Not specified'

  const frequencyLines = frequencyRules
    .map(r => {
      const items: string[] = []
      if (r.posts > 0) items.push(`${r.posts} Post${r.posts !== 1 ? 's' : ''}`)
      if (r.stories > 0) items.push(`${r.stories} Stor${r.stories !== 1 ? 'ies' : 'y'}`)
      if (r.reels > 0) items.push(`${r.reels} Reel${r.reels !== 1 ? 's' : ''}`)
      return `  - ${r.platform}: ${items.length > 0 ? items.join(', ') : '0 posts'}`
    })
    .join('\n')

  const totalItems = frequencyRules.reduce((sum, r) => sum + r.posts + r.stories + r.reels, 0)

  const historyLines =
    postedHistory.length > 0
      ? postedHistory
          .slice(0, 40)
          .map(
            p =>
              `  - [${p.content_pillar || 'General'}][${p.format || 'Post'}] ${p.headline || '(no headline)'} — ${(p.caption || '').slice(0, 80)}`
          )
          .join('\n')
      : '  (no recent history)'

  return `You are a senior social media content strategist generating a complete content plan for ${clientName} for the month of ${month}.

CRITICAL INSTRUCTION: Return ONLY a raw JSON array. No markdown. No code fences. No explanation. No preamble. Your entire response must start with [ and end with ]. Any other format will break the application.

═══════════════════════════════
CLIENT BRIEF
═══════════════════════════════
Business type: ${brief.business_type || 'Not specified'}
Industry: ${brief.industry || 'Not specified'}
Target audience: ${brief.target_audience || 'Not specified'}
Brand voice: ${brief.brand_voice || 'Not specified'}
Content pillars: ${pillars}
Tone examples / writing style: ${brief.tone_examples || 'Not specified'}
Language for all content: ${brief.language || 'English'}
Key dates & campaigns: ${brief.extra_notes || 'None'}
AI style notes: ${brief.ai_style_summary || 'None'}

═══════════════════════════════
BRAND GUIDELINES (follow strictly — these override everything)
═══════════════════════════════
${brief.brand_guidelines || 'No specific guidelines provided.'}

═══════════════════════════════
FREQUENCY REQUIREMENTS (generate exactly this many items per format)
═══════════════════════════════
${frequencyLines}
→ Total posts to generate: ~${totalItems} (cross-platform posts count once — one object with multiple platforms)

═══════════════════════════════
MONTH NOTES — special focus for ${month}
═══════════════════════════════
${monthNotes || 'None specified.'}

═══════════════════════════════
RECENT POSTED CONTENT (last 90 days — never repeat or closely echo these)
═══════════════════════════════
${historyLines}

═══════════════════════════════
POST OBJECT SCHEMA (every object must have ALL of these fields, no extras)
═══════════════════════════════
{
  "date": "YYYY-MM-DD",          // a date within ${month}
  "platforms": ["Platform"],     // array of platform names; use multiple for cross-platform posts
  "format": "Post",              // Post | Story | Reel | Carousel | Article | Video | Short
  "content_pillar": "Education", // one of the content pillars listed above
  "headline": "...",             // short internal working title (not the caption)
  "body_text": "...",            // main copy / body text
  "cta": "...",                  // call to action phrase
  "caption": "...",              // full social media caption with emojis if appropriate
  "hashtags": ["#tag1", "#tag2"] // array of hashtag strings, each starting with #
}

═══════════════════════════════
GENERATION RULES
═══════════════════════════════
1. Return ONLY the JSON array — no markdown, no code blocks, no commentary whatsoever
2. Use ONE post object per content piece, even if it publishes to multiple platforms (put all platforms in the "platforms" array)
3. Distribute posts across the entire month — avoid 2+ posts on the same day unless truly unavoidable
4. Distribute content pillars roughly evenly across the month
5. Platform-format rules (do NOT violate):
   - Instagram: Post, Story, Reel, Carousel
   - Facebook: Post, Story, Reel, Carousel
   - LinkedIn: Post, Article, Carousel (no Reels, no Stories)
   - Twitter / X: Post only (no Stories, no Reels)
   - TikTok: Video (Reels count = Videos for TikTok)
   - YouTube: Video, Short
6. Write ALL content in ${brief.language || 'English'} — this means headline, body_text, cta, caption, everything
7. Match brand voice exactly: ${brief.brand_voice || 'professional and engaging'}
8. Never reuse or closely echo concepts, angles, or headlines from the recent history above
9. Follow all brand guidelines strictly — they override tone suggestions
10. "hashtags" must be an array of strings, not a single string

Generate the full content plan for ${month} now. Output ONLY the JSON array.`
}

export interface BuildSinglePostPromptParams {
  month: string
  clientName: string
  brief: BriefForPrompt
  currentPosts: Array<{
    date: string
    platforms: string[]
    format: string
    content_pillar: string
    headline: string
  }>
  postIndex: number
}

export function buildSinglePostPrompt(params: BuildSinglePostPromptParams): string {
  const { month, clientName, brief, currentPosts, postIndex } = params
  const original = currentPosts[postIndex]

  const otherHeadlines = currentPosts
    .filter((_, i) => i !== postIndex)
    .map(p => `  - ${p.date} [${p.platforms.join('+')}][${p.format}] ${p.headline}`)
    .join('\n')

  return `You are regenerating a single social media post for ${clientName} for ${month}.

CRITICAL: Return ONLY a single JSON object (not an array). Start your response with { and end with }.

Post to replace:
- Date: ${original?.date || 'any weekday in the month'}
- Platforms: ${original?.platforms?.join(', ') || 'Instagram'}
- Format: ${original?.format || 'Post'}
- Content pillar: ${original?.content_pillar || 'any'}

Other posts already planned this month (do NOT duplicate these concepts):
${otherHeadlines || '  (none yet)'}

Client context:
- Brand voice: ${brief.brand_voice || 'professional'}
- Content pillars: ${brief.content_pillars.join(', ')}
- Language: ${brief.language || 'English'}
- Brand guidelines: ${brief.brand_guidelines || 'None'}

Generate ONE replacement post with ALL of these exact fields:
{
  "date": "YYYY-MM-DD",
  "platforms": ["Platform"],
  "format": "...",
  "content_pillar": "...",
  "headline": "...",
  "body_text": "...",
  "cta": "...",
  "caption": "...",
  "hashtags": ["#tag"]
}

Output only the JSON object, nothing else.`
}
