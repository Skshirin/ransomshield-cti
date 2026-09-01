'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import { Download, Search, ChevronDown, Monitor, X, CheckCircle2, FileText, Activity, Database, ShieldCheck } from 'lucide-react'
import {
  P, STORM, BG, TEXT, MUTED, BORDER, RED, AMBER, GREEN,
  StatusBadge, ScoreBadge,
} from '@/components/ui'
import { useApp } from '@/lib/context'
import type { Detection } from '@/lib/types'

function DetectionsContent() {
  const { detections, resolveDetection, generateCTI, showToast } = useApp()
  const [selected, setSelected] = useState<Detection | null>(null)
  const [resolved, setResolved] = useState(false)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("All")

  const open = (d: Detection) => { setSelected(d); setResolved(false); }

  const sevColor = (s?: string) => {
    const sev = (s || '').toUpperCase()
    return sev === "CRITICAL" ? RED : sev === "HIGH" ? "#F97316" : sev === "MEDIUM" ? AMBER : GREEN
  }

  const filtered = detections.filter(d => {
    const matchesSearch =
      (d.endpointName || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.status || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.severity || "").toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  })

  const handleResolve = async (outcome: 'RESOLVED' | 'FALSE_POSITIVE') => {
    if (!selected) return
    try {
      await resolveDetection(selected._id, outcome)
      setResolved(true)
      setSelected(prev => prev ? { ...prev, status: outcome } : null)
    } catch {
      showToast("Failed to update detection status", "error")
    }
  }

  const handleGenerateCTI = async () => {
    if (!selected) return
    try {
      await generateCTI(selected._id)
      showToast("CTI Draft generated successfully", "success")
    } catch {
      showToast("Failed to generate CTI report", "error")
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-bold" style={{ color: TEXT }}>Detections</h1>
          <p className="text-[14px]" style={{ color: MUTED }}>{detections.length} incidents recorded</p>
        </div>
        <button
          onClick={() => showToast("Exported detections report", "info")}
          className="flex items-center gap-2 h-10 px-4 rounded-[10px] text-[13px] font-medium border transition-colors hover:bg-gray-50 cursor-pointer"
          style={{ borderColor: BORDER, color: TEXT }}
        >
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl"
        style={{ backgroundColor: BG, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 px-3 h-8 rounded-lg border bg-white" style={{ borderColor: BORDER }}>
          <Search className="w-3 h-3 flex-shrink-0" style={{ color: MUTED }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search detections..."
            className="text-[12px] outline-none w-40 bg-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-[10px] shadow-sm overflow-hidden" style={{ borderColor: BORDER }}>
        <table className="w-full">
          <thead>
            <tr className="bg-white border-b" style={{ borderColor: BORDER }}>
              {["Date / Time", "Endpoint", "Risk Score", "Status", "Severity"].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-[12px]" style={{ color: MUTED }}>
                  <div className="flex flex-col items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-green-600" />
                    <span>No detections found. Endpoints are clean and operating normally.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((d) => {
                const timeStr = d.detectedAt
                  ? new Date(d.detectedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })
                  : 'Recent'
                const isNew = d.status === 'NEW'

                return (
                  <tr
                    key={d._id}
                    onClick={() => open(d)}
                    className="border-b cursor-pointer hover:bg-[#F8FAFC] transition-all"
                    style={{
                      borderColor: BORDER,
                      borderLeft: isNew ? `3px solid ${RED}` : `3px solid transparent`,
                    }}
                  >
                    <td className="px-5 py-3.5 text-[12px]" style={{ color: MUTED, fontFamily: "var(--font-mono, monospace)" }}>
                      {timeStr}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MUTED }} />
                        <span className="text-[13px] font-medium" style={{ color: TEXT }}>{d.endpointName || "Unknown Endpoint"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><ScoreBadge score={d.riskScore ?? 0} /></td>
                    <td className="px-5 py-3.5"><StatusBadge status={d.status || 'New'} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sevColor(d.severity) }} />
                        <span className="text-[12px] capitalize" style={{ color: MUTED }}>{d.severity || 'Medium'}</span>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detection Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSelected(null)} />
          <div className="relative w-[560px] bg-white h-full shadow-2xl flex flex-col overflow-y-auto z-10">
            {resolved && (
              <div className="flex items-center gap-2 px-6 py-3 text-[13px] font-medium"
                style={{ backgroundColor: "rgba(22,163,74,0.08)", color: GREEN }}>
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                Detection status updated.
              </div>
            )}

            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: BORDER }}>
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-[16px] font-bold" style={{ color: TEXT }}>{selected.endpointName || "Endpoint"}</h2>
                  <p className="text-[11px] mt-0.5" style={{ color: MUTED, fontFamily: "var(--font-mono, monospace)" }}>
                    {selected.detectedAt ? new Date(selected.detectedAt).toLocaleString() : 'Recent'}
                  </p>
                </div>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[15px] font-bold"
                  style={{ backgroundColor: (selected.riskScore ?? 0) > 75 ? RED : AMBER }}
                >
                  {selected.riskScore ?? 0}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded hover:bg-gray-100 cursor-pointer">
                <X className="w-4 h-4" style={{ color: MUTED }} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6 flex-1">
              {/* Summary */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Detection Overview</p>
                <div className="p-4 rounded-[10px] text-[13px] leading-relaxed" style={{ backgroundColor: BG, color: TEXT }}>
                  A {selected.severity?.toLowerCase() || 'medium'}-severity ransomware indicator burst was detected on {selected.endpointName}.
                  Risk score calculated by XGBoost feature extraction engine: {selected.riskScore}/100.
                </div>
              </div>

              {/* Behaviour indicators */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Observed Indicators</p>
                {selected.indicators && selected.indicators.length > 0 ? (
                  selected.indicators.map((ind: any, i: number) => {
                    const text = typeof ind === 'string' ? ind : (ind.description || ind.type || JSON.stringify(ind))
                    return (
                      <div key={i} className="flex items-start gap-3 py-2.5 border-b" style={{ borderColor: BORDER }}>
                        <Activity className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: STORM }} />
                        <span className="text-[13px] flex-1" style={{ color: TEXT }}>{text}</span>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-[12px]" style={{ color: MUTED }}>Simulated telemetry pattern matched local XGBoost model thresholds.</p>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 px-6 py-4 border-t bg-white flex items-center gap-3" style={{ borderColor: BORDER }}>
              <button
                onClick={() => handleResolve('FALSE_POSITIVE')}
                className="text-[13px] hover:opacity-70 cursor-pointer text-gray-500"
              >
                Mark False Positive
              </button>
              <button
                onClick={() => handleResolve('RESOLVED')}
                className="ml-auto h-9 px-4 rounded-lg text-[13px] font-medium border hover:bg-gray-50 transition-colors cursor-pointer"
                style={{ borderColor: BORDER, color: TEXT }}
              >
                Mark as Resolved
              </button>
              <button
                onClick={handleGenerateCTI}
                className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white cursor-pointer"
                style={{ backgroundColor: P }}
              >
                Generate CTI Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DetectionsPage() {
  return (
    <Layout>
      <DetectionsContent />
    </Layout>
  )
}
