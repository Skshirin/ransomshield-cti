'use client'

import { useState } from 'react'
import { User, Building2, Lock, Shield, ToggleLeft, ToggleRight, Ticket, Plus, Copy, Check } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button, Input, Card, RoleBadge, P, BORDER, MUTED, TEXT, GREEN } from '@/components/ui'

export default function SettingsPage() {
  const { currentUser, invitations, generateInvitation, showToast } = useApp()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [ctiSharing, setCtiSharing] = useState(true)

  const handlePasswordChange = async () => {
    if (!currentPw || !newPw || !confirmPw) { setPwError('All password fields are required.'); setPwSuccess(''); return }
    if (newPw !== confirmPw) { setPwError('New passwords do not match.'); setPwSuccess(''); return }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); setPwSuccess(''); return }
    setPwError('')
    setPwSuccess('')
    setLoading(true)

    try {
      const { apiPost } = await import('@/lib/api')
      await apiPost('/auth/change-password', { currentPassword: currentPw, newPassword: newPw })
      setPwSuccess('Password changed successfully!')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (err: any) {
      setPwError(err.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateCode = async () => {
    setGenLoading(true)
    try {
      await generateInvitation()
    } catch (err: any) {
      showToast(err?.message || 'Failed to generate invitation code', 'error')
    } finally {
      setGenLoading(false)
    }
  }

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    showToast(`Code ${code} copied to clipboard`, 'success')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      {/* Profile */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <User size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-navy-900">Your Profile</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
            <div className="w-12 h-12 bg-navy-900 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white font-mono">
                {currentUser?.name.split(' ').map(n => n[0]).join('').slice(0, 2) ?? '??'}
              </span>
            </div>
            <div>
              <p className="font-semibold text-navy-900">{currentUser?.name}</p>
              <p className="text-sm text-slate-500 font-mono">{currentUser?.email}</p>
              {currentUser?.role && <div className="mt-1"><RoleBadge role={currentUser.role} /></div>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Full name</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-slate-50 cursor-default"
                value={currentUser?.name ?? ''}
                readOnly
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Email address</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-slate-50 cursor-default font-mono"
                value={currentUser?.email ?? ''}
                readOnly
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Organization & Invitations (ORG_ADMIN Only) */}
      {currentUser?.role === 'ORG_ADMIN' && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Ticket size={16} className="text-slate-400" />
              <div>
                <h2 className="text-sm font-semibold text-navy-900">Organization Invitations</h2>
                <p className="text-xs text-slate-500">Generate 6-character invitation codes to invite Security Analysts.</p>
              </div>
            </div>
            <Button onClick={handleGenerateCode} disabled={genLoading}>
              <Plus size={14} className="mr-1 inline" /> Generate Code
            </Button>
          </div>

          {invitations.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-xl" style={{ borderColor: BORDER }}>
              <p className="text-xs text-slate-400">No invitation codes generated yet. Click above to create one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: BORDER }}>
                    <th className="py-2 px-3 font-semibold text-slate-500">Code</th>
                    <th className="py-2 px-3 font-semibold text-slate-500">Status</th>
                    <th className="py-2 px-3 font-semibold text-slate-500">Created</th>
                    <th className="py-2 px-3 font-semibold text-slate-500">Consumed By</th>
                    <th className="py-2 px-3 font-semibold text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: BORDER }}>
                  {invitations.map(inv => {
                    const consumedUser = typeof inv.consumedBy === 'object' ? inv.consumedBy?.email : null
                    return (
                      <tr key={inv._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-navy-900 text-sm">{inv.code}</td>
                        <td className="py-2.5 px-3">
                          {inv.isConsumed ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                              Consumed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                              Active / Unused
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {consumedUser ? (
                            <span>{consumedUser} ({new Date(inv.consumedAt!).toLocaleDateString()})</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {!inv.isConsumed && (
                            <button
                              onClick={() => handleCopy(inv.code)}
                              className="text-xs text-slate-500 hover:text-navy-900 inline-flex items-center gap-1 cursor-pointer font-medium"
                            >
                              {copiedCode === inv.code ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                              {copiedCode === inv.code ? 'Copied' : 'Copy'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Organization Info */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <Building2 size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-navy-900">Organization Details</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Organization ID</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-slate-50 cursor-default font-mono"
              value={currentUser?.organizationId ?? ''}
              readOnly
            />
          </div>
        </div>
      </Card>

      {/* CTI Sharing */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-navy-900">CTI Sharing Preferences</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-navy-900">Contribute to global CTI feed</p>
            <p className="text-xs text-slate-500 mt-0.5">Published reports will appear anonymously in the global feed, shared with all verified organizations on the network.</p>
          </div>
          <button
            onClick={() => setCtiSharing(v => !v)}
            className="flex-shrink-0 cursor-pointer"
          >
            {ctiSharing
              ? <ToggleRight size={28} className="text-emerald-500" />
              : <ToggleLeft size={28} className="text-slate-400" />
            }
          </button>
        </div>
      </Card>

      {/* Password */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <Lock size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-navy-900">Change Password</h2>
        </div>
        <div className="space-y-4">
          <Input
            label="Current password"
            type="password"
            placeholder="Enter current password"
            value={currentPw}
            onChange={e => setCurrentPw(e.target.value)}
          />
          <Input
            label="New password"
            type="password"
            placeholder="Minimum 8 characters"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
          />
          <Input
            label="Confirm new password"
            type="password"
            placeholder="Repeat new password"
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
          />
          {pwError && <p className="text-sm text-red-600">{pwError}</p>}
          {pwSuccess && <p className="text-sm text-emerald-600">{pwSuccess}</p>}
          <Button onClick={handlePasswordChange} disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
