'use client'

import { Client } from '@/lib/types'
import { format } from 'date-fns'

interface ClientWithStats extends Client {
  postCounts: Record<string, number>
  totalPosts: number
  isFlagged: boolean
}

interface ClientTableProps {
  clients: ClientWithStats[]
}

const STATUS_ORDER = ['To Be Confirmed', 'Being Created', 'Confirmed', 'Scheduled', 'Posted']

const STATUS_BADGE_STYLES: Record<string, string> = {
  'To Be Confirmed': 'bg-gray-100 text-gray-600',
  'Being Created': 'bg-blue-100 text-blue-700',
  'Confirmed': 'bg-green-100 text-green-700',
  'Scheduled': 'bg-yellow-100 text-yellow-700',
  'Posted': 'bg-purple-100 text-purple-700',
}

export default function ClientTable({ clients }: ClientTableProps) {
  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="mx-auto mb-3">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
        <p className="text-gray-400 font-medium">No clients yet</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Client Overview</h3>
        <span className="text-sm text-gray-400">{clients.length} clients</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
              {STATUS_ORDER.map(status => (
                <th key={status} className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {status}
                </th>
              ))}
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Flag</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {clients.map((client) => (
              <tr key={client.id} className={`hover:bg-gray-50 transition-colors ${client.isFlagged ? 'bg-red-50 hover:bg-red-100' : ''}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#10375C] bg-opacity-10 flex items-center justify-center text-[#10375C] font-bold text-sm flex-shrink-0">
                      {client.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{client.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{client.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="font-bold text-gray-900">{client.totalPosts}</span>
                </td>
                {STATUS_ORDER.map(status => (
                  <td key={status} className="px-4 py-4 text-center">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                      (client.postCounts[status] || 0) > 0
                        ? STATUS_BADGE_STYLES[status]
                        : 'text-gray-300'
                    }`}>
                      {client.postCounts[status] || 0}
                    </span>
                  </td>
                ))}
                <td className="px-4 py-4 text-center">
                  {client.isFlagged ? (
                    <div className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>
                      </svg>
                      Alert
                    </div>
                  ) : (
                    <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-400">
                    {format(new Date(client.created_at), 'MMM d, yyyy')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
