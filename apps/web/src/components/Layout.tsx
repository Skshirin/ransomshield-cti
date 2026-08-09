'use client'

import { type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Shield,
  LayoutDashboard,
  Monitor,
  AlertTriangle,
  Globe,
  ClipboardList,
  Users,
  Settings,
  LogOut,
  Bell,
  Search,
  Zap,
} from 'lucide-react'
import { useApp } from '@/lib/context'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'endpoints', label: 'Endpoints', icon: Monitor, path: '/endpoints' },
  { id: 'detections', label: 'Detections', icon: AlertTriangle, badge: true, path: '/detections' },
  { id: 'cti-center', label: 'CTI Center', icon: Globe, path: '/cti-center' },
  { id: 'blockchain-verification', label: 'Blockchain Verify', icon: Zap, path: '/blockchain-verification' },
]

const adminNavItems = [
  { id: 'audit-logs', label: 'Audit Logs', icon: ClipboardList, path: '/audit-logs' },
  { id: 'team', label: 'Team', icon: Users, path: '/team' },
]

const pageLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  endpoints: 'Endpoints',
  'endpoint-detail': 'Endpoint Detail',
  detections: 'Detections',
  'detection-detail': 'Detection Detail',
  'cti-center': 'CTI Center',
  'cti-draft-editor': 'CTI Draft Editor',
  'blockchain-verification': 'Blockchain Verification',
  'audit-logs': 'Audit Logs',
  team: 'Team',
  settings: 'Settings',
  '/dashboard': 'Dashboard',
  '/endpoints': 'Endpoints',
  '/detections': 'Detections',
  '/cti-center': 'CTI Center',
  '/cti-draft-editor': 'CTI Draft Editor',
  '/blockchain-verification': 'Blockchain Verification',
  '/audit-logs': 'Audit Logs',
  '/team': 'Team',
  '/settings': 'Settings',
}

export default function Layout({ children }: { children: ReactNode }) {
  const { currentUser, navigate, page, detections, logout } = useApp()
  const router = useRouter()
  const pathname = usePathname()
  const newDetectionCount = detections.filter(d => d.status === 'NEW').length
  const isAdmin = currentUser?.role === 'ORG_ADMIN' || currentUser?.role === 'SUPER_ADMIN'

  const initials = currentUser?.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '??'

  const activePath = pathname || page

  const handleNav = (item: { id: string; path: string }) => {
    navigate(item.id)
    router.push(item.path)
  }

  return (
    <div className="flex h-full min-h-screen bg-content">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-navy-900 flex flex-col h-screen sticky top-0">
        {/* Logo */}
        <div className="px-4 pt-5 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">RansomShield</p>
              <p className="text-[10px] font-mono text-white/40 mt-0.5">CTI Platform</p>
            </div>
          </div>
        </div>

        {/* User card */}
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-white font-mono">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{currentUser?.name}</p>
              <p className="text-[10px] text-white/40 truncate font-mono">{currentUser?.organizationId?.slice(-8)}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = activePath.startsWith(item.path) || page === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/55 hover:bg-white/5 hover:text-white/80'
                }`}
              >
                <Icon size={16} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && newDetectionCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {newDetectionCount}
                  </span>
                )}
              </button>
            )
          })}

          {isAdmin && (
            <>
              <div className="pt-3 pb-1 px-3">
                <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest">Admin</p>
              </div>
              {adminNavItems.map(item => {
                const Icon = item.icon
                const isActive = activePath.startsWith(item.path) || page === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/55 hover:bg-white/5 hover:text-white/80'
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                )
              })}
            </>
          )}
        </nav>

        {/* Bottom: Settings + Logout */}
        <div className="px-2 py-3 border-t border-white/5 space-y-0.5">
          <button
            onClick={() => handleNav({ id: 'settings', path: '/settings' })}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
              activePath.startsWith('/settings') || page === 'settings'
                ? 'bg-white/10 text-white'
                : 'text-white/55 hover:bg-white/5 hover:text-white/80'
            }`}
          >
            <Settings size={16} />
            Settings
          </button>
          <button
            onClick={() => {
              logout()
              router.push('/login')
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/55 hover:bg-white/5 hover:text-white/80 transition-all duration-150 cursor-pointer"
          >
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-6 bg-white/80 backdrop-blur border-b border-slate-100 flex-shrink-0">
          <h1 className="text-lg font-bold text-navy-900">{pageLabels[activePath] ?? pageLabels[page] ?? 'Dashboard'}</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5 text-sm text-slate-400 w-52">
              <Search size={14} />
              <span className="flex-1">Search</span>
              <kbd className="text-[10px] font-mono bg-white rounded px-1 py-0.5 text-slate-400 border border-slate-200">⌘K</kbd>
            </div>
            <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
              <Bell size={18} />
              {newDetectionCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => handleNav({ id: 'settings', path: '/settings' })}
              className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center hover:bg-navy-800 transition-colors cursor-pointer"
            >
              <span className="text-[11px] font-bold text-white font-mono">{initials}</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
