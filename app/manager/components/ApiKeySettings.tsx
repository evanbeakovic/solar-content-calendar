'use client'

import { useState, useEffect } from 'react'

// TODO: account_id should come from the authenticated session in a multi-tenant future
const ACCOUNT_ID = 'default'

export default function ApiKeySettings() {
  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [lastFour, setLastFour] = useState<string | null>(null)
  const [inputKey, setInputKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [testResult, setTestResult] = useState('')

  useEffect(() => {
    fetchStatus()
  }, [])

  async function fetchStatus() {
    try {
      const res = await fetch('/api/account-settings/anthropic-key')
      const data = await res.json()
      setHasKey(data.hasKey)
      setLastFour(data.lastFour)
    } catch {
      setHasKey(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!inputKey.trim()) { setError('Please enter an API key'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/account-settings/anthropic-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: inputKey, account_id: ACCOUNT_ID }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save key')
      setSuccess('API key saved successfully')
      setInputKey('')
      await fetchStatus()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove() {
    setError('')
    setSuccess('')
    setTestResult('')
    setLoading(true)
    try {
      const res = await fetch('/api/account-settings/anthropic-key', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: ACCOUNT_ID }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to remove key')
      setSuccess('API key removed')
      await fetchStatus()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleTest() {
    setTestResult('')
    setError('')
    setTestLoading(true)
    try {
      const res = await fetch('/api/account-settings/anthropic-key/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: ACCOUNT_ID }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Test failed')
      setTestResult('Key is valid and working')
    } catch (err: any) {
      setError(`Test failed: ${err.message}`)
    } finally {
      setTestLoading(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#10375C]/30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500'

  if (hasKey === null) {
    return <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">Loading...</div>
  }

  return (
    <div className="ml-2 mt-1 rounded-xl p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 space-y-3">
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Anthropic API Key</p>

      {hasKey ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            API key saved{lastFour ? ` (ending in ${lastFour})` : ''}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testLoading || loading}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {testLoading ? 'Testing...' : 'Test Key'}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={loading || testLoading}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              {loading ? 'Removing...' : 'Remove'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-2">
          <input
            type="password"
            placeholder="sk-ant-..."
            value={inputKey}
            onChange={e => { setInputKey(e.target.value); setError(''); setSuccess('') }}
            className={inputClass}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-1.5 rounded-lg text-xs font-semibold bg-[#10375C] text-white hover:bg-[#0d2d4a] transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Key'}
          </button>
        </form>
      )}

      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
      {success && <p className="text-xs text-green-600 dark:text-green-400">{success}</p>}
      {testResult && <p className="text-xs text-green-600 dark:text-green-400">{testResult}</p>}
    </div>
  )
}
