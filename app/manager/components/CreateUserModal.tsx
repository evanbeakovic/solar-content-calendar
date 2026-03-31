'use client'

import { useState } from 'react'
import { Client } from '@/lib/types'

interface CreateUserModalProps {
  clients: Client[]
  onClose: () => void
  onCreated: () => void
}

export default function CreateUserModal({ clients, onClose, onCreated }: CreateUserModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'client' as 'smm' | 'client' | 'manager',
  })
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  
  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, client_ids: selectedClientIds }),
    })

    if (response.ok) {
      setSuccess(true)
      setTimeout(() => {
        onCreated()
        onClose()
      }, 1500)
    } else {
      const data = await response.json()
      setError(data.error || 'Failed to create user')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Create New User</h2>
            <p className="text-xs text-gray-500 mt-0.5">Add a new team member or client account</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {success ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900">User Created!</p>
            <p className="text-gray-500 text-sm mt-1">Account has been set up successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Role selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-2">
                {(['client', 'smm', 'manager'] as const).map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleChange('role', role)}
                    className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all capitalize ${
                      form.role === role
                        ? 'border-[#10375C] bg-[#10375C] text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {role === 'smm' ? 'SMM' : role.charAt(0).toUpperCase() + role.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                  placeholder="jane@company.com"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password <span className="text-red-500">*</span></label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                required
                placeholder="Minimum 8 characters"
                minLength={8}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10375C] text-gray-900"
              />
            </div>

            {/* Client assignment (only for client role) */}
            {form.role === 'client' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Assign to Clients <span className="text-gray-300 font-normal">(select one or more)</span>
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2">
                  {clients.map(c => (
                    <label key={c.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedClientIds.includes(c.id)}
                        onChange={() => {
                          setSelectedClientIds(prev =>
                            prev.includes(c.id)
                              ? prev.filter(x => x !== c.id)
                              : [...prev, c.id]
                          )
                        }}
                        className="w-4 h-4 rounded accent-[#10375C]"
                      />
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-[#10375C]/10 flex items-center justify-center text-[#10375C] text-xs font-bold">
                          {c.name[0]}
                        </div>
                        <span className="text-sm text-gray-700">{c.name}</span>
                      </div>
                    </label>
                  ))}
                  {clients.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">No clients created yet</p>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">The client account will only see posts for assigned clients.</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-[#10375C] text-white font-semibold hover:bg-[#0d2d4a] transition-all disabled:opacity-50 shadow-lg shadow-[#10375C]/20"
              >
                {loading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}