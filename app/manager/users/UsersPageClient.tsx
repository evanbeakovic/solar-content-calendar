'use client'

import { useState, useRef } from 'react'
import { Profile, Client, Role } from '@/lib/types'
import { format } from 'date-fns'
import CreateUserModal from '../components/CreateUserModal'
import BriefTab from '../components/BriefTab'

interface UsersPageClientProps {
  initialProfiles: (Profile & { client?: Client; clients?: Client[] })[]
  clients: Client[]
}

const ROLE_STYLES: Record<string, string> = {
  smm: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  client: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  manager: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
}

type Tab = 'users' | 'clients'

function getLogoUrl(logoPath: string | null | undefined): string | null {
  return logoPath || null
}

// ── Edit User Modal ──────────────────────────────────────────────
function EditUserModal({
  profile,
  clients,
  onClose,
  onSaved,
}: {
  profile: Profile & { clients?: Client[] }
  clients: Client[]
  onClose: () => void
  onSaved: () => void
}) {
  const [fullName, setFullName] = useState(profile.full_name || '')
  const [role, setRole] = useState<Role>(profile.role)
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>(
    (profile.clients || []).map(c => c.id)
  )
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleClient(id: string) {
    setSelectedClientIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleSave() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: profile.id,
        full_name: fullName,
        role,
        client_ids: selectedClientIds,
        password: password || undefined,
      }),
    })
    if (res.ok) {
      onSaved()
    } else {
      const data = await res.json()
      setError(data.error || 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Edit User</h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">{profile.email}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Full Name</label>
            <input
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#10375C]/20 focus:border-[#10375C]"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Full name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Role</label>
            <select
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#10375C]/20 focus:border-[#10375C]"
              value={role}
              onChange={e => setRole(e.target.value as Role)}
            >
              <option value="manager">Manager</option>
              <option value="smm">SMM</option>
              <option value="client">Client</option>
            </select>
          </div>

          {role === 'client' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Assigned Clients <span className="text-gray-300 dark:text-gray-600 font-normal normal-case">(select one or more)</span>
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-xl p-2 bg-white dark:bg-gray-800">
                {clients.map(c => (
                  <label key={c.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedClientIds.includes(c.id)}
                      onChange={() => toggleClient(c.id)}
                      className="w-4 h-4 rounded accent-[#10375C]"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{c.name}</span>
                  </label>
                ))}
                {clients.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">No clients created yet</p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              New Password <span className="text-gray-300 dark:text-gray-600 font-normal normal-case">(leave blank to keep current)</span>
            </label>
            <input
              type="password"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#10375C]/20 focus:border-[#10375C]"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#10375C] text-white text-sm font-semibold hover:bg-[#0d2d4a] transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Client Modal ────────────────────────────────────────────

// ── Brief Modal ──────────────────────────────────────────────────
function BriefModal({
  client,
  onClose,
}: {
  client: Client
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Client Brief</span>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            ✕
          </button>
        </div>
        <BriefTab clientId={client.id} clientName={client.name} />
      </div>
    </div>
  )
}

function EditClientModal({
  client,
  onClose,
  onSaved,
}: {
  client: Client
  onClose: () => void
  onSaved: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(client.name)
  const [brandPrimary, setBrandPrimary] = useState(client.brand_primary || '#10375C')
  const [brandSecondary, setBrandSecondary] = useState(client.brand_secondary || '#8EE3E3')
  const [logoUrl, setLogoUrl] = useState<string | null>(getLogoUrl(client.logo_path))
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [briefOpen, setBriefOpen] = useState(false)

  async function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    setError('')
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/clients/${client.id}/logo`, {
      method: 'POST',
      body: formData,
    })
    if (res.ok) {
      const data = await res.json()
      setLogoUrl(data.publicUrl)
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to upload logo')
    }
    setUploadingLogo(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleRemoveLogo() {
    setUploadingLogo(true)
    await fetch(`/api/clients/${client.id}/logo`, { method: 'DELETE' })
    setLogoUrl(null)
    setUploadingLogo(false)
  }

  async function handleSave() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/clients', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: client.id, name, brand_primary: brandPrimary, brand_secondary: brandSecondary }),
    })
    if (res.ok) {
      onSaved()
    } else {
      const data = await res.json()
      setError(data.error || 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Edit Client</h2>
        <div className="space-y-4">
          {/* Logo upload */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Logo</label>
            <div className="flex items-center gap-4">
              {/* Preview */}
              <div className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-gray-300 dark:text-gray-600">{client.name[0]}</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#10375C] text-[#10375C] hover:bg-[#10375C]/5 transition-colors disabled:opacity-50"
                >
                  {uploadingLogo ? 'Uploading…' : 'Upload Logo'}
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    disabled={uploadingLogo}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
                <span className="text-xs text-gray-400">JPEG, PNG or WebP · max 2MB</span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoSelect}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Client Name</label>
            <input
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#10375C]/20 focus:border-[#10375C]"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Primary Brand Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={brandPrimary} onChange={e => setBrandPrimary(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer" />
              <input type="text" value={brandPrimary} onChange={e => setBrandPrimary(e.target.value)} className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#10375C]/20" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Secondary Brand Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={brandSecondary} onChange={e => setBrandSecondary(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer" />
              <input type="text" value={brandSecondary} onChange={e => setBrandSecondary(e.target.value)} className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#10375C]/20" />
            </div>
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

        {/* Brief button */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setBriefOpen(true)}
            className="w-full px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            📋 Set Up Client Brief
          </button>
        </div>

        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl bg-[#10375C] text-white text-sm font-semibold hover:bg-[#0d2d4a] transition-colors disabled:opacity-50">
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
        {briefOpen && <BriefModal client={client} onClose={() => setBriefOpen(false)} />}
      </div>
    </div>
  )
}

// ── Create Client Modal ──────────────────────────────────────────
function CreateClientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [brandPrimary, setBrandPrimary] = useState('#10375C')
  const [brandSecondary, setBrandSecondary] = useState('#8EE3E3')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [briefPromptClient, setBriefPromptClient] = useState<Client | null>(null)

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be under 2MB')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setError('')
  }

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    setError('')

    // Create the client first
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, brand_primary: brandPrimary, brand_secondary: brandSecondary }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Something went wrong')
      setLoading(false)
      return
    }
    const newClient = await res.json()

    // Upload logo if selected
    if (logoFile && newClient.id) {
      const formData = new FormData()
      formData.append('file', logoFile)
      await fetch(`/api/clients/${newClient.id}/logo`, {
        method: 'POST',
        body: formData,
      })
    }

    setLoading(false)
    setBriefPromptClient(newClient)
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">New Client</h2>
        {briefPromptClient && (
          <BriefModal client={briefPromptClient} onClose={() => { setBriefPromptClient(null); onClose() }} />
        )}
        <div className="space-y-4">
          {/* Logo upload */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Logo (optional)</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                  </svg>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#10375C] text-[#10375C] hover:bg-[#10375C]/5 transition-colors"
                >
                  {logoFile ? 'Change Logo' : 'Upload Logo'}
                </button>
                {logoFile && (
                  <button
                    type="button"
                    onClick={() => { setLogoFile(null); setLogoPreview(null) }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                )}
                <span className="text-xs text-gray-400">JPEG, PNG or WebP · max 2MB</span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoSelect}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Client Name</label>
            <input
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#10375C]/20 focus:border-[#10375C]"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Acme Corp"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Primary Brand Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={brandPrimary} onChange={e => setBrandPrimary(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer" />
              <input type="text" value={brandPrimary} onChange={e => setBrandPrimary(e.target.value)} className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#10375C]/20" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Secondary Brand Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={brandSecondary} onChange={e => setBrandSecondary(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer" />
              <input type="text" value={brandSecondary} onChange={e => setBrandSecondary(e.target.value)} className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#10375C]/20" />
            </div>
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
          <button onClick={handleCreate} disabled={loading || !name.trim()} className="flex-1 px-4 py-2.5 rounded-xl bg-[#10375C] text-white text-sm font-semibold hover:bg-[#0d2d4a] transition-colors disabled:opacity-50">
            {loading ? 'Creating…' : 'Create Client'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Confirm Delete Modal ─────────────────────────────────────────
function ConfirmDeleteModal({
  label,
  onClose,
  onConfirm,
}: {
  label: string
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Are you sure?</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          This will permanently delete <span className="font-semibold text-gray-700 dark:text-gray-200">{label}</span>. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────
export default function UsersPageClient({ initialProfiles, clients: initialClients }: UsersPageClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('users')
  const [profiles, setProfiles] = useState(initialProfiles)
  const [clients, setClients] = useState(initialClients)

  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [showCreateClientModal, setShowCreateClientModal] = useState(false)
  const [editingUser, setEditingUser] = useState<(Profile & { clients?: Client[] }) | null>(null)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deletingUser, setDeletingUser] = useState<(Profile & { clients?: Client[] }) | null>(null)
  const [deletingClient, setDeletingClient] = useState<Client | null>(null)

  async function refreshProfiles() {
    const res = await fetch('/api/users')
    if (res.ok) setProfiles(await res.json())
  }

  async function refreshClients() {
    const res = await fetch('/api/clients')
    if (res.ok) setClients(await res.json())
  }

  async function handleDeleteUser() {
    if (!deletingUser) return
    await fetch('/api/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deletingUser.id }),
    })
    setDeletingUser(null)
    refreshProfiles()
  }

  async function handleDeleteClient() {
    if (!deletingClient) return
    await fetch('/api/clients', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deletingClient.id }),
    })
    setDeletingClient(null)
    refreshClients()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Users & Clients</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {activeTab === 'users' ? `${profiles.length} accounts total` : `${clients.length} clients total`}
          </p>
        </div>
        <button
          onClick={() => activeTab === 'users' ? setShowCreateUserModal(true) : setShowCreateClientModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#10375C] text-white font-semibold hover:bg-[#0d2d4a] transition-all text-sm shadow-lg shadow-[#10375C]/20"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {activeTab === 'users' ? 'Create User' : 'New Client'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {(['users', 'clients'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize border ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm border-gray-300 dark:border-gray-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-gray-200 dark:border-gray-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Clients</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {profiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">No users found</td>
                  </tr>
                ) : (
                  profiles.map(profile => (
                    <tr key={profile.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-600 flex items-center justify-center text-gray-700 dark:text-white font-bold text-sm flex-shrink-0">
                            {profile.full_name ? profile.full_name[0].toUpperCase() : profile.email[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{profile.full_name || '—'}</div>
                            <div className="text-sm text-gray-400 dark:text-gray-500">{profile.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_STYLES[profile.role]}`}>
                          {profile.role === 'smm' ? 'SMM' : profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {profile.clients && profile.clients.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {profile.clients.map(c => (
                              <div key={c.id} className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-1">
                                <div className="w-4 h-4 rounded bg-[#10375C] bg-opacity-20 dark:bg-[#10375C]/40 flex items-center justify-center text-[#10375C] dark:text-[#8EE3E3] text-xs font-bold">
                                  {c.name[0]}
                                </div>
                                <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{c.name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-400 dark:text-gray-500">{format(new Date(profile.created_at), 'MMM d, yyyy')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setEditingUser(profile)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingUser(profile)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 border border-red-100 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clients Tab */}
      {activeTab === 'clients' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Slug</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">No clients yet</td>
                  </tr>
                ) : (
                  clients.map(client => {
                    const logoUrl = getLogoUrl(client.logo_path)
                    return (
                      <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-[#10375C]/10 dark:bg-slate-600 flex items-center justify-center text-[#10375C] dark:text-white font-bold text-sm flex-shrink-0">
                              {logoUrl ? (
                                <img src={logoUrl} alt={client.name} className="w-full h-full object-cover" />
                              ) : (
                                client.name[0]
                              )}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{client.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md">{client.slug}</code>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-400 dark:text-gray-500">{format(new Date(client.created_at), 'MMM d, yyyy')}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => setEditingClient(client)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeletingClient(client)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 border border-red-100 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateUserModal && (
        <CreateUserModal
          clients={clients}
          onClose={() => setShowCreateUserModal(false)}
          onCreated={() => { refreshProfiles(); setShowCreateUserModal(false) }}
        />
      )}
      {showCreateClientModal && (
        <CreateClientModal
          onClose={() => setShowCreateClientModal(false)}
          onCreated={() => { refreshClients(); setShowCreateClientModal(false) }}
        />
      )}
      {editingUser && (
        <EditUserModal
          profile={editingUser}
          clients={clients}
          onClose={() => setEditingUser(null)}
          onSaved={() => { refreshProfiles(); setEditingUser(null) }}
        />
      )}
      {editingClient && (
        <EditClientModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSaved={() => { refreshClients(); setEditingClient(null) }}
        />
      )}
      {deletingUser && (
        <ConfirmDeleteModal
          label={deletingUser.full_name || deletingUser.email}
          onClose={() => setDeletingUser(null)}
          onConfirm={handleDeleteUser}
        />
      )}
      {deletingClient && (
        <ConfirmDeleteModal
          label={deletingClient.name}
          onClose={() => setDeletingClient(null)}
          onConfirm={handleDeleteClient}
        />
      )}
    </div>
  )
}
