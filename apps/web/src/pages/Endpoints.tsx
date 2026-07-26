import { useState } from 'react'
import { Plus, Key, Copy, Check, Trash2, RefreshCw, AlertCircle } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button, Input, Modal, ConfirmModal, EndpointStatusBadge, ResourceBar, EmptyState, Card } from '@/components/ui'
import type { Endpoint } from '@/lib/types'
import { Monitor } from 'lucide-react'

function fmt(iso?: string) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50 animate-pulse">
      <td className="px-5 py-3.5">
        <div className="h-3.5 w-32 bg-slate-100 rounded mb-1" />
        <div className="h-2.5 w-12 bg-slate-100 rounded" />
      </td>
      <td className="px-4 py-3.5"><div className="h-5 w-16 bg-slate-100 rounded-full" /></td>
      <td className="px-4 py-3.5 hidden md:table-cell"><div className="h-3 w-40 bg-slate-100 rounded" /></td>
      <td className="px-4 py-3.5 hidden lg:table-cell"><div className="h-3 w-24 bg-slate-100 rounded" /></td>
      <td className="px-4 py-3.5 hidden xl:table-cell"><div className="h-3 w-40 bg-slate-100 rounded" /></td>
      <td className="px-4 py-3.5 w-10" />
    </tr>
  )
}

function AddEndpointModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addEndpoint } = useApp()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ endpoint: Endpoint; activationToken: string; installInstructions: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await addEndpoint(name.trim())
      setResult(res)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add endpoint')
    } finally {
      setLoading(false)
    }
  }

  const copyToken = () => {
    if (result) {
      navigator.clipboard.writeText(result.activationToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setName('')
    setResult(null)
    setCopied(false)
    setError('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={result ? 'Endpoint Added — Save Your Token' : 'Add New Endpoint'} width="max-w-xl">
      {!result ? (
        <div className="space-y-4">
          <Input
            label="Endpoint name"
            placeholder="e.g. PROD-WEB-003"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <p className="text-xs text-slate-500">Give the endpoint a unique, identifiable name. The name cannot be changed after creation.</p>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleAdd} loading={loading} disabled={!name.trim()}>Add Endpoint</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Key size={16} className="text-amber-600" />
              <p className="text-sm font-semibold text-amber-800">Save this token — shown once only</p>
            </div>
            <p className="text-xs text-amber-700">This activation token is required to register the agent. It cannot be retrieved after closing this dialog.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Activation Token</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-900 text-emerald-400 font-mono text-sm px-3 py-2.5 rounded-lg overflow-x-auto select-all">
                {result.activationToken}
              </div>
              <button
                onClick={copyToken}
                className="px-3 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                title="Copy token"
              >
                {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} className="text-slate-500" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Install Instructions</label>
            <pre className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-700 font-mono whitespace-pre-wrap">
              {result.installInstructions}
            </pre>
          </div>

          <div className="flex justify-end pt-1">
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function EndpointsPage() {
  const { endpoints, navigate, currentUser, removeEndpoint, endpointsLoading, endpointsError, refetchEndpoints } = useApp()
  const isAdmin = currentUser?.role === 'ORG_ADMIN' || currentUser?.role === 'SUPER_ADMIN'
  const [showAdd, setShowAdd] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)

  const handleRemove = async () => {
    if (!removeTarget) return
    setRemoving(true)
    try {
      await removeEndpoint(removeTarget)
    } finally {
      setRemoving(false)
      setRemoveTarget(null)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500">{endpointsLoading ? 'Loading…' : `${endpoints.length} endpoint${endpoints.length !== 1 ? 's' : ''} monitored`}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={refetchEndpoints}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          {isAdmin && (
            <Button onClick={() => setShowAdd(true)}>
              <Plus size={15} /> Add Endpoint
            </Button>
          )}
        </div>
      </div>

      {endpointsError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl mb-4">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 flex-1">{endpointsError}</span>
          <Button size="sm" variant="secondary" onClick={refetchEndpoints}>Retry</Button>
        </div>
      )}

      <Card>
        {endpointsLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Endpoint</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">OS Version</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Last Check-In</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden xl:table-cell w-48">Resources</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>{[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}</tbody>
            </table>
          </div>
        ) : endpoints.length === 0 ? (
          <EmptyState
            icon={<Monitor size={40} />}
            title="No endpoints yet"
            message="Add your first endpoint to start monitoring for ransomware activity."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Endpoint</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">OS Version</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Last Check-In</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden xl:table-cell w-48">Resources</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {endpoints.map(ep => (
                  <tr
                    key={ep._id}
                    className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                    onClick={() => navigate('endpoint-detail', { id: ep._id })}
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-navy-900 font-mono text-xs">{ep.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">v{ep.agentVersion || 'Pending'}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <EndpointStatusBadge status={ep.status} />
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-xs text-slate-600">{ep.osVersion?.split(' (')[0] || '-'}</span>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-xs text-slate-500 font-mono">{fmt(ep.lastCheckInAt)}</span>
                    </td>
                    <td className="px-4 py-3.5 hidden xl:table-cell">
                      <div className="space-y-1.5 w-40">
                        <ResourceBar value={ep.cpuUsagePercent || 0} label="CPU" />
                        <ResourceBar value={ep.ramUsagePercent || 0} label="RAM" />
                        <ResourceBar value={ep.diskUsagePercent || 0} label="Disk" />
                      </div>
                    </td>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      {isAdmin && (
                        <button
                          onClick={() => setRemoveTarget(ep._id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove endpoint"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddEndpointModal open={showAdd} onClose={() => setShowAdd(false)} />

      <ConfirmModal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        title="Remove Endpoint"
        message="This endpoint will be removed from monitoring. The agent will stop reporting and all historical data will be retained. This action cannot be undone."
        confirmLabel="Remove Endpoint"
        danger
        loading={removing}
      />
    </div>
  )
}
