'use client'

import { useState } from 'react'
import { Filter, CheckCircle2, XCircle, ClipboardList, RefreshCw, AlertCircle } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button, Card, EmptyState, Select } from '@/components/ui'

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const methodColors: Record<string, string> = {
  GET: 'bg-blue-50 text-blue-700',
  POST: 'bg-emerald-50 text-emerald-700',
  PATCH: 'bg-amber-50 text-amber-700',
  PUT: 'bg-amber-50 text-amber-700',
  DELETE: 'bg-red-50 text-red-700',
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50 animate-pulse">
      <td className="px-5 py-3"><div className="h-3 w-28 bg-slate-100 rounded" /></td>
      <td className="px-4 py-3"><div className="h-3 w-36 bg-slate-100 rounded" /></td>
      <td className="px-4 py-3"><div className="h-3 w-32 bg-slate-100 rounded" /></td>
      <td className="px-4 py-3 hidden md:table-cell">
        <div className="flex items-center gap-2">
          <div className="h-4 w-12 bg-slate-100 rounded" />
          <div className="h-3 w-32 bg-slate-100 rounded" />
        </div>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell"><div className="h-3 w-8 bg-slate-100 rounded" /></td>
      <td className="px-4 py-3 hidden xl:table-cell"><div className="h-3 w-24 bg-slate-100 rounded" /></td>
      <td className="px-4 py-3"><div className="h-4 w-4 bg-slate-100 rounded-full mx-auto" /></td>
    </tr>
  )
}

export default function AuditLogsPage() {
  const { auditLogs, currentUser, auditLogsLoading, auditLogsError, refetchAuditLogs } = useApp()
  const [filterAction, setFilterAction] = useState('')
  const [filterUser, setFilterUser] = useState('')

  if (currentUser?.role !== 'ORG_ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <p className="text-slate-500 font-medium">Access restricted</p>
          <p className="text-sm text-slate-400 mt-1">Audit logs are only available to Org Admins.</p>
        </Card>
      </div>
    )
  }

  const uniqueActions = [...new Set(auditLogs.map(l => l.action))].sort()
  const uniqueEmails = [...new Set(auditLogs.map(l => l.userEmail))].sort()

  const filtered = auditLogs
    .filter(l => {
      if (filterAction && l.action !== filterAction) return false
      if (filterUser && l.userEmail !== filterUser) return false
      return true
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const tableHeader = (
    <tr className="border-b border-slate-100">
      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Timestamp</th>
      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Method + Path</th>
      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Status</th>
      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden xl:table-cell">IP</th>
      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Result</th>
    </tr>
  )

  return (
    <div className="p-6 space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Filter size={14} /> Filters
          </div>
          <Select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="w-48 text-xs">
            <option value="">All Actions</option>
            {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
          </Select>
          <Select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="w-52 text-xs">
            <option value="">All Users</option>
            {uniqueEmails.map(e => <option key={e} value={e}>{e}</option>)}
          </Select>
          {(filterAction || filterUser) && (
            <button
              onClick={() => { setFilterAction(''); setFilterUser('') }}
              className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer"
            >
              Clear
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-slate-400">
              {auditLogsLoading ? 'Loading…' : `${filtered.length} entries`}
            </span>
            <button
              onClick={refetchAuditLogs}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>
      </Card>

      {auditLogsError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 flex-1">{auditLogsError}</span>
          <Button size="sm" variant="secondary" onClick={refetchAuditLogs}>Retry</Button>
        </div>
      )}

      {/* Table */}
      <Card>
        {auditLogsLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>{tableHeader}</thead>
              <tbody>{[...Array(8)].map((_, i) => <SkeletonRow key={i} />)}</tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={40} />}
            title="No audit log entries"
            message="Audit log events will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>{tableHeader}</thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(log => (
                  <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3">
                      <span className="text-xs font-mono text-slate-500">{fmt(log.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-slate-700">{log.userEmail}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-slate-800 font-medium">{log.action}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${methodColors[log.method] ?? 'bg-slate-100 text-slate-600'}`}>
                          {log.method}
                        </span>
                        <span className="text-xs font-mono text-slate-500 truncate max-w-[160px]">{log.path}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`text-xs font-mono ${log.statusCode < 300 ? 'text-emerald-600' : log.statusCode < 500 ? 'text-amber-600' : 'text-red-600'}`}>
                        {log.statusCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-xs font-mono text-slate-400">{log.ipAddress}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.success
                        ? <CheckCircle2 size={15} className="text-emerald-500 mx-auto" />
                        : <XCircle size={15} className="text-red-500 mx-auto" />
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
