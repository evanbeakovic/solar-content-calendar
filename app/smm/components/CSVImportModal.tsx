'use client'

import { useState, useRef, useEffect } from 'react'
import { Client, Post } from '@/lib/types'
import Papa from 'papaparse'

interface CSVImportModalProps {
  clients: Client[]
  onClose: () => void
  onImported: (newPosts: Post[], replacedPosts?: Post[]) => void
}

interface CSVRow {
  Date?: string
  Day?: string
  Platform?: string
  Format?: string
  Pillar?: string
  Caption?: string
  Heading?: string
  Body?: string
  CTA?: string
  Background?: string
  'Visual Direction'?: string
  Hashtag?: string
  [key: string]: string | undefined
}

interface ParsedPost {
  client_id: string
  scheduled_date: string
  platform: string
  format: string
  content_pillar: string
  caption: string
  headline: string
  body_text: string
  cta: string
  background_color: string
  visual_direction: string
  hashtags: string
}

interface DuplicateInfo extends ParsedPost {
  existing_id: string
}

type Step = 'upload' | 'preview' | 'duplicates'

export default function CSVImportModal({ clients, onClose, onImported }: CSVImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [parsedRows, setParsedRows] = useState<ParsedPost[]>([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<Step>('upload')
  const [insertedPosts, setInsertedPosts] = useState<Post[]>([])
  const [localReplacedPosts, setLocalReplacedPosts] = useState<Post[]>([])
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([])
  const [replaceErrors, setReplaceErrors] = useState<string[]>([])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!selectedClientId) {
      setError('Please select a client first')
      return
    }

    setFileName(file.name)
    setError('')

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as CSVRow[]
        const parsed: ParsedPost[] = rows.map(row => ({
          client_id: selectedClientId,
          scheduled_date: (() => {
            const raw = row['Date'] || ''
            if (!raw) return ''
            const parts = raw.split('/')
            if (parts.length === 3 && parts[0].length <= 2) {
              return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
            }
            return raw
          })(),
          platform: row['Platform'] || '',
          format: row['Format'] || '',
          content_pillar: row['Pillar'] || '',
          caption: row['Caption'] || '',
          headline: row['Heading'] || '',
          body_text: row['Body'] || '',
          cta: row['CTA'] || '',
          background_color: row['Background'] || '',
          visual_direction: row['Visual Direction'] || '',
          hashtags: row['Hashtag'] || '',
        }))
        setParsedRows(parsed)
        setStep('preview')
      },
      error: (err) => {
        setError('Failed to parse CSV: ' + err.message)
      }
    })
  }

  async function handleImport() {
    if (!parsedRows.length) return
    setLoading(true)
    setError('')

    const response = await fetch('/api/posts/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts: parsedRows }),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.duplicates && data.duplicates.length > 0) {
        setInsertedPosts(data.posts || [])
        setDuplicates(data.duplicates)
        setStep('duplicates')
      } else {
        onImported(data.posts || [])
      }
    } else {
      const data = await response.json()
      setError(data.error || 'Import failed')
    }
    setLoading(false)
  }

  async function handleAddAsCopy() {
    setLoading(true)
    setError('')
    const response = await fetch('/api/posts/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts: duplicates, forceDuplicate: true }),
    })
    if (response.ok) {
      const data = await response.json()
      onImported([...insertedPosts, ...(data.posts || [])])
    } else {
      const data = await response.json()
      setError(data.error || 'Failed to add copies')
    }
    setLoading(false)
  }

  async function handleReplaceExisting() {
    setLoading(true)
    setError('')
    setReplaceErrors([])
    const updatedPosts: Post[] = []
    const errors: string[] = []

    for (const dup of duplicates) {
      try {
        const res = await fetch(`/api/posts/${dup.existing_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: dup.client_id,
            scheduled_date: dup.scheduled_date || null,
            platform: dup.platform || null,
            format: dup.format || null,
            content_pillar: dup.content_pillar || null,
            headline: dup.headline || null,
            body_text: dup.body_text || null,
            cta: dup.cta || null,
            caption: dup.caption || null,
            hashtags: dup.hashtags || null,
            background_color: dup.background_color || null,
            visual_direction: dup.visual_direction || null,
          }),
        })
        if (res.ok) {
          updatedPosts.push(await res.json())
        } else {
          const data = await res.json()
          errors.push(`"${dup.headline || dup.scheduled_date}": ${data.error || 'Failed to update'}`)
        }
      } catch {
        errors.push(`"${dup.headline || dup.scheduled_date}": Network error`)
      }
    }

    if (errors.length > 0) {
      setReplaceErrors(errors)
      // Track successfully replaced posts separately so we can pass them correctly to onImported
      setLocalReplacedPosts(prev => [...prev, ...updatedPosts])
      const updatedIds = new Set(updatedPosts.map(p => p.id))
      setDuplicates(prev => prev.filter(d => !updatedIds.has(d.existing_id)))
    } else {
      // Pass inserted (new) and replaced (same IDs) posts separately so parent can merge correctly
      onImported(insertedPosts, updatedPosts)
    }
    setLoading(false)
  }

  function handleSkipDuplicates() {
    onImported(insertedPosts)
  }

  // Auto-dismiss error after 6 seconds
  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(''), 6000)
    return () => clearTimeout(timer)
  }, [error])

  const selectedClient = clients.find(c => c.id === selectedClientId)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {step === 'duplicates' ? 'Duplicate Posts Found' : 'Import Posts from CSV'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 'upload' && 'Select a client and upload your CSV file'}
              {step === 'preview' && `${parsedRows.length} posts ready to import for ${selectedClient?.name}`}
              {step === 'duplicates' && `${duplicates.length} post${duplicates.length !== 1 ? 's' : ''} already exist in the system`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Error banner — always visible, outside scrollable area */}
        {error && (
          <div className="mx-6 mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Client <span className="text-red-500">*</span></label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900 bg-white"
                >
                  <option value="">Choose a client...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">Expected CSV Columns</h4>
                <div className="flex flex-wrap gap-1.5">
                  {['Date', 'Day', 'Platform', 'Format', 'Pillar', 'Caption', 'Heading', 'Body', 'CTA', 'Background', 'Visual Direction', 'Hashtag'].map(col => (
                    <span key={col} className="text-xs bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded-lg font-mono">
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              <div
                onClick={() => selectedClientId && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
                  selectedClientId
                    ? 'border-[#10375C] border-opacity-30 hover:border-opacity-60 cursor-pointer hover:bg-[#10375C] hover:bg-opacity-5'
                    : 'border-gray-200 cursor-not-allowed opacity-50'
                }`}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10375C" strokeWidth="1.5" className="mx-auto mb-3 opacity-50">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
                <p className="text-gray-600 font-medium">
                  {selectedClientId ? 'Click to upload CSV file' : 'Select a client first'}
                </p>
                <p className="text-gray-400 text-sm mt-1">Supports .csv files</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {fileName && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {fileName} uploaded
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setStep('upload'); setParsedRows([]); setFileName('') }}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                    Back
                  </button>
                  <span className="text-sm font-medium text-gray-900">{parsedRows.length} posts to import</span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">#</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Date</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Platform</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Format</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Heading</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Caption</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">CTA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.scheduled_date}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.platform}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.format}</td>
                        <td className="px-3 py-2 max-w-[200px] truncate">{row.headline}</td>
                        <td className="px-3 py-2 max-w-[200px] truncate">{row.caption}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.cta}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'duplicates' && (
            <div className="space-y-5">
              {insertedPosts.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
                  <strong>{insertedPosts.length}</strong> new post{insertedPosts.length !== 1 ? 's' : ''} were successfully imported.
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  {duplicates.length} post{duplicates.length !== 1 ? 's' : ''} already exist in the system
                </p>
                <p className="text-xs text-amber-700">
                  These posts match an existing post with the same client, date, platform, and headline. What would you like to do?
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">#</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Date</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Platform</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Heading</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duplicates.map((dup, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{dup.scheduled_date}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{dup.platform}</td>
                        <td className="px-3 py-2 max-w-[300px] truncate">{dup.headline}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {replaceErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-red-700 mb-2">{replaceErrors.length} post{replaceErrors.length !== 1 ? 's' : ''} failed to update:</p>
                  <ul className="space-y-1">
                    {replaceErrors.map((err, i) => (
                      <li key={i} className="text-xs text-red-600">{err}</li>
                    ))}
                  </ul>
                  <button
                    onClick={() => onImported(insertedPosts, localReplacedPosts)}
                    className="mt-3 text-xs font-semibold text-red-700 underline hover:no-underline"
                  >
                    Continue with {insertedPosts.length + localReplacedPosts.length} successfully imported post{insertedPosts.length + localReplacedPosts.length !== 1 ? 's' : ''}
                  </button>
                </div>
              )}

              <div />
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'duplicates' && (
          <div className="border-t border-gray-100 px-6 py-4 flex gap-3 flex-wrap">
            <button
              onClick={handleAddAsCopy}
              disabled={loading}
              className="flex-1 min-w-[120px] py-2.5 rounded-xl border-2 border-[#10375C] text-[#10375C] font-semibold hover:bg-[#10375C] hover:text-white transition-all text-sm disabled:opacity-50"
            >
              {loading ? 'Working...' : 'Add as Copy'}
            </button>
            <button
              onClick={handleReplaceExisting}
              disabled={loading}
              className="flex-1 min-w-[120px] py-2.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-all text-sm disabled:opacity-50"
            >
              {loading ? 'Working...' : 'Replace Existing'}
            </button>
            <button
              onClick={handleSkipDuplicates}
              disabled={loading}
              className="flex-1 min-w-[120px] py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all text-sm disabled:opacity-50"
            >
              Skip Duplicates
            </button>
          </div>
        )}
        {step !== 'duplicates' && (
          <div className="border-t border-gray-100 px-6 py-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            {step === 'preview' && (
              <button
                onClick={handleImport}
                disabled={loading || parsedRows.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-[#10375C] text-white font-semibold hover:bg-[#0d2d4a] transition-all disabled:opacity-50 shadow-lg shadow-[#10375C]/20"
              >
                {loading ? 'Importing...' : `Import ${parsedRows.length} Posts`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
