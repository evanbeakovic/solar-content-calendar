'use client'

import { useState, useRef, useEffect } from 'react'
import { Client, Post } from '@/lib/types'
import Papa from 'papaparse'

interface CsvImporterProps {
  clients: Client[]
  onClose: () => void
  onImported: (newPosts: Post[]) => void
}

const POST_FIELDS = [
  { key: 'date',             label: 'Date' },
  { key: 'platform',         label: 'Platform' },
  { key: 'format',           label: 'Format' },
  { key: 'headline',         label: 'Headline' },
  { key: 'body_text',        label: 'Body Text' },
  { key: 'caption',          label: 'Caption' },
  { key: 'hashtags',         label: 'Hashtags' },
  { key: 'cta',              label: 'CTA' },
  { key: 'content_pillar',   label: 'Content Pillar' },
  { key: 'background_color', label: 'Background' },
  { key: 'visual_direction', label: 'Visual Direction' },
] as const

type PostFieldKey = typeof POST_FIELDS[number]['key']
type ColumnMapping = Record<string, PostFieldKey | ''>

const AUTO_MAP_RULES: Array<{ patterns: RegExp[]; field: PostFieldKey }> = [
  { patterns: [/^date$/i, /^day$/i, /^scheduled.?date$/i],            field: 'date' },
  { patterns: [/^platform$/i],                                         field: 'platform' },
  { patterns: [/^format$/i],                                           field: 'format' },
  { patterns: [/^headline$/i, /^heading$/i, /^head$/i, /^title$/i],   field: 'headline' },
  { patterns: [/^body.?text$/i, /^body$/i, /^copy$/i],                field: 'body_text' },
  { patterns: [/^caption$/i],                                          field: 'caption' },
  { patterns: [/^hashtag(s)?$/i, /^tags?$/i],                         field: 'hashtags' },
  { patterns: [/^cta$/i, /^call.?to.?action$/i],                      field: 'cta' },
  { patterns: [/^(content.?)?pillar$/i],                               field: 'content_pillar' },
  { patterns: [/^background(.?color)?$/i, /^bg.?color$/i],            field: 'background_color' },
  { patterns: [/^visual.?direction$/i, /^visual$/i, /^direction$/i],  field: 'visual_direction' },
]

function autoMapColumn(col: string): PostFieldKey | '' {
  for (const rule of AUTO_MAP_RULES) {
    if (rule.patterns.some(p => p.test(col.trim()))) return rule.field
  }
  return ''
}

function loadSavedMapping(clientId: string): ColumnMapping {
  try {
    const raw = localStorage.getItem(`csv-mapping-${clientId}`)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function persistMapping(clientId: string, mapping: ColumnMapping) {
  try {
    localStorage.setItem(`csv-mapping-${clientId}`, JSON.stringify(mapping))
  } catch {}
}

function buildInitialMapping(cols: string[], saved: ColumnMapping): ColumnMapping {
  const result: ColumnMapping = {}
  for (const col of cols) {
    result[col] = saved[col] !== undefined ? saved[col] : autoMapColumn(col)
  }
  return result
}

type Step = 'upload' | 'mapping' | 'summary'

interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
  posts: Post[]
}

const PREVIEW_ROWS = 3

export default function CsvImporter({ clients, onClose, onImported }: CsvImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [fileName, setFileName] = useState('')
  const [csvColumns, setCsvColumns] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)

  // Auto-dismiss errors after 6 s
  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(''), 6000)
    return () => clearTimeout(t)
  }, [error])

  function handleClientChange(clientId: string) {
    setSelectedClientId(clientId)
    if (csvColumns.length > 0 && clientId) {
      const saved = loadSavedMapping(clientId)
      setMapping(buildInitialMapping(csvColumns, saved))
    }
  }

  function processFile(file: File) {
    if (!selectedClientId) {
      setError('Please select a client first')
      return
    }
    setFileName(file.name)
    setError('')

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[]
        if (rows.length === 0) { setError('CSV file has no data rows'); return }
        const cols = Object.keys(rows[0])
        setCsvColumns(cols)
        setCsvRows(rows)
        const saved = loadSavedMapping(selectedClientId)
        setMapping(buildInitialMapping(cols, saved))
        setStep('mapping')
      },
      error: (err) => setError('Failed to parse CSV: ' + err.message),
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) {
      processFile(file)
    } else {
      setError('Please drop a .csv file')
    }
  }

  function updateMapping(col: string, field: PostFieldKey | '') {
    setMapping(prev => ({ ...prev, [col]: field }))
  }

  async function handleImport() {
    setLoading(true)
    setError('')

    const posts = csvRows.map(row => {
      const post: Record<string, string> = { client_id: selectedClientId }
      for (const [col, field] of Object.entries(mapping)) {
        if (!field) continue
        const apiKey = field === 'date' ? 'scheduled_date' : field
        post[apiKey] = row[col] ?? ''
      }
      return post
    })

    persistMapping(selectedClientId, mapping)

    const res = await fetch('/api/posts/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Import failed')
      return
    }

    setResult({
      imported: data.imported ?? 0,
      skipped: data.skipped ?? 0,
      errors: data.errors ?? [],
      posts: data.posts ?? [],
    })
    setStep('summary')
  }

  function handleDone() {
    if (result?.posts.length) onImported(result.posts)
    else onClose()
  }

  const selectedClient = clients.find(c => c.id === selectedClientId)
  const hasAnyMapping = Object.values(mapping).some(Boolean)
  const mappedEntries = Object.entries(mapping).filter(([, v]) => v)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">

        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {step === 'upload'  && 'Import Posts from CSV'}
              {step === 'mapping' && 'Map CSV Columns'}
              {step === 'summary' && 'Import Complete'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {step === 'upload'  && 'Select a client and upload your CSV file'}
              {step === 'mapping' && `${csvRows.length} rows · ${csvColumns.length} columns · ${selectedClient?.name}`}
              {step === 'summary' && result && `${result.imported} imported · ${result.skipped} skipped`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-2 shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Step 1: Upload ── */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Client <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedClientId}
                  onChange={e => handleClientChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                >
                  <option value="">Choose a client…</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => selectedClientId && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
                  isDragging
                    ? 'border-[#10375C] bg-[#10375C]/5 dark:bg-[#10375C]/10'
                    : selectedClientId
                    ? 'border-gray-300 dark:border-gray-600 hover:border-[#10375C] hover:bg-[#10375C]/5 dark:hover:bg-[#10375C]/10 cursor-pointer'
                    : 'border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-50'
                }`}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10375C" strokeWidth="1.5" className="mx-auto mb-3 opacity-50">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
                <p className="text-gray-600 dark:text-gray-300 font-medium">
                  {isDragging ? 'Drop CSV here' : selectedClientId ? 'Drag & drop or click to upload' : 'Select a client first'}
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Supports .csv files</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />

              {fileName && (
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl px-4 py-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {fileName}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Column Mapping ── */}
          {step === 'mapping' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setStep('upload'); setCsvColumns([]); setCsvRows([]); setFileName('') }}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                  Back
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Match each CSV column to a post field. Auto-filled based on column names — adjust as needed.
                </span>
              </div>

              {/* Mapping table */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 w-[30%]">CSV Column</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 w-[35%]">Sample Values</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 w-[35%]">Maps To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvColumns.map((col, i) => {
                      const samples = csvRows.slice(0, PREVIEW_ROWS).map(r => r[col]).filter(Boolean)
                      const mapped = mapping[col] ?? ''
                      return (
                        <tr key={col} className={`border-b border-gray-100 dark:border-gray-700/50 ${i % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''}`}>
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-700 dark:text-gray-300 font-medium">{col}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-col gap-0.5">
                              {samples.slice(0, 2).map((s, j) => (
                                <span key={j} className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]" title={s}>{s}</span>
                              ))}
                              {samples.length === 0 && (
                                <span className="text-xs text-gray-300 dark:text-gray-600 italic">empty</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <select
                              value={mapped}
                              onChange={e => updateMapping(col, e.target.value as PostFieldKey | '')}
                              className={`w-full px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#10375C]/30 bg-white dark:bg-gray-800 ${
                                mapped
                                  ? 'border-[#10375C]/30 dark:border-blue-700/50 text-[#10375C] dark:text-blue-300 font-medium'
                                  : 'border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                              }`}
                            >
                              <option value="">(ignore)</option>
                              {POST_FIELDS.map(f => (
                                <option key={f.key} value={f.key}>{f.label}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Preview table */}
              {mappedEntries.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Preview — first {Math.min(PREVIEW_ROWS, csvRows.length)} rows
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                          {mappedEntries.map(([col, field]) => (
                            <th key={col} className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              {POST_FIELDS.find(f => f.key === field)?.label ?? field}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvRows.slice(0, PREVIEW_ROWS).map((row, ri) => (
                          <tr key={ri} className="border-b border-gray-100 dark:border-gray-700/50">
                            {mappedEntries.map(([col]) => (
                              <td key={col} className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-[160px] truncate" title={row[col]}>
                                {row[col] || <span className="text-gray-300 dark:text-gray-600">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Summary ── */}
          {step === 'summary' && result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl p-5 text-center">
                  <div className="text-4xl font-bold text-green-700 dark:text-green-300">{result.imported}</div>
                  <div className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">Posts Imported</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-5 text-center">
                  <div className="text-4xl font-bold text-amber-700 dark:text-amber-300">{result.skipped}</div>
                  <div className="text-sm text-amber-600 dark:text-amber-400 font-medium mt-1">Duplicates Skipped</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">
                    {result.errors.length} row{result.errors.length !== 1 ? 's' : ''} had errors:
                  </p>
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <li key={i} className="text-xs text-red-600 dark:text-red-400">{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.imported === 0 && result.skipped === 0 && result.errors.length === 0 && (
                <p className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">No posts were processed.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 dark:border-gray-700 px-6 py-4 flex gap-3 shrink-0">
          {step !== 'summary' && (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm"
            >
              Cancel
            </button>
          )}

          {step === 'mapping' && (
            <button
              onClick={handleImport}
              disabled={loading || !hasAnyMapping}
              className="flex-1 py-2.5 rounded-xl bg-[#10375C] text-white font-semibold hover:bg-[#0d2d4a] transition-all text-sm disabled:opacity-50 shadow-lg shadow-[#10375C]/20"
            >
              {loading ? 'Importing…' : `Import ${csvRows.length} Posts`}
            </button>
          )}

          {step === 'summary' && (
            <button
              onClick={handleDone}
              className="flex-1 py-2.5 rounded-xl bg-[#10375C] text-white font-semibold hover:bg-[#0d2d4a] transition-all text-sm shadow-lg shadow-[#10375C]/20"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
