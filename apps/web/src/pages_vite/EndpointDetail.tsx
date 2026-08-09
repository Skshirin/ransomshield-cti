import { useEffect, useState } from 'react'
import { ChevronLeft, Cpu, HardDrive, Clock, Activity, AlertCircle } from 'lucide-react'
import { useApp } from '@/lib/context'
import { EndpointStatusBadge, SeverityBadge, DetectionStatusBadge, ResourceBar, Card } from '@/components/ui'
import { apiGet } from '@/lib/api'
import type { Endpoint } from '@/lib/types'

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function SkeletonDetail() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      <div className="h-4 w-28 bg-slate-100 rounded" />
      <div className="flex items-start justify-between">
        <div>
          <div className="h-7 w-48 bg-slate-100 rounded mb-2" />
          <div className="h-3 w-64 bg-slate-100 rounded" />
        </div>
        <div className="h-6 w-16 bg-slate-100 rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-100 p-5 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-3 w-24 bg-slate-100 rounded" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-slate-100 p-5 space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-4 w-full bg-slate-100 rounded" />)}
        </div>
      </div>
    </div>
  )
}

export default function EndpointDetailPage() {
  const { detections, navigate, pageParams, endpoints: listEndpoints } = useApp()
  const [endpoint, setEndpoint] = useState<Endpoint | null>(
    listEndpoints.find(e => e._id === pageParams.id) ?? null,
  )
  const [loading, setLoading] = useState(!endpoint)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (endpoint) return // already have it from the list
    setLoading(true)
    apiGet<{ endpoint: Endpoint }>(`/endpoints/${pageParams.id}`)
      .then(data => {
        setEndpoint(data.endpoint)
        setLoading(false)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to load endpoint')
        setLoading(false)
      })
  }, [pageParams.id, endpoint])

  if (loading) return <SkeletonDetail />

  if (error || !endpoint) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('endpoints')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-900 transition-colors mb-4">
          <ChevronLeft size={16} /> Back to Endpoints
        </button>
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{error ?? 'Endpoint not found.'}</span>
        </div>
      </div>
    )
  }

  const endpointDetections = detections
    .filter(d => d.endpointId === endpoint._id)
    .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())

  return (
    <div className="p-6 space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate('endpoints')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-900 transition-colors"
      >
        <ChevronLeft size={16} /> Back to Endpoints
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-navy-900 font-mono">{endpoint.name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{endpoint.osVersion}</p>
        </div>
        <EndpointStatusBadge status={endpoint.status} />
      </div>

      {/* Metadata + Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Endpoint Metadata</h3>
          <dl className="space-y-3">
            {[
              { label: 'Agent Version', value: `v${endpoint.agentVersion}` },
              { label: 'Last Check-In', value: fmt(endpoint.lastCheckInAt) },
              { label: 'Registered', value: fmt(endpoint.createdAt) },
              { label: 'Endpoint ID', value: endpoint._id },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="text-xs font-mono text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Live Resource Usage</h3>

          {endpoint.status === 'OFFLINE' ? (
            <p className="text-sm text-slate-400 py-4 text-center">No telemetry — endpoint is offline</p>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Cpu size={13} className="text-slate-400" />
                  <span className="text-xs font-medium text-slate-600">CPU Usage</span>
                </div>
                <ResourceBar value={endpoint.cpuUsagePercent} label="CPU" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Activity size={13} className="text-slate-400" />
                  <span className="text-xs font-medium text-slate-600">RAM Usage</span>
                </div>
                <ResourceBar value={endpoint.ramUsagePercent} label="RAM" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <HardDrive size={13} className="text-slate-400" />
                  <span className="text-xs font-medium text-slate-600">Disk Usage</span>
                </div>
                <ResourceBar value={endpoint.diskUsagePercent} label="Disk" />
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Detections for this endpoint */}
      <Card>
        <div className="px-5 py-4 border-b border-slate-50">
          <h3 className="text-sm font-semibold text-navy-900">Detections on this Endpoint</h3>
        </div>

        {endpointDetections.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-slate-500 font-medium">No detections</p>
            <p className="text-xs text-slate-400 mt-1">This endpoint has no detection history</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {endpointDetections.map(det => (
              <button
                key={det._id}
                onClick={() => navigate('detection-detail', { id: det._id })}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/70 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <SeverityBadge severity={det.severity} />
                    <span className="text-xs text-slate-500">{det.indicators[0]?.type}</span>
                  </div>
                  <p className="text-sm text-slate-700 truncate">{det.indicators[0]?.description}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-2xl font-bold font-mono text-slate-800">{det.riskScore}</span>
                  <DetectionStatusBadge status={det.status} />
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 hidden sm:flex">
                    <Clock size={10} />
                    {new Date(det.detectedAt).toLocaleDateString()}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
