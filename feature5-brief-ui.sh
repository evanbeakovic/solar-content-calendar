#!/bin/bash
# Solar App — Feature 5: Brief Form UI
# Run from project root: /Users/evanbeakovic/Solar App/
# Checkpoint first:
# git add . && git commit -m "checkpoint before: client brief form UI"

# ─── Create BriefTab component ───────────────────────────────────────────────
cat > "app/manager/components/BriefTab.tsx" << 'EOF'
'use client'
import { useState, useEffect } from 'react'

interface BriefTabProps {
  clientId: string
  clientName: string
}

interface Brief {
  id?: string
  client_id: string
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
  updated_at?: string
}

const LANGUAGES = [
  'English', 'Croatian', 'Arabic', 'Spanish', 'French',
  'German', 'Italian', 'Portuguese', 'Dutch', 'Other'
]

const emptyBrief = (clientId: string): Brief => ({
  client_id: clientId,
  business_type: '',
  industry: '',
  target_audience: '',
  brand_voice: '',
  content_pillars: [],
  tone_examples: '',
  language: 'English',
  extra_notes: '',
  brand_guidelines: '',
  ai_style_summary: '',
})

export default function BriefTab({ clientId, clientName }: BriefTabProps) {
  const [brief, setBrief] = useState<Brief>(emptyBrief(clientId))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [pillarInput, setPillarInput] = useState('')
  const [activeSection, setActiveSection] = useState<'brief' | 'guidelines' | 'ai'>('brief')

  useEffect(() => {
    async function fetchBrief() {
      setLoading(true)
      const res = await fetch(`/api/client-briefs?client_id=${clientId}`)
      const data = await res.json()
      if (data.brief) {
        setBrief(data.brief)
      } else {
        setBrief(emptyBrief(clientId))
      }
      setLoading(false)
    }
    fetchBrief()
  }, [clientId])

  function daysSinceUpdate() {
    if (!brief.updated_at) return null
    const diff = Date.now() - new Date(brief.updated_at).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  function addPillar() {
    const val = pillarInput.trim()
    if (!val || brief.content_pillars.includes(val)) return
    setBrief(b => ({ ...b, content_pillars: [...b.content_pillars, val] }))
    setPillarInput('')
  }

  function removePillar(p: string) {
    setBrief(b => ({ ...b, content_pillars: b.content_pillars.filter(x => x !== p) }))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/client-briefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(brief),
    })
    const data = await res.json()
    if (res.ok) {
      setBrief(data.brief)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } else {
      setError(data.error || 'Failed to save brief')
    }
    setSaving(false)
  }

  const days = daysSinceUpdate()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Client Brief</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{clientName}</p>
        </div>
        <div className="flex items-center gap-3">
          {days !== null && days > 60 && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
              ⚠ Last updated {days} days ago
            </span>
          )}
          {days !== null && days <= 60 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Updated {days === 0 ? 'today' : `${days}d ago`}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Brief'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">{error}</p>
      )}

      {/* Section tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {(['brief', 'guidelines', 'ai'] as const).map(s => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === s
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {s === 'brief' ? 'Brief' : s === 'guidelines' ? 'Brand Guidelines' : 'AI Style Summary'}
          </button>
        ))}
      </div>

      {/* ── BRIEF SECTION ── */}
      {activeSection === 'brief' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          <Field label="Business Type" hint="e.g. Auto parts retailer, Law firm, Restaurant">
            <input
              type="text"
              value={brief.business_type}
              onChange={e => setBrief(b => ({ ...b, business_type: e.target.value }))}
              placeholder="e.g. E-commerce fashion brand"
              className="input-style"
            />
          </Field>

          <Field label="Industry">
            <input
              type="text"
              value={brief.industry}
              onChange={e => setBrief(b => ({ ...b, industry: e.target.value }))}
              placeholder="e.g. Automotive, Hospitality, Finance"
              className="input-style"
            />
          </Field>

          <Field label="Target Audience" hint="Who are they trying to reach?" className="md:col-span-2">
            <textarea
              value={brief.target_audience}
              onChange={e => setBrief(b => ({ ...b, target_audience: e.target.value }))}
              placeholder="e.g. Car enthusiasts aged 25–45 in Croatia, interested in motorsport and performance parts"
              rows={3}
              className="input-style resize-none"
            />
          </Field>

          <Field label="Brand Voice" hint="3–5 adjectives or a short description">
            <input
              type="text"
              value={brief.brand_voice}
              onChange={e => setBrief(b => ({ ...b, brand_voice: e.target.value }))}
              placeholder="e.g. Bold, technical, trustworthy, passionate"
              className="input-style"
            />
          </Field>

          <Field label="Language">
            <select
              value={brief.language}
              onChange={e => setBrief(b => ({ ...b, language: e.target.value }))}
              className="input-style"
            >
              {LANGUAGES.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </Field>

          <Field label="Content Pillars" hint="Press Enter or comma to add" className="md:col-span-2">
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pillarInput}
                  onChange={e => setPillarInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addPillar() } }}
                  placeholder="e.g. Education, Promotion, Behind the Scenes"
                  className="input-style flex-1"
                />
                <button
                  onClick={addPillar}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Add
                </button>
              </div>
              {brief.content_pillars.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {brief.content_pillars.map(p => (
                    <span key={p} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm border border-blue-200 dark:border-blue-800">
                      {p}
                      <button onClick={() => removePillar(p)} className="hover:text-blue-900 dark:hover:text-blue-100 font-bold leading-none">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <Field label="Tone Examples" hint="Write like X, not like Y. Paste example captions if helpful." className="md:col-span-2">
            <textarea
              value={brief.tone_examples}
              onChange={e => setBrief(b => ({ ...b, tone_examples: e.target.value }))}
              placeholder="e.g. Write like a knowledgeable friend who loves cars, not like a corporate press release. Short punchy sentences."
              rows={3}
              className="input-style resize-none"
            />
          </Field>

          <Field label="Key Dates & Campaigns" hint="Product launches, seasonal campaigns, holidays that matter" className="md:col-span-2">
            <textarea
              value={brief.extra_notes}
              onChange={e => setBrief(b => ({ ...b, extra_notes: e.target.value }))}
              placeholder="e.g. Spring sale in March, motorsport season starts April, avoid posting on local public holidays"
              rows={3}
              className="input-style resize-none"
            />
          </Field>

        </div>
      )}

      {/* ── BRAND GUIDELINES SECTION ── */}
      {activeSection === 'guidelines' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manually curate guidelines here. These are followed strictly during content generation and override AI suggestions if there is a conflict.
          </p>
          <textarea
            value={brief.brand_guidelines}
            onChange={e => setBrief(b => ({ ...b, brand_guidelines: e.target.value }))}
            placeholder={`e.g.\n- Always mention free shipping on orders over 500 HRK\n- Never use the word "cheap" — use "affordable" instead\n- Product posts must include the part number\n- Emojis are ok but max 2 per caption\n- Always end with a question to drive comments`}
            rows={14}
            className="input-style resize-none w-full font-mono text-sm"
          />
        </div>
      )}

      {/* ── AI STYLE SUMMARY SECTION ── */}
      {activeSection === 'ai' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This is automatically extracted from posted content history after each approved plan. It helps the AI learn what has actually worked for this client. You can edit it manually if the AI gets off track.
          </p>
          <textarea
            value={brief.ai_style_summary}
            onChange={e => setBrief(b => ({ ...b, ai_style_summary: e.target.value }))}
            placeholder="This will be auto-populated after the first content plan is approved and posts are published. You can also write notes here manually."
            rows={14}
            className="input-style resize-none w-full font-mono text-sm"
          />
          {!brief.ai_style_summary && (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">
              No AI style summary yet. This will generate automatically after the first month of posted content.
            </p>
          )}
        </div>
      )}

      {/* Save button bottom */}
      <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Brief'}
        </button>
      </div>

    </div>
  )
}

// ── Reusable field wrapper ────────────────────────────────────────
function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {label}
      </label>
      {hint && <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
      {children}
    </div>
  )
}
EOF

# ─── Add input-style to globals.css ──────────────────────────────────────────
# Check if input-style already exists
if ! grep -q "input-style" app/globals.css; then
  cat >> app/globals.css << 'EOF'

@layer components {
  .input-style {
    @apply w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors;
  }
}
EOF
  echo "✅ input-style added to globals.css"
else
  echo "ℹ input-style already exists in globals.css — skipped"
fi

echo ""
echo "✅ Done. Files created/updated:"
echo "   app/manager/components/BriefTab.tsx (new)"
echo "   app/globals.css (input-style class added)"
echo ""
echo "Next steps:"
echo "  1. npx tsc --noEmit --skipLibCheck 2>&1"
echo "  2. If clean: git add . && git commit -m 'feat: client brief form UI'"
echo "  3. Then tell me — we wire BriefTab into the client record view"
