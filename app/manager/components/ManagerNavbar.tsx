'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { Profile } from '@/lib/types'
import Link from 'next/link'

interface ManagerNavbarProps {
  profile: Profile
}

export default function ManagerNavbar({ profile }: ManagerNavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navLinks = [
    { href: '/manager', label: 'Dashboard' },
    { href: '/manager/users', label: 'Users' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#10375C] text-white h-16 flex items-center px-6 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#8EE3E3] bg-opacity-20 border border-[#8EE3E3] border-opacity-30 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="6" fill="#8EE3E3"/>
            <path d="M16 2V6M16 26V30M2 16H6M26 16H30M6.34 6.34L9.17 9.17M22.83 22.83L25.66 25.66M25.66 6.34L22.83 9.17M9.17 22.83L6.34 25.66" stroke="#8EE3E3" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="font-bold text-lg tracking-tight">Solar Content Calendar</span>
        <span className="text-[#8EE3E3] text-xs font-medium bg-[#8EE3E3] bg-opacity-10 px-2 py-0.5 rounded-full border border-[#8EE3E3] border-opacity-20">Manager</span>
      </div>

      {/* Nav links */}
      <div className="ml-8 flex items-center gap-1">
        {navLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              pathname === link.href
                ? 'bg-white bg-opacity-15 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white hover:bg-opacity-10'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#8EE3E3] bg-opacity-20 flex items-center justify-center text-[#8EE3E3] text-xs font-bold">
            {profile.full_name ? profile.full_name[0].toUpperCase() : profile.email[0].toUpperCase()}
          </div>
          <span className="text-sm text-gray-300">{profile.full_name || profile.email}</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white hover:bg-opacity-10"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Sign out
        </button>
      </div>
    </nav>
  )
}
