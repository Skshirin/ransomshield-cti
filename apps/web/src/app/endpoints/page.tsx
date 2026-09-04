'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import { Plus, Search, Monitor, MoreVertical, X, Copy, Check, ShieldAlert, ShieldCheck } from 'lucide-react'
import {
  P, STORM, BG, TEXT, MUTED, BORDER, RED, GREEN,
  StatusBadge, ScoreBadge, FieldInput, PrimaryBtn,
} from '@/components/ui'
import { ResponseTimeline } from '@/components/ResponseTimeline'
import { useApp } from '@/lib/context'
import type { Endpoint } from '@/lib/types'

function EndpointsContent() {
  const { endpoints, addEndpoint, removeEndpoint, isolateEndpoint, unisolateEndpoint, resolveDetection, detections, showToast } = useApp()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [isolateConfirmOpen, setIsolateConfirmOpen] = useState(false)
  const [isActionPending, setIsActionPending] = useState(false)
  const [resolvingDetectionId, setResolvingDetectionId] = useState<string | null>(null)
  const [newEndpointName, setNewEndpointName] = useState("")
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [installSteps, setInstallSteps] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("All")

  const selected = selectedId ? endpoints.find(e => e._id === selectedId) || null : null

  const totalCount = endpoints.length
  const onlineCount = endpoints.filter(e => e.status === 'ONLINE').length
  const isolatedCount = endpoints.filter(e => e.status === 'ISOLATED').length

  const filtered = endpoints.filter(e => {
    const matchesFilter =
      filter === "All" ||
      (filter === "Online" && e.status === "ONLINE") ||
      (filter === "At Risk" && e.status === "AT_RISK") ||
      (filter === "Isolated" && e.status === "ISOLATED") ||
      (filter === "Offline" && (e.status === "OFFLINE" || e.status === "PENDING"))
    const matchesSearch = (e.name || "").toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const handleCreateEndpoint = async () => {
    if (!newEndpointName.trim()) {
      showToast("Please enter an endpoint name", "error")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await addEndpoint(newEndpointName.trim())
      setGeneratedToken(res.activationToken)
      setInstallSteps(res.installInstructions)
    } catch {
      showToast("Failed to create endpoint", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleIsolate = async () => {
    if (!selected) return
    setIsActionPending(true)
    try {
      await isolateEndpoint(selected._id, "Manual isolation from dashboard")
      setIsolateConfirmOpen(false)
    } catch {
      showToast("Isolation failed", "error")
    } finally {
      setIsActionPending(false)
    }
  }

  const handleUnisolate = async () => {
    if (!selected) return
    setIsActionPending(true)
    try {
      await unisolateEndpoint(selected._id)
    } catch {
      showToast("Failed to release isolation", "error")
    } finally {
      setIsActionPending(false)
    }
  }

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(token)
    setCopied(true)
    showToast("Activation token copied to clipboard", "success")
    setTimeout(() => setCopied(false), 2000)
  }

  const formatLastSeen = (dateStr?: string) => {
    if (!dateStr) return "Never"
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 15) return "Just now"
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-bold" style={{ color: TEXT }}>Endpoints</h1>
          <p className="text-[14px]" style={{ color: MUTED }}>
            {totalCount} total · {onlineCount} online {isolatedCount > 0 ? `· ${isolatedCount} isolated` : ''}
          </p>
        </div>
        <button
          onClick={() => {
            setAddOpen(true)
            setGeneratedToken(null)
            setNewEndpointName("")
            setCopied(false)
          }}
          className="flex items-center gap-2 h-10 px-4 rounded-[10px] text-[13px] font-semibold text-white cursor-pointer"
          style={{ backgroundColor: P }}
        >
          <Plus className="w-4 h-4" /> Add Endpoint
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 h-9 rounded-lg border bg-white"
          style={{ borderColor: BORDER, width: 280 }}>
          <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MUTED }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search endpoints..."
            className="flex-1 text-[13px] outline-none bg-transparent"
            style={{ color: TEXT }}
          />
        </div>
        {["All", "Online", "At Risk", "Isolated", "Offline"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 h-9 rounded-lg text-[13px] font-medium border transition-colors cursor-pointer"
            style={{
              borderColor: filter === f ? P : BORDER,
              backgroundColor: filter === f ? "rgba(23,49,62,0.07)" : "white",
              color: filter === f ? P : MUTED,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border rounded-[10px] shadow-sm overflow-hidden" style={{ borderColor: BORDER }}>
        <table className="w-full">
          <thead>
            <tr className="border-b bg-white" style={{ borderColor: BORDER }}>
              {["Endpoint Name", "Status", "Last Check-in", "OS Version", ""].map((h, i) => (
                <th key={i} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[12px]" style={{ color: MUTED }}>
                  No endpoints found matching your criteria.
                </td>
              </tr>
            ) : (
              filtered.map((ep) => {
                const displayStatus =
                  ep.status === 'ONLINE' ? 'Online' :
                  ep.status === 'AT_RISK' ? 'At Risk' :
                  ep.status === 'ISOLATED' ? 'Isolated' : 'Offline'

                return (
                  <tr
                    key={ep._id}
                    onClick={() => setSelectedId(ep._id)}
                    className="border-b cursor-pointer hover:bg-[#F8FAFC] transition-all"
                    style={{ borderColor: BORDER }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MUTED }} />
                        <span className="text-[13px] font-semibold" style={{ color: TEXT }}>{ep.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={displayStatus} /></td>
                    <td className="px-5 py-3.5 text-[13px]" style={{ color: MUTED }}>{formatLastSeen(ep.lastCheckInAt)}</td>
                    <td className="px-5 py-3.5 text-[13px]" style={{ color: MUTED }}>{ep.osVersion || "Windows 11"}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        className="p-1.5 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={e => {
                          e.stopPropagation()
                          setSelectedId(ep._id)
                        }}
                      >
                        <MoreVertical className="w-4 h-4" style={{ color: MUTED }} />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Endpoint Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSelectedId(null)} />
          <div className="relative w-[480px] bg-white h-full shadow-2xl flex flex-col overflow-y-auto z-10">
            <div className="flex items-start justify-between px-6 py-5 border-b" style={{ borderColor: BORDER }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-[16px] font-bold" style={{ color: TEXT }}>{selected.name}</h2>
                  <StatusBadge
                    status={
                      selected.status === 'ONLINE' ? 'Online' :
                      selected.status === 'AT_RISK' ? 'At Risk' :
                      selected.status === 'ISOLATED' ? 'Isolated' : 'Offline'
                    }
                  />
                </div>
                <p className="text-[12px]" style={{ color: MUTED }}>Last seen {formatLastSeen(selected.lastCheckInAt)} · {selected.osVersion || "Windows"}</p>
              </div>
              <button onClick={() => setSelectedId(null)} className="p-1.5 rounded hover:bg-gray-100 mt-0.5 cursor-pointer">
                <X className="w-4 h-4" style={{ color: MUTED }} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6">
              {/* Isolation Banner */}
              {selected.status === 'ISOLATED' && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-purple-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-bold text-purple-900">Endpoint Isolated</p>
                    <p className="text-[12px] text-purple-700 mt-0.5 leading-relaxed">
                      This host is logically isolated from the network. Response actions are enforced.
                    </p>
                  </div>
                </div>
              )}

              {/* Specs */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Live Telemetry & Resource Stats</p>
                {[
                  { label: "CPU Usage", val: selected.cpuUsagePercent ?? 0 },
                  { label: "RAM Usage", val: selected.ramUsagePercent ?? 0 },
                  { label: "Disk Usage", val: selected.diskUsagePercent ?? 0 },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-3 mb-2.5">
                    <span className="text-[12px] w-20" style={{ color: MUTED }}>{s.label}</span>
                    <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: BORDER }}>
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, s.val))}%`, backgroundColor: s.val > 80 ? RED : STORM }}
                      />
                    </div>
                    <span className="text-[12px] font-semibold w-7 text-right" style={{ color: TEXT }}>{s.val}%</span>
                  </div>
                ))}
              </div>

              {/* Detection history */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Detection History</p>
                {detections.filter(d => d.endpointId === selected._id || d.endpointName === selected.name).length === 0 ? (
                  <p className="text-[12px]" style={{ color: MUTED }}>No detections for this endpoint. Host is clean.</p>
                ) : (
                  detections
                    .filter(d => d.endpointId === selected._id || d.endpointName === selected.name)
                    .map(d => {
                      const isActive = d.status === 'NEW' || d.status === 'INVESTIGATING'
                      return (
                        <div key={d._id} className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: BORDER }}>
                          <div>
                            <span className="text-[11px] block" style={{ color: MUTED, fontFamily: "var(--font-mono, monospace)" }}>
                              {d.detectedAt ? new Date(d.detectedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recent'}
                            </span>
                            {d.indicators && d.indicators[0] && (
                              <span className="text-[12px] font-medium block truncate max-w-[200px]" style={{ color: TEXT }}>
                                {typeof d.indicators[0] === 'string' ? d.indicators[0] : (d.indicators[0].description || d.indicators[0].type)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <ScoreBadge score={d.riskScore ?? 0} />
                            <StatusBadge status={d.status || 'New'} />
                            {isActive && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  setResolvingDetectionId(d._id)
                                  try {
                                    await resolveDetection(d._id, 'RESOLVED')
                                  } catch {
                                    // Toast handled by provider
                                  } finally {
                                    setResolvingDetectionId(null)
                                  }
                                }}
                                disabled={resolvingDetectionId === d._id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                              >
                                <Check className="w-3 h-3" />
                                {resolvingDetectionId === d._id ? "Resolving..." : "Resolve"}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })
                )}
              </div>

              {/* Response Action Timeline */}
              <div className="pt-2 border-t" style={{ borderColor: BORDER }}>
                <ResponseTimeline endpointId={selected._id} />
              </div>
            </div>

            {/* Actions footer */}
            <div className="mt-auto px-6 py-4 border-t flex flex-col gap-2.5" style={{ borderColor: BORDER }}>
              <div className="flex gap-3">
                {selected.status === 'ISOLATED' ? (
                  <button
                    onClick={handleUnisolate}
                    disabled={isActionPending}
                    className="flex-1 h-10 rounded-lg text-[13px] font-medium border border-green-600 text-green-700 hover:bg-green-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {isActionPending ? "Releasing..." : "Release Isolation"}
                  </button>
                ) : (
                  <button
                    onClick={() => setIsolateConfirmOpen(true)}
                    className="flex-1 h-10 rounded-lg text-[13px] font-medium bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Isolate Endpoint
                  </button>
                )}
                <button
                  onClick={() => {
                    removeEndpoint(selected._id)
                    setSelectedId(null)
                  }}
                  className="px-4 h-10 rounded-lg text-[13px] font-medium border transition-colors hover:bg-red-50 cursor-pointer"
                  style={{ borderColor: RED, color: RED }}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Isolate Confirmation Modal */}
      {isolateConfirmOpen && selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsolateConfirmOpen(false)} />
          <div className="relative w-full max-w-[440px] bg-white rounded-2xl shadow-2xl p-6 z-10 border" style={{ borderColor: BORDER }}>
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 text-red-600">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[16px] font-bold" style={{ color: TEXT }}>Isolate {selected.name}?</h3>
                <p className="text-[13px] text-slate-600 mt-1.5 leading-relaxed">
                  Isolation will stop this endpoint from participating normally in the SentinelIQ environment.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsolateConfirmOpen(false)}
                disabled={isActionPending}
                className="h-9 px-4 rounded-lg text-[13px] font-medium border text-slate-700 hover:bg-slate-50 cursor-pointer"
                style={{ borderColor: BORDER }}
              >
                Cancel
              </button>
              <button
                onClick={handleIsolate}
                disabled={isActionPending}
                className="h-9 px-4 rounded-lg text-[13px] font-semibold bg-red-600 text-white hover:bg-red-700 cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                {isActionPending ? "Isolating..." : "Isolate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Endpoint Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20" onClick={() => setAddOpen(false)} />
          <div className="relative w-full max-w-[480px] bg-white rounded-2xl shadow-2xl p-7 z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[18px] font-bold" style={{ color: TEXT }}>Add New Endpoint</h2>
              <button onClick={() => setAddOpen(false)} className="hover:opacity-70 cursor-pointer">
                <X className="w-4 h-4" style={{ color: MUTED }} />
              </button>
            </div>

            {!generatedToken ? (
              <div>
                <FieldInput
                  label="Endpoint Name"
                  placeholder="e.g. WORKSTATION-A05"
                  value={newEndpointName}
                  onChange={setNewEndpointName}
                />
                <div className="mt-4">
                  <PrimaryBtn onClick={handleCreateEndpoint} disabled={isSubmitting}>
                    {isSubmitting ? "Generating..." : "Generate Activation Token"}
                  </PrimaryBtn>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 min-w-0">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold mb-2" style={{ color: MUTED }}>Generated Activation Token</p>
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg border min-w-0"
                    style={{ borderColor: BORDER, backgroundColor: BG }}
                  >
                    <span
                      className="flex-1 min-w-0 text-[12px] truncate select-all"
                      title={generatedToken}
                      style={{
                        color: TEXT,
                        fontFamily: "var(--font-mono, monospace)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {generatedToken}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(generatedToken)}
                      className="flex-shrink-0 p-1 hover:bg-gray-100 rounded cursor-pointer transition-colors"
                      title="Copy activation token"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" style={{ color: MUTED }} />}
                    </button>
                  </div>
                  <p className="text-[11px] mt-1 text-amber-600">Save this token. It acts as the activation credential for the agent process.</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold mb-2.5" style={{ color: MUTED }}>Installation Steps</p>
                  {[
                    "Add ACTIVATION_TOKEN=" + generatedToken + " in the agent's .env file",
                    "Launch agent: python agent/main.py --env-file=<path-to-env>",
                    "The endpoint will automatically connect, activate, and appear ONLINE",
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-3 mb-2.5 min-w-0">
                      <span
                        className="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 text-white mt-0.5"
                        style={{ backgroundColor: P }}
                      >{i + 1}</span>
                      <span
                        className="flex-1 min-w-0 text-[13px] leading-snug break-all"
                        style={{ color: TEXT }}
                      >
                        {s}
                      </span>
                    </div>
                  ))}
                </div>
                <PrimaryBtn onClick={() => setAddOpen(false)}>Done</PrimaryBtn>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function EndpointsPage() {
  return (
    <Layout>
      <EndpointsContent />
    </Layout>
  )
}
