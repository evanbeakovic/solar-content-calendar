'use client'

import { useState, useRef } from 'react'
import { Client, Post } from '@/lib/types'
import Papa from 'papaparse'

interface CSVImportModalProps {
  clients: Client[]
  onClose: () => void
  onImported: (posts: Post[]) => void
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

export default function CSVImportModal({ clients, onClose, onImported }: CSVImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [parsedRows, setParsedRows] = useState<ParsedPost[]>([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'upload' | 'preview'>('upload')

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
          scheduled_date: row['Date'] || '',
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
      onImported(data.posts)
    } else {
      const data = await response.json()
      setError(data.error || 'Import failed')
    }
    setLoading(false)
  }

  const selectedClient = clients.find(c => c.id === selectedClientId)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Import Posts from CSV</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 'upload' ? 'Select a client and upload your CSV file' : `${parsedRows.length} posts ready to import for ${selectedClient?.name}`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="space-y-5">
              {/* Client selector */}
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

              {/* CSV format info */}
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

              {/* File upload */}
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

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
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
      </div>
    </div>
  )
}
