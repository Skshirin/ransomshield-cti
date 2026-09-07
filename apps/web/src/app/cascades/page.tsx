'use client'

import { useState, useMemo } from 'react'
import Layout from '@/components/Layout'
import {
  Radio,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Zap,
  CheckCircle2,
  Server,
  Lock,
  ExternalLink,
  Clock,
  ChevronRight,
  Activity,
  Layers,
  Database,
} from 'lucide-react'
import {
  P,
  STORM,
  TEXT,
  MUTED,
  BORDER,
  RED,
  AMBER,
  GREEN,
  Modal,
  ConfirmModal,
  Button,
  EmptyState,
} from '@/components/ui'
import { useApp } from '@/lib/context'
import type { Cascade, CascadeSeverity, CascadeStatus, CascadeAttackType } from '@/lib/types'

const SEVERITY_BADGES: Record<CascadeSeverity, { bg: string; color: string; border: string }> = {
  CRITICAL: { bg: '#FEF2F2', color: RED, border: '#FECACA' },
  HIGH: { bg: '#FFF7ED', color: '#EA580C', border: '#FFEDD5' },
  MEDIUM: { bg: '#FEFCE8', color: '#CA8A04', border: '#FEF08A' },
  LOW: { bg: '#F0FDF4', color: GREEN, border: '#BBF7D0' },
}

const STATUS_BADGES: Record<CascadeStatus, { bg: string; color: string }> = {
  ACTIVE: { bg: '#FEF2F2', color: RED },
  CONTAINED: { bg: '#F3E8FF', color: '#9333EA' },
  RESOLVED: { bg: '#F0FDF4', color: GREEN },
}

export default function CascadesPage() {
  const { cascades, endpoints, currentUser, containCascade, resolveCascade, navigate } = useApp()

  const [selectedCascade, setSelectedCascade] = useState<Cascade | null>(null)
  const [containConfirmId, setContainConfirmId] = useState<string | null>(null)
  const [resolveConfirmId, setResolveConfirmId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'ALL' | CascadeStatus>('ALL')

  const isAuthorized = currentUser?.role === 'ORG_ADMIN' || currentUser?.role === 'SECURITY_ANALYST'

  const filteredCascades = useMemo(() => {
    if (statusFilter === 'ALL') return cascades
    return cascades.filter(c => c.status === statusFilter)
  }, [cascades, statusFilter])

  const activeCount = cascades.filter(c => c.status === 'ACTIVE').length
  const containedCount = cascades.filter(c => c.status === 'CONTAINED').length
  const resolvedCount = cascades.filter(c => c.status === 'RESOLVED').length
  const totalAffectedHosts = cascades
    .filter(c => c.status === 'ACTIVE')
    .reduce((sum, c) => sum + (c.affectedEndpointIds.length || 0), 0)

  const handleContain = async () => {
    if (!containConfirmId) return
    setIsProcessing(true)
    try {
      const res = await containCascade(containConfirmId)
      if (selectedCascade && selectedCascade._id === containConfirmId) {
        setSelectedCascade(res.cascade)
      }
      setContainConfirmId(null)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleResolve = async () => {
    if (!resolveConfirmId) return
    setIsProcessing(true)
    try {
      const res = await resolveCascade(resolveConfirmId)
      if (selectedCascade && selectedCascade._id === resolveConfirmId) {
        setSelectedCascade(res)
      }
      setResolveConfirmId(null)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Layout>
      <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: RED }}>
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: TEXT }}>
                Cross-Endpoint Attack / Cascade Center
              </h1>
            </div>
            <p className="text-[13px] mt-1" style={{ color: MUTED }}>
              Multi-endpoint temporal correlation detecting coordinated ransomware campaigns, lateral spread, and shared threat IOCs across hosts.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="inline-flex rounded-lg border bg-white p-1 self-start sm:self-auto" style={{ borderColor: BORDER }}>
            {(['ALL', 'ACTIVE', 'CONTAINED', 'RESOLVED'] as const).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  statusFilter === f
                    ? 'bg-[#17313E] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f} {f === 'ACTIVE' && activeCount > 0 ? `(${activeCount})` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* High-Risk Alert Banner if active cascades */}
        {activeCount > 0 && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50/80 flex items-start justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                <Flame className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-900">
                  {activeCount} Active Multi-Endpoint Attack {activeCount > 1 ? 'Cascades' : 'Cascade'} Detected
                </h3>
                <p className="text-xs text-red-700 mt-0.5">
                  Coordinated adversarial activity is spanning {totalAffectedHosts} endpoints. Immediate containment is recommended.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border rounded-[10px] p-5 shadow-sm" style={{ borderColor: BORDER }}>
            <p className="text-[10px] font-bold tracking-[0.1em] mb-2 uppercase" style={{ color: MUTED }}>
              ACTIVE ATTACK CASCADES
            </p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold leading-none" style={{ color: activeCount > 0 ? RED : TEXT }}>
                {activeCount}
              </span>
              {activeCount > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
              )}
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: MUTED }}>
              Uncontained propagation events
            </p>
          </div>

          <div className="bg-white border rounded-[10px] p-5 shadow-sm" style={{ borderColor: BORDER }}>
            <p className="text-[10px] font-bold tracking-[0.1em] mb-2 uppercase" style={{ color: MUTED }}>
              CONTAINED CASCADES
            </p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold leading-none" style={{ color: '#9333EA' }}>
                {containedCount}
              </span>
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: MUTED }}>
              Hosts safely isolated
            </p>
          </div>

          <div className="bg-white border rounded-[10px] p-5 shadow-sm" style={{ borderColor: BORDER }}>
            <p className="text-[10px] font-bold tracking-[0.1em] mb-2 uppercase" style={{ color: MUTED }}>
              RESOLVED CAMPAIGNS
            </p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold leading-none" style={{ color: GREEN }}>
                {resolvedCount}
              </span>
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: MUTED }}>
              Mitigated & remediated
            </p>
          </div>

          <div className="bg-white border rounded-[10px] p-5 shadow-sm" style={{ borderColor: BORDER }}>
            <p className="text-[10px] font-bold tracking-[0.1em] mb-2 uppercase" style={{ color: MUTED }}>
              CORRELATION WINDOW
            </p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold leading-none font-mono" style={{ color: STORM }}>
                120s
              </span>
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: MUTED }}>
              Sliding cross-host heuristic
            </p>
          </div>
        </div>

        {/* Cascade Cards / Table */}
        {filteredCascades.length === 0 ? (
          <div className="bg-white border rounded-[10px] p-12 shadow-sm" style={{ borderColor: BORDER }}>
            <EmptyState
              icon={<ShieldCheck className="w-12 h-12 stroke-1 text-emerald-600" />}
              title="No attack cascades detected"
              message="The cross-endpoint correlation engine is actively analyzing incoming detections across all hosts. No coordinated multi-endpoint attacks are active."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredCascades.map(cascade => {
              const sevBadge = SEVERITY_BADGES[cascade.severity] || SEVERITY_BADGES.MEDIUM
              const stBadge = STATUS_BADGES[cascade.status] || STATUS_BADGES.ACTIVE
              const confidencePct = Math.round(cascade.confidence * 100)

              return (
                <div
                  key={cascade._id}
                  className="bg-white border rounded-[12px] p-5 shadow-sm transition-all hover:shadow-md"
                  style={{ borderColor: cascade.status === 'ACTIVE' ? '#FECACA' : BORDER }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                          {cascade.cascadeId}
                        </span>

                        <span
                          className="text-[11px] font-extrabold px-2 py-0.5 rounded-full border"
                          style={{ backgroundColor: sevBadge.bg, color: sevBadge.color, borderColor: sevBadge.border }}
                        >
                          {cascade.severity}
                        </span>

                        <span
                          className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                          style={{ backgroundColor: stBadge.bg, color: stBadge.color }}
                        >
                          {cascade.status}
                        </span>

                        <span className="text-[11px] font-mono text-slate-500">
                          Confidence: <strong className="text-slate-800">{confidencePct}%</strong>
                        </span>

                        <span className="text-[11px] font-mono text-slate-400">
                          First seen: {new Date(cascade.firstSeen).toLocaleTimeString()}
                        </span>
                      </div>

                      <h3 className="text-base font-bold" style={{ color: TEXT }}>
                        {cascade.title}
                      </h3>

                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border" style={{ borderColor: BORDER }}>
                        <strong>Correlation Heuristic:</strong> {cascade.correlationReason}
                      </p>

                      {/* Affected Endpoints & IOC Pills */}
                      <div className="flex flex-wrap items-center gap-4 pt-1">
                        <div className="flex items-center gap-1.5">
                          <Server className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-700">Affected Endpoints ({cascade.affectedEndpointIds.length}):</span>
                          <div className="flex flex-wrap gap-1">
                            {cascade.affectedEndpointNames.map((name, i) => (
                              <span
                                key={i}
                                className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 border text-slate-800"
                                style={{ borderColor: BORDER }}
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>

                        {cascade.matchedIOCs && cascade.matchedIOCs.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Database className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-xs font-semibold text-slate-700">Matched IOCs:</span>
                            <div className="flex flex-wrap gap-1">
                              {cascade.matchedIOCs.map((ioc: string, i: number) => (
                                <span
                                  key={i}
                                  className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-700"
                                >
                                  {ioc}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap lg:flex-col items-end justify-center gap-2 flex-shrink-0">
                      {cascade.status === 'ACTIVE' && isAuthorized && (
                        <button
                          onClick={() => setContainConfirmId(cascade._id)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm cursor-pointer transition-transform active:scale-95"
                          style={{ backgroundColor: RED }}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Contain Attack (Isolate All)
                        </button>
                      )}

                      {cascade.status !== 'RESOLVED' && isAuthorized && (
                        <button
                          onClick={() => setResolveConfirmId(cascade._id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 border hover:bg-slate-50 cursor-pointer"
                          style={{ borderColor: BORDER }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Mark Resolved
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedCascade(cascade)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-800 hover:bg-teal-50 cursor-pointer"
                      >
                        Inspect Details
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Containment Confirmation Modal */}
      <ConfirmModal
        open={!!containConfirmId}
        onClose={() => setContainConfirmId(null)}
        onConfirm={handleContain}
        title="Contain Multi-Endpoint Cascade"
        message="This action will automatically dispatch safe isolation commands to all endpoints associated with this attack cascade to stop malware propagation. Proceed?"
        confirmLabel="Isolate Affected Hosts"
        danger
        loading={isProcessing}
      />

      {/* Resolve Confirmation Modal */}
      <ConfirmModal
        open={!!resolveConfirmId}
        onClose={() => setResolveConfirmId(null)}
        onConfirm={handleResolve}
        title="Resolve Attack Cascade"
        message="Are you sure you want to mark this attack cascade as resolved? This will archive the cascade incident in the audit trail."
        confirmLabel="Mark as Resolved"
        loading={isProcessing}
      />

      {/* Detailed Inspection Modal */}
      <Modal
        open={!!selectedCascade}
        onClose={() => setSelectedCascade(null)}
        title={selectedCascade ? `Cascade Inspection: ${selectedCascade.cascadeId}` : 'Cascade Details'}
        width="max-w-3xl"
      >
        {selectedCascade && (
          <div className="space-y-5">
            {/* Header info */}
            <div className="p-4 rounded-xl bg-slate-50 border space-y-2" style={{ borderColor: BORDER }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attack Classification</span>
                <span className="text-xs font-mono font-bold text-slate-800">{selectedCascade.attackType}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">{selectedCascade.title}</h3>
              <p className="text-xs text-slate-600">{selectedCascade.correlationReason}</p>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border bg-white" style={{ borderColor: BORDER }}>
                <p className="text-[10px] font-bold uppercase text-slate-400">Severity</p>
                <p className="text-sm font-bold text-red-600 mt-0.5">{selectedCascade.severity}</p>
              </div>
              <div className="p-3 rounded-lg border bg-white" style={{ borderColor: BORDER }}>
                <p className="text-[10px] font-bold uppercase text-slate-400">Confidence</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5 font-mono">{Math.round(selectedCascade.confidence * 100)}%</p>
              </div>
              <div className="p-3 rounded-lg border bg-white" style={{ borderColor: BORDER }}>
                <p className="text-[10px] font-bold uppercase text-slate-400">Status</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedCascade.status}</p>
              </div>
            </div>

            {/* Affected Endpoints List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Affected Endpoints ({selectedCascade.affectedEndpointNames.length})</h4>
              <div className="divide-y border rounded-xl bg-white overflow-hidden" style={{ borderColor: BORDER }}>
                {selectedCascade.affectedEndpointNames.map((name, idx) => {
                  const epId = selectedCascade.affectedEndpointIds[idx]
                  const epObj = endpoints.find(e => e._id === epId || e.name === name)

                  return (
                    <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-2.5">
                        <Server className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-xs font-bold text-slate-800">{name}</p>
                          <p className="text-[10px] font-mono text-slate-400">ID: {epId}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${epObj?.status === 'ISOLATED' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'}`}>
                          {epObj?.status || 'AT_RISK'}
                        </span>
                        {epId && (
                          <button
                            onClick={() => {
                              setSelectedCascade(null)
                              navigate('endpoints', { endpointId: epId })
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-800"
                            title="View Endpoint"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Related Detections */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Correlated Detections ({selectedCascade.relatedDetectionIds.length})</h4>
              <div className="p-3 border rounded-xl bg-slate-50 font-mono text-xs text-slate-700 space-y-1" style={{ borderColor: BORDER }}>
                {selectedCascade.relatedDetectionIds.map((detId, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span>Detection ID: <strong>{detId}</strong></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Close */}
            <div className="flex justify-end pt-3 border-t" style={{ borderColor: BORDER }}>
              <Button variant="secondary" onClick={() => setSelectedCascade(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  )
}
