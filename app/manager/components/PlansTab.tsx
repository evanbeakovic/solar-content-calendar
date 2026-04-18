'use client'

import { useState, useEffect, useCallback } from 'react'
import { Client } from '@/lib/types'
import { useApiKeyCheck } from '@/lib/hooks/useApiKeyCheck'
import ApiKeyRequiredModal from './ApiKeyRequiredModal'

// ─── Types ──────────────────────────────────────────────────────────────────

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

interface FrequencyRule {
  platform: string
  posts: number
  stories: number
  reels: number
}

interface FrequencyTemplate {
  id: string
  name: string
  is_default: boolean
  platforms: FrequencyRule[]
}

interface PreviewSummary {
  id: string
  month: string
  post_count: number
  status: string
}

interface PreviewView {
  clientId: string
  clientName: string
  previewId: string
  posts: PlanPost[]
  month: string
}

interface GenerateResult {
  preview_id: string
  month: string
  posts: PlanPost[]
  count: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn', 'Twitter', 'TikTok', 'YouTube']

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  Facebook: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  LinkedIn: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  Twitter: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300',
  TikTok: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  YouTube: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const DEFAULT_PLATFORM_CONFIG: Record<string, { posts: number; stories: number; reels: number }> = {
  Instagram: { posts: 8, stories: 4, reels: 4 },
  Facebook: { posts: 8, stories: 0, reels: 2 },
  LinkedIn: { posts: 6, stories: 0, reels: 0 },
  Twitter: { posts: 8, stories: 0, reels: 0 },
  TikTok: { posts: 0, stories: 0, reels: 4 },
  YouTube: { posts: 0, stories: 0, reels: 2 },
}

const inputClass =
  'w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#10375C]/30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMonthOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 1; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('default', { month: 'long', year: 'numeric' })
    opts.push({ value, label })
  }
  return opts
}

function formatMonthDisplay(month: string): string {
  if (!month) return '—'
  // Already "Month Year" format
  if (!/^\d{4}-\d{2}$/.test(month)) return month
  const [y, m] = month.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  })
}

function formatDateDisplay(yyyyMMDD: string): string {
  if (!yyyyMMDD) return '—'
  const parts = yyyyMMDD.split('-')
  if (parts.length < 3) return yyyyMMDD
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  return d.toLocaleDateString('default', { month: 'short', day: 'numeric' })
}

// ─── EditPostModal ────────────────────────────────────────────────────────────

function EditPostModal({
  post,
  onSave,
  onCancel,
}: {
  post: PlanPost
  onSave: (p: PlanPost) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<PlanPost>({
    ...post,
    platforms: [...post.platforms],
    hashtags: [...post.hashtags],
  })

  function set<K extends keyof PlanPost>(field: K, value: PlanPost[K]) {
    setForm(f => ({ ...f, [field]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Edit Post</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Date</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Format</label>
              <input type="text" value={form.format} onChange={e => set('format', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Platforms (comma-separated)</label>
            <input
              type="text"
              value={form.platforms.join(', ')}
              onChange={e => set('platforms', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Content Pillar</label>
            <input type="text" value={form.content_pillar} onChange={e => set('content_pillar', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Headline</label>
            <input type="text" value={form.headline} onChange={e => set('headline', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Body Text</label>
            <textarea value={form.body_text} onChange={e => set('body_text', e.target.value)} rows={3} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">CTA</label>
            <input type="text" value={form.cta} onChange={e => set('cta', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Caption</label>
            <textarea value={form.caption} onChange={e => set('caption', e.target.value)} rows={4} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Hashtags (comma-separated)</label>
            <input
              type="text"
              value={form.hashtags.join(', ')}
              onChange={e => set('hashtags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              className={inputClass}
            />
          </div>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 bg-[#10375C] hover:bg-[#0d2d4a] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── GenerateModal ────────────────────────────────────────────────────────────

function GenerateModal({
  clientId,
  clientName,
  initialPlatforms,
  onClose,
  onSuccess,
}: {
  clientId: string
  clientName: string
  initialPlatforms?: string[]
  onClose: () => void
  onSuccess: (result: GenerateResult) => void
}) {
  const MONTH_OPTIONS = getMonthOptions()

  const [month, setMonth] = useState(MONTH_OPTIONS[0].value)
  const [templates, setTemplates] = useState<FrequencyTemplate[]>([])
  const [templateId, setTemplateId] = useState<string>('manual')
  const [editFrequency, setEditFrequency] = useState(true)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(initialPlatforms || [])
  const [platformConfig, setPlatformConfig] = useState<Record<string, { posts: number; stories: number; reels: number }>>(() => {
    const config: Record<string, { posts: number; stories: number; reels: number }> = {}
    for (const p of initialPlatforms || []) {
      config[p] = { ...(DEFAULT_PLATFORM_CONFIG[p] || { posts: 4, stories: 0, reels: 0 }) }
    }
    return config
  })
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [setAsDefault, setSetAsDefault] = useState(false)
  const [monthNotes, setMonthNotes] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const { hasKey } = useApiKeyCheck()

  // Load templates and auto-select default
  useEffect(() => {
    fetch(`/api/content-frequency-templates?client_id=${clientId}`)
      .then(r => r.json())
      .then(d => {
        const tpls: FrequencyTemplate[] = d.templates || []
        setTemplates(tpls)
        if (!initialPlatforms) {
          const def = tpls.find(t => t.is_default)
          if (def) {
            setTemplateId(def.id)
            applyTemplate(def)
            setEditFrequency(false)
          }
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  function applyTemplate(tpl: FrequencyTemplate) {
    const platforms = tpl.platforms.map(r => r.platform)
    setSelectedPlatforms(platforms)
    const config: Record<string, { posts: number; stories: number; reels: number }> = {}
    for (const r of tpl.platforms) {
      config[r.platform] = { posts: r.posts, stories: r.stories, reels: r.reels }
    }
    setPlatformConfig(config)
  }

  function handleTemplateChange(id: string) {
    setTemplateId(id)
    if (id === 'manual') {
      setSelectedPlatforms([])
      setPlatformConfig({})
      setEditFrequency(true)
    } else {
      const tpl = templates.find(t => t.id === id)
      if (tpl) { applyTemplate(tpl); setEditFrequency(false) }
    }
  }

  function togglePlatform(p: string) {
    setSelectedPlatforms(prev => {
      if (prev.includes(p)) return prev.filter(x => x !== p)
      if (!platformConfig[p]) {
        setPlatformConfig(c => ({
          ...c,
          [p]: { ...(DEFAULT_PLATFORM_CONFIG[p] || { posts: 4, stories: 0, reels: 0 }) },
        }))
      }
      return [...prev, p]
    })
  }

  function updateConfig(platform: string, field: 'posts' | 'stories' | 'reels', value: number) {
    setPlatformConfig(c => ({ ...c, [platform]: { ...c[platform], [field]: Math.max(0, value) } }))
  }

  const showFrequencyBuilder = templateId === 'manual' || editFrequency

  async function handleGenerate() {
    if (hasKey === false) { setShowApiKeyModal(true); return }
    if (selectedPlatforms.length === 0) { setGenerateError('Select at least one platform'); return }
    const total = selectedPlatforms.reduce((sum, p) => {
      const c = platformConfig[p] || { posts: 0, stories: 0, reels: 0 }
      return sum + c.posts + c.stories + c.reels
    }, 0)
    if (total === 0) { setGenerateError('Configure at least 1 post for the selected platforms'); return }

    setGenerating(true)
    setGenerateError('')

    try {
      // Optionally save template first
      let savedTemplateId: string | null = null
      if (saveAsTemplate && templateName.trim()) {
        const tplRes = await fetch('/api/content-frequency-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            name: templateName.trim(),
            platforms: selectedPlatforms.map(p => ({
              platform: p,
              ...(platformConfig[p] || { posts: 0, stories: 0, reels: 0 }),
            })),
            is_default: setAsDefault,
          }),
        })
        const tplData = await tplRes.json()
        savedTemplateId = tplData.template?.id || null
      }

      const frequencyRules: FrequencyRule[] = selectedPlatforms.map(p => ({
        platform: p,
        posts: platformConfig[p]?.posts ?? 0,
        stories: platformConfig[p]?.stories ?? 0,
        reels: platformConfig[p]?.reels ?? 0,
      }))

      const res = await fetch('/api/generate-content-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          month,
          frequency_template_id:
            savedTemplateId || (templateId !== 'manual' ? templateId : null),
          platforms: frequencyRules,
          month_notes: monthNotes,
          generated_by: 'manager', // TODO: use authenticated user id from session
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')

      onSuccess(data as GenerateResult)
    } catch (err: any) {
      setGenerateError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  if (showApiKeyModal) {
    return (
      <ApiKeyRequiredModal
        onClose={() => setShowApiKeyModal(false)}
        onSuccess={() => { setShowApiKeyModal(false); handleGenerate() }}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-start justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Generate Content Plan</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{clientName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          {/* Month */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Month</label>
            <select value={month} onChange={e => setMonth(e.target.value)} className={inputClass}>
              {MONTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Template selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Frequency Template</label>
            <select value={templateId} onChange={e => handleTemplateChange(e.target.value)} className={inputClass}>
              <option value="manual">No template — configure manually</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}{t.is_default ? ' (default)' : ''}</option>
              ))}
            </select>
            {templateId !== 'manual' && !editFrequency && selectedPlatforms.length > 0 && (
              <button
                type="button"
                onClick={() => setEditFrequency(true)}
                className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Edit for this month
              </button>
            )}
          </div>

          {/* Frequency builder */}
          {showFrequencyBuilder && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Platforms & Frequency</label>
              <div className="flex flex-wrap gap-2">
                {ALL_PLATFORMS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      selectedPlatforms.includes(p)
                        ? 'bg-[#10375C] text-white border-[#10375C]'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-[#10375C]/50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              {selectedPlatforms.length > 0 && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800">
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Platform</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Posts</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Stories</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Reels</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPlatforms.map(p => (
                        <tr key={p} className="border-t border-gray-100 dark:border-gray-700">
                          <td className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">{p}</td>
                          {(['posts', 'stories', 'reels'] as const).map(field => (
                            <td key={field} className="px-2 py-1.5">
                              <input
                                type="number"
                                min={0}
                                value={platformConfig[p]?.[field] ?? 0}
                                onChange={e => updateConfig(p, field, Number(e.target.value))}
                                className="w-16 px-2 py-1 text-center rounded-lg text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-[#10375C]/30 mx-auto block"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Cross-platform posts are counted once — selecting Instagram + Facebook with 2 posts = 2 posts total, published to both.
              </p>
            </div>
          )}

          {/* Save as template */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={saveAsTemplate}
                onChange={e => setSaveAsTemplate(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-[#10375C]"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Save as template</span>
            </label>
            {saveAsTemplate && (
              <div className="ml-5 space-y-2">
                <input
                  type="text"
                  placeholder="Template name (e.g. Monthly Standard)"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  className={inputClass}
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setAsDefault}
                    onChange={e => setSetAsDefault(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-[#10375C]"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Set as default for this client</span>
                </label>
              </div>
            )}
          </div>

          {/* Month notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Month Notes</label>
            <textarea
              value={monthNotes}
              onChange={e => setMonthNotes(e.target.value)}
              placeholder="Anything special this month? (campaigns, holidays, focus)"
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>

          {generateError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
              <p className="text-sm text-red-700 dark:text-red-300">{generateError}</p>
              <button
                onClick={() => setGenerateError('')}
                className="mt-1 text-xs text-red-600 dark:text-red-400 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={generating}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-5 py-2 bg-[#10375C] hover:bg-[#0d2d4a] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {generating && (
              <svg className="animate-spin w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {generating ? 'Generating your content plan…' : 'Generate Plan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── PreviewTable ─────────────────────────────────────────────────────────────

function PreviewTable({
  clientId,
  clientName,
  previewId,
  initialPosts,
  month,
  onBack,
  onApproved,
  onRegenerate,
}: {
  clientId: string
  clientName: string
  previewId: string
  initialPosts: PlanPost[]
  month: string
  onBack: () => void
  onApproved: () => void
  onRegenerate: (initialPlatforms?: string[]) => void
}) {
  const [posts, setPosts] = useState<PlanPost[]>(initialPosts)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null)
  const [approving, setApproving] = useState(false)
  const [approveError, setApproveError] = useState('')
  const [approveSuccess, setApproveSuccess] = useState('')
  const [regenDropdownOpen, setRegenDropdownOpen] = useState(false)

  const allPlatforms = [...new Set(posts.flatMap(p => p.platforms))]

  async function handleRegenerateSingle(idx: number) {
    setRegeneratingIdx(idx)
    try {
      const res = await fetch('/api/generate-content-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          month,
          platforms: allPlatforms.map(p => ({
            platform: p,
            posts: posts.filter(pp => pp.platforms.includes(p) && pp.format !== 'Story' && pp.format !== 'Reel' && pp.format !== 'Video').length,
            stories: posts.filter(pp => pp.platforms.includes(p) && pp.format === 'Story').length,
            reels: posts.filter(pp => pp.platforms.includes(p) && (pp.format === 'Reel' || pp.format === 'Video')).length,
          })),
          mode: 'single',
          post_index: idx,
          current_posts: posts.map(p => ({
            date: p.date,
            platforms: p.platforms,
            format: p.format,
            content_pillar: p.content_pillar,
            headline: p.headline,
          })),
          generated_by: 'manager',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Regeneration failed')
      setPosts(prev => prev.map((p, i) => (i === idx ? (data.post as PlanPost) : p)))
    } catch (err: any) {
      alert(`Regeneration failed: ${err.message}`)
    } finally {
      setRegeneratingIdx(null)
    }
  }

  async function handleApprove() {
    setApproving(true)
    setApproveError('')
    try {
      const res = await fetch('/api/plans/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, posts, preview_id: previewId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Approval failed')

      setApproveSuccess(`${data.count} posts created and added to your content pipeline`)
      onApproved()
    } catch (err: any) {
      setApproveError(err.message)
    } finally {
      setApproving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            All Clients
          </button>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="text-base font-bold text-gray-900 dark:text-white">{clientName}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">— {formatMonthDisplay(month)}</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
            {posts.length} posts pending review
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onRegenerate()}
            className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Regenerate All
          </button>
          <div className="relative">
            <button
              onClick={() => setRegenDropdownOpen(v => !v)}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
            >
              By Platform
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {regenDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setRegenDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20 min-w-[140px]">
                  {allPlatforms.map(p => (
                    <button
                      key={p}
                      onClick={() => { setRegenDropdownOpen(false); onRegenerate([p]) }}
                      className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleApprove}
            disabled={approving || !!approveSuccess}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {approving && (
              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {approving ? 'Approving…' : approveSuccess ? '✓ Approved' : 'Approve & Create Posts'}
          </button>
        </div>
      </div>

      {approveSuccess && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
          <p className="text-sm text-green-700 dark:text-green-300">✓ {approveSuccess}</p>
        </div>
      )}
      {approveError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
          <p className="text-sm text-red-700 dark:text-red-300">{approveError}</p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm" style={{ minWidth: 900 }}>
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Platforms</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Format</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pillar</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Headline</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Caption</th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post, idx) => (
              <tr
                key={idx}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
              >
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {formatDateDisplay(post.date)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {post.platforms.map(p => (
                      <span
                        key={p}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PLATFORM_COLORS[p] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{post.format}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[120px]">
                  <span className="truncate block">{post.content_pillar}</span>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[180px]">
                  <span className="truncate block font-medium">{post.headline}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[200px]">
                  <span className="truncate block">
                    {post.caption?.slice(0, 80)}{(post.caption?.length ?? 0) > 80 ? '…' : ''}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-0.5">
                    {/* Edit */}
                    <button
                      onClick={() => setEditingIdx(idx)}
                      title="Edit"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    {/* Regenerate single */}
                    <button
                      onClick={() => handleRegenerateSingle(idx)}
                      disabled={regeneratingIdx === idx}
                      title="Regenerate this post"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-40"
                    >
                      {regeneratingIdx === idx ? (
                        <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="1 4 1 10 7 10" />
                          <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                        </svg>
                      )}
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => setPosts(prev => prev.filter((_, i) => i !== idx))}
                      title="Remove post"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400 dark:text-gray-500">
                  All posts removed. Generate a new plan or go back.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editingIdx !== null && (
        <EditPostModal
          post={posts[editingIdx]}
          onSave={updated => {
            setPosts(prev => prev.map((p, i) => (i === editingIdx ? updated : p)))
            setEditingIdx(null)
          }}
          onCancel={() => setEditingIdx(null)}
        />
      )}
    </div>
  )
}

// ─── PlansTab (main export) ───────────────────────────────────────────────────

export default function PlansTab() {
  const [clients, setClients] = useState<Client[]>([])
  const [previews, setPreviews] = useState<Record<string, PreviewSummary | null>>({})
  const [loading, setLoading] = useState(true)
  const [generateModal, setGenerateModal] = useState<{
    clientId: string
    clientName: string
    initialPlatforms?: string[]
  } | null>(null)
  const [previewView, setPreviewView] = useState<PreviewView | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const clientsRes = await fetch('/api/clients')
      const clientsData = await clientsRes.json()
      const clientList: Client[] = Array.isArray(clientsData) ? clientsData : []
      setClients(clientList)

      const previewMap: Record<string, PreviewSummary | null> = {}
      await Promise.all(
        clientList.map(async c => {
          try {
            const res = await fetch(`/api/content-plan-previews?client_id=${c.id}`)
            const d = await res.json()
            const list: any[] = d.previews || []
            const latest = list.find(p => p.status === 'pending' || p.status === 'approved')
            previewMap[c.id] = latest
              ? {
                  id: latest.id,
                  month: latest.month,
                  post_count: Array.isArray(latest.posts) ? latest.posts.length : 0,
                  status: latest.status,
                }
              : null
          } catch {
            previewMap[c.id] = null
          }
        })
      )
      setPreviews(previewMap)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleOpenPreview(client: Client) {
    const summary = previews[client.id]
    if (!summary) return
    const res = await fetch(`/api/content-plan-previews?client_id=${client.id}`)
    const d = await res.json()
    const latest = (d.previews || []).find((p: any) => p.id === summary.id)
    if (!latest) return
    setPreviewView({
      clientId: client.id,
      clientName: client.name,
      previewId: latest.id,
      posts: Array.isArray(latest.posts) ? (latest.posts as PlanPost[]) : [],
      month: latest.month,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {previewView ? (
        <PreviewTable
          clientId={previewView.clientId}
          clientName={previewView.clientName}
          previewId={previewView.previewId}
          initialPosts={previewView.posts}
          month={previewView.month}
          onBack={() => setPreviewView(null)}
          onApproved={async () => { setPreviewView(null); await loadData() }}
          onRegenerate={initialPlatforms =>
            setGenerateModal({
              clientId: previewView.clientId,
              clientName: previewView.clientName,
              initialPlatforms,
            })
          }
        />
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Content Plans</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
              Generate and manage monthly content plans for each client
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Posts</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {clients.map(client => {
                  const preview = previews[client.id]
                  return (
                    <tr
                      key={client.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#10375C]/10 dark:bg-[#10375C]/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-[#10375C] dark:text-blue-300">
                              {client.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{client.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {preview ? formatMonthDisplay(preview.month) : <span className="text-gray-400 dark:text-gray-500">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {preview ? preview.post_count : <span className="text-gray-400 dark:text-gray-500">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {preview ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              preview.status === 'approved'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            }`}
                          >
                            {preview.status === 'approved' ? 'Approved' : 'Pending Review'}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-xs">No plan</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          {preview && (
                            <button
                              onClick={() => handleOpenPreview(client)}
                              className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            >
                              View Plan
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setGenerateModal({ clientId: client.id, clientName: client.name })
                            }
                            className="px-3 py-1.5 bg-[#10375C] hover:bg-[#0d2d4a] text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            Generate Plan
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {clients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                      No clients yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {generateModal && (
        <GenerateModal
          clientId={generateModal.clientId}
          clientName={generateModal.clientName}
          initialPlatforms={generateModal.initialPlatforms}
          onClose={() => setGenerateModal(null)}
          onSuccess={result => {
            setGenerateModal(null)
            setPreviewView({
              clientId: generateModal.clientId,
              clientName: generateModal.clientName,
              previewId: result.preview_id,
              posts: result.posts,
              month: result.month,
            })
            loadData()
          }}
        />
      )}
    </div>
  )
}
