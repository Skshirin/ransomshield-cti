import { useState } from 'react'
import { UserPlus, Users, ToggleLeft, ToggleRight, RefreshCw, AlertCircle } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button, Input, Select, Modal, ConfirmModal, RoleBadge, EmptyState, Card } from '@/components/ui'
import type { UserRole } from '@/lib/types'

function fmt(iso: string) {
  if (!iso || iso === 'Never') return 'Never'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50 animate-pulse">
      <td className="px-5 py-3.5">
        <div className="h-4 w-32 bg-slate-100 rounded mb-1" />
        <div className="h-3 w-44 bg-slate-100 rounded" />
      </td>
      <td className="px-4 py-3.5"><div className="h-5 w-20 bg-slate-100 rounded-full" /></td>
      <td className="px-4 py-3.5 hidden md:table-cell"><div className="h-3 w-24 bg-slate-100 rounded" /></td>
      <td className="px-4 py-3.5"><div className="h-5 w-14 bg-slate-100 rounded-full" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-20 bg-slate-100 rounded ml-auto" /></td>
    </tr>
  )
}

function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { inviteUser } = useApp()
  const [form, setForm] = useState({ name: '', email: '', temporaryPassword: '', role: 'SECURITY_ANALYST' as UserRole })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleInvite = async () => {
    if (!form.name || !form.email || !form.temporaryPassword) return
    if (form.temporaryPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await inviteUser(form)
      setForm({ name: '', email: '', temporaryPassword: '', role: 'SECURITY_ANALYST' })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to invite user')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setForm({ name: '', email: '', temporaryPassword: '', role: 'SECURITY_ANALYST' })
    setError('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Invite Team Member">
      <div className="space-y-4">
        <Input label="Full name" placeholder="Jane Smith" value={form.name} onChange={set('name')} />
        <Input label="Email address" type="email" placeholder="j.smith@company.com" value={form.email} onChange={set('email')} />
        <Input label="Temporary password" type="password" placeholder="Min 8 characters" value={form.temporaryPassword} onChange={set('temporaryPassword')} />
        <Select label="Role" value={form.role} onChange={set('role')}>
          <option value="SECURITY_ANALYST">Security Analyst</option>
          <option value="ORG_ADMIN">Org Admin</option>
        </Select>
        <p className="text-xs text-slate-500">The team member will be able to sign in with these credentials immediately.</p>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleInvite} loading={loading} disabled={!form.name || !form.email || !form.temporaryPassword}>
            Send Invitation
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function TeamPage() {
  const { teamUsers, currentUser, changeUserRole, toggleUserActive, teamLoading, teamError, refetchTeam } = useApp()
  const isAdmin = currentUser?.role === 'ORG_ADMIN' || currentUser?.role === 'SUPER_ADMIN'
  const [showInvite, setShowInvite] = useState(false)
  const [toggleTarget, setToggleTarget] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)

  // Role gate — only ORG_ADMIN may manage the team
  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <p className="text-slate-500 font-medium">Access restricted</p>
          <p className="text-sm text-slate-400 mt-1">Team management is only available to Org Admins.</p>
        </Card>
      </div>
    )
  }

  const user = teamUsers.find(u => u._id === toggleTarget)

  const handleToggle = async () => {
    if (!toggleTarget || !user) return
    setToggling(true)
    try {
      await toggleUserActive(toggleTarget, user.isActive)
    } finally {
      setToggling(false)
      setToggleTarget(null)
    }
  }

  const tableHeader = (
    <tr className="border-b border-slate-100">
      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Member</th>
      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Last Login</th>
      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
      {isAdmin && <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Actions</th>}
    </tr>
  )

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-500">
            {teamLoading ? 'Loading…' : `${teamUsers.filter(u => u.isActive).length} active members`}
          </p>
          <button
            onClick={refetchTeam}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowInvite(true)}>
            <UserPlus size={15} /> Invite Member
          </Button>
        )}
      </div>

      {teamError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 flex-1">{teamError}</span>
          <Button size="sm" variant="secondary" onClick={refetchTeam}>Retry</Button>
        </div>
      )}

      <Card>
        {teamLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>{tableHeader}</thead>
              <tbody>{[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}</tbody>
            </table>
          </div>
        ) : teamUsers.length === 0 ? (
          <EmptyState
            icon={<Users size={40} />}
            title="No team members yet"
            message="Invite your SOC team to collaborate on detections and CTI."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>{tableHeader}</thead>
              <tbody className="divide-y divide-slate-50">
                {teamUsers.map(u => (
                  <tr key={u._id} className={`transition-colors ${u.isActive ? 'hover:bg-slate-50/70' : 'opacity-55'}`}>
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-medium text-navy-900 text-sm">{u.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">{u.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {isAdmin && u._id !== currentUser?.id ? (
                        <select
                          value={u.role}
                          onChange={e => changeUserRole(u._id, e.target.value as UserRole)}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-navy-600/30"
                        >
                          <option value="SECURITY_ANALYST">Analyst</option>
                          <option value="ORG_ADMIN">Org Admin</option>
                        </select>
                      ) : (
                        <RoleBadge role={u.role} />
                      )}
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-xs text-slate-500">{fmt(u.lastLoginAt)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-slate-400'}`} />
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3.5 text-right">
                        {u._id !== currentUser?.id && (
                          <button
                            onClick={() => setToggleTarget(u._id)}
                            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-navy-900 transition-colors ml-auto"
                          >
                            {u.isActive
                              ? <><ToggleRight size={16} className="text-emerald-500" /> Deactivate</>
                              : <><ToggleLeft size={16} /> Reactivate</>
                            }
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} />

      <ConfirmModal
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggle}
        title={user?.isActive ? 'Deactivate User' : 'Reactivate User'}
        message={
          user?.isActive
            ? `${user?.name} will lose access to RansomShield immediately. Their account data will be retained.`
            : `${user?.name} will regain access to RansomShield.`
        }
        confirmLabel={user?.isActive ? 'Deactivate' : 'Reactivate'}
        danger={user?.isActive}
        loading={toggling}
      />
    </div>
  )
}
