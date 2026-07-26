import { useState } from 'react'
import { Filter, AlertTriangle, RefreshCw, AlertCircle } from 'lucide-react'
import { useApp } from '@/lib/context'
import { SeverityBadge, DetectionStatusBadge, EmptyState, Card, Select } from '@/components/ui'
import type { DetectionSeverity, DetectionStatus } from '@/lib/types'

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50 animate-pulse">
      <td className="px-5 py-3.5"><div className="h-5 w-16 bg-slate-100 rounded-full" /></td>
      <td className="px-4 py-3.5"><div className="h-3 w-28 bg-slate-100 rounded" /></td>
      <td className="px-4 py-3.5 hidden md:table-cell">
        <div className="h-2.5 w-20 bg-slate-100 rounded mb-1" />
        <div className="h-3 w-56 bg-slate-100 rounded" />
      </td>
      <td className="px-4 py-3.5"><div className="h-6 w-8 bg-slate-100 rounded" /></td>
      <td className="px-4 py-3.5"><div className="h-5 w-20 bg-slate-100 rounded-full" /></td>
      <td className="px-4 py-3.5 hidden lg:table-cell"><div className="h-3 w-24 bg-slate-100 rounded" /></td>
    </tr>
  )
}

export default function DetectionsPage() {
  const { detections, endpoints, navigate, detectionsLoading, detectionsError, refetchDetections } = useApp()
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('')
  const [filterEndpoint, setFilterEndpoint] = useState('')

  const filtered = detections.filter(d => {
    if (filterStatus && d.status !== filterStatus) return false
    if (filterSeverity && d.severity !== filterSeverity) return false
    if (filterEndpoint && d.endpointId !== filterEndpoint) return false
    return true
  }).sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())

  const hasFilters = filterStatus || filterSeverity || filterEndpoint

  const riskColor = (score: number) =>
    score >= 85 ? 'text-red-600' : score >= 65 ? 'text-orange-500' : score >= 40 ? 'text-yellow-600' : 'text-slate-600'

  const tableHeader = (
    <tr className="border-b border-slate-100">
      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Severity</th>
      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Endpoint</th>
      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Primary Indicator</th>
      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Risk</th>
      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Detected</th>
    </tr>
  )

  return (
    <div className="p-6 space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mr-1">
            <Filter size={14} />
            Filters
          </div>
          <Select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-40 text-xs"
          >
            <option value="">All Statuses</option>
            {(['NEW', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'] as DetectionStatus[]).map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </Select>
          <Select
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value)}
            className="w-40 text-xs"
          >
            <option value="">All Severities</option>
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as DetectionSeverity[]).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Select
            value={filterEndpoint}
            onChange={e => setFilterEndpoint(e.target.value)}
            className="w-48 text-xs"
          >
            <option value="">All Endpoints</option>
            {endpoints.map(ep => (
              <option key={ep._id} value={ep._id}>{ep.name}</option>
            ))}
          </Select>
          {hasFilters && (
            <button
              onClick={() => { setFilterStatus(''); setFilterSeverity(''); setFilterEndpoint('') }}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Clear filters
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-slate-400">{detectionsLoading ? 'Loading…' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}</span>
            <button
              onClick={refetchDetections}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>
      </Card>

      {detectionsError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 flex-1">{detectionsError}</span>
          <button
            onClick={refetchDetections}
            className="text-sm text-red-600 font-medium hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <Card>
        {detectionsLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>{tableHeader}</thead>
              <tbody>{[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}</tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle size={40} />}
            title={hasFilters ? 'No matching detections' : 'No detections yet'}
            message={hasFilters ? 'Try adjusting your filters.' : 'Your endpoints are all clear — no threats detected.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>{tableHeader}</thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(det => (
                  <tr
                    key={det._id}
                    onClick={() => navigate('detection-detail', { id: det._id })}
                    className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <SeverityBadge severity={det.severity} />
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs text-slate-800">{det.endpointName}</span>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell max-w-xs">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{det.indicators[0]?.type}</span>
                        <p className="text-xs text-slate-600 truncate mt-0.5">{det.indicators[0]?.description}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xl font-bold font-mono ${riskColor(det.riskScore)}`}>{det.riskScore}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <DetectionStatusBadge status={det.status} />
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-xs text-slate-500 font-mono">{fmt(det.detectedAt)}</span>
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
