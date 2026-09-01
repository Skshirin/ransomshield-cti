'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import { Download, Search, ChevronDown, Monitor, X, CheckCircle2, FileText, Activity, Database } from 'lucide-react'
import {
  P, STORM, BG, TEXT, MUTED, BORDER, RED, AMBER, GREEN,
  DETECTIONS, StatusBadge, ScoreBadge,
} from '@/components/ui'

function DetectionsContent() {
  type DET = typeof DETECTIONS[0];
  const [selected, setSelected] = useState<DET | null>(null);
  const [resolved, setResolved] = useState(false);

  const open = (d: DET) => { setSelected(d); setResolved(false); };

  const sevColor = (s: string) =>
    s === "Critical" ? RED : s === "High" ? "#F97316" : s === "Medium" ? AMBER : GREEN;

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-bold" style={{ color: TEXT }}>Detections</h1>
          <p className="text-[14px]" style={{ color: MUTED }}>5 incidents recorded</p>
        </div>
        <button className="flex items-center gap-2 h-10 px-4 rounded-[10px] text-[13px] font-medium border transition-colors hover:bg-gray-50 cursor-pointer"
          style={{ borderColor: BORDER, color: TEXT }}>
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl"
        style={{ backgroundColor: BG, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 px-3 h-8 rounded-lg border bg-white" style={{ borderColor: BORDER }}>
          <Search className="w-3 h-3 flex-shrink-0" style={{ color: MUTED }} />
          <input placeholder="Search detections..." className="text-[12px] outline-none w-40 bg-transparent" />
        </div>
        {["Date Range", "Endpoint", "Severity"].map(f => (
          <button key={f} className="flex items-center gap-1.5 px-3 h-8 rounded-lg border bg-white text-[12px] font-medium cursor-pointer"
            style={{ borderColor: BORDER, color: MUTED }}>
            {f} <ChevronDown className="w-3 h-3" />
          </button>
        ))}
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
            {DETECTIONS.map((d) => (
              <tr
                key={d.id}
                onClick={() => open(d)}
                className="border-b cursor-pointer hover:bg-[#F8FAFC] transition-all"
                style={{
                  borderColor: BORDER,
                  borderLeft: d.status === "New" ? `3px solid ${RED}` : `3px solid transparent`,
                }}
              >
                <td className="px-5 py-3.5 text-[12px]" style={{ color: MUTED, fontFamily: "var(--font-mono, monospace)" }}>
                  {d.time}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MUTED }} />
                    <span className="text-[13px] font-medium" style={{ color: TEXT }}>{d.endpoint}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5"><ScoreBadge score={d.score} /></td>
                <td className="px-5 py-3.5"><StatusBadge status={d.status} /></td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sevColor(d.severity) }} />
                    <span className="text-[12px]" style={{ color: MUTED }}>{d.severity}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination */}
        <div className="flex items-center justify-center gap-1 px-5 py-3 border-t" style={{ borderColor: BORDER }}>
          <button className="px-3 h-7 rounded text-[13px]" style={{ color: MUTED }}>Previous</button>
          {[1, 2, 3].map(p => (
            <button key={p} className="w-7 h-7 rounded text-[13px] font-medium transition-colors"
              style={{ backgroundColor: p === 1 ? P : "transparent", color: p === 1 ? "white" : MUTED }}>
              {p}
            </button>
          ))}
          <button className="px-3 h-7 rounded text-[13px]" style={{ color: MUTED }}>Next</button>
        </div>
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
                Detection marked as resolved.
              </div>
            )}

            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: BORDER }}>
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-[16px] font-bold" style={{ color: TEXT }}>{selected.endpoint}</h2>
                  <p className="text-[11px] mt-0.5" style={{ color: MUTED, fontFamily: "var(--font-mono, monospace)" }}>{selected.time}</p>
                </div>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[15px] font-bold"
                  style={{ backgroundColor: selected.score > 75 ? RED : AMBER }}
                >
                  {selected.score}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded hover:bg-gray-100 cursor-pointer">
                <X className="w-4 h-4" style={{ color: MUTED }} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6 flex-1">
              {/* Summary */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Summary</p>
                <div className="p-4 rounded-[10px] text-[13px] leading-relaxed" style={{ backgroundColor: BG, color: TEXT }}>
                  A {selected.severity.toLowerCase()}-severity ransomware signature was detected on {selected.endpoint}.
                  Rapid encryption of user files was identified across network shares, with associated lateral movement
                  patterns suggesting initial compromise via a phishing vector.
                </div>
              </div>

              {/* Behaviour indicators */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Behaviour Indicators</p>
                {[
                  { Icon: FileText, label: "Files encrypted", val: "1,204" },
                  { Icon: Activity, label: "Processes involved", val: "3" },
                  { Icon: Database, label: "Registry modifications", val: "12" },
                ].map(({ Icon, label, val }) => (
                  <div key={label} className="flex items-center gap-3 py-2.5 border-b" style={{ borderColor: BORDER }}>
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: STORM }} />
                    <span className="text-[13px] flex-1" style={{ color: TEXT }}>{label}</span>
                    <span className="text-[13px] font-bold" style={{ color: TEXT }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Timeline</p>
                {[
                  { time: "14:21:03", label: "Suspicious process spawned: vssadmin.exe", critical: true },
                  { time: "14:21:47", label: "Shadow copy deletion attempted", critical: true },
                  { time: "14:22:15", label: "Mass file rename detected (.locked extension)", critical: true },
                  { time: "14:23:01", label: "Network share enumeration began", critical: false },
                  { time: "14:23:07", label: "Alert triggered — endpoint quarantined", critical: false },
                ].map((ev, i, arr) => (
                  <div key={i} className="flex gap-3 pb-4 relative">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: ev.critical ? RED : MUTED }} />
                      {i < arr.length - 1 && (
                        <div className="flex-1 w-px mt-1" style={{ backgroundColor: BORDER }} />
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] mb-0.5" style={{ color: MUTED, fontFamily: "var(--font-mono, monospace)" }}>{ev.time}</p>
                      <p className="text-[13px]" style={{ color: TEXT }}>{ev.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sticky bottom-0 px-6 py-4 border-t bg-white flex items-center gap-3" style={{ borderColor: BORDER }}>
              <button className="text-[13px] hover:opacity-70 cursor-pointer" style={{ color: MUTED }}>Ignore / False Positive</button>
              <button
                onClick={() => setResolved(true)}
                className="ml-auto h-9 px-4 rounded-lg text-[13px] font-medium border hover:bg-gray-50 transition-colors cursor-pointer"
                style={{ borderColor: BORDER, color: TEXT }}
              >
                Mark as Resolved
              </button>
              <button className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white cursor-pointer" style={{ backgroundColor: P }}>
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
