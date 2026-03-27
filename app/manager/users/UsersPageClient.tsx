'use client'

import { useState } from 'react'
import { Profile, Client } from '@/lib/types'
import { format } from 'date-fns'
import CreateUserModal from '../components/CreateUserModal'

interface UsersPageClientProps {
  initialProfiles: (Profile & { client?: Client })[]
  clients: Client[]
}

const ROLE_STYLES: Record<string, string> = {
  smm: 'bg-blue-100 text-blue-700',
  client: 'bg-green-100 text-green-700',
  manager: 'bg-purple-100 text-purple-700',
}

export default function UsersPageClient({ initialProfiles, clients }: UsersPageClientProps) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [showCreateModal, setShowCreateModal] = useState(false)

  async function refreshProfiles() {
    const response = await fetch('/api/users')
    if (response.ok) {
      const data = await response.json()
      setProfiles(data)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">{profiles.length} accounts total</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#10375C] text-white font-semibold hover:bg-[#0d2d4a] transition-all text-sm shadow-lg shadow-[#10375C]/20"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create User
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                profiles.map(profile => (
                  <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#10375C] bg-opacity-10 flex items-center justify-center text-[#10375C] font-bold text-sm flex-shrink-0">
                          {profile.full_name ? profile.full_name[0].toUpperCase() : profile.email[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {profile.full_name || '—'}
                          </div>
                          <div className="text-sm text-gray-400">{profile.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_STYLES[profile.role]}`}>
                        {profile.role === 'smm' ? 'SMM' : profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {(profile as Profile & { client?: Client }).client ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-[#10375C] bg-opacity-10 flex items-center justify-center text-[#10375C] text-xs font-bold">
                            {(profile as Profile & { client?: Client }).client!.name[0]}
                          </div>
                          <span className="text-sm text-gray-700">{(profile as Profile & { client?: Client }).client!.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-400">
                        {format(new Date(profile.created_at), 'MMM d, yyyy')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <CreateUserModal
          clients={clients}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            refreshProfiles()
            setShowCreateModal(false)
          }}
        />
      )}
    </div>
  )
}
