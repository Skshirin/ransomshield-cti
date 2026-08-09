import { useState } from 'react'
import { User, Building2, Lock, Shield, ToggleLeft, ToggleRight } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button, Input, Card, RoleBadge } from '@/components/ui'

export default function SettingsPage() {
  const { currentUser } = useApp()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [ctiSharing, setCtiSharing] = useState(true)

  const handlePasswordChange = async () => {
    if (!currentPw || !newPw || !confirmPw) { setPwError('All password fields are required.'); return }
    if (newPw !== confirmPw) { setPwError('New passwords do not match.'); return }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return }
    setPwError('')
    // Password change endpoint is not in the current API contract.
    // Contact your org admin to reset your password.
    setPwError('Password change is not available via the UI. Please contact your organization admin.')
  }


  return (
    <div className="p-6 space-y-5 max-w-2xl">
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
          <p className="text-xs text-slate-400">Contact your organization admin to update your profile information.</p>
        </div>
      </Card>

      {/* Organization */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <Building2 size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-navy-900">Organization</h2>
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
            className="flex-shrink-0"
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
          <Button onClick={handlePasswordChange}>
            Update Password
          </Button>
        </div>
      </Card>
    </div>
  )
}
