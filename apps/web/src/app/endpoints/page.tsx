'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import { Plus, Search, Monitor, MoreVertical, X, Copy } from 'lucide-react'
import {
  P, STORM, BG, TEXT, MUTED, BORDER, RED,
  ENDPOINTS, DETECTIONS, StatusBadge, ScoreBadge, FieldInput, PrimaryBtn,
} from '@/components/ui'

function EndpointsContent() {
  type EP = typeof ENDPOINTS[0];
  const [selected, setSelected] = useState<EP | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = ENDPOINTS.filter(e =>
    (filter === "All" || e.status === filter) &&
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-bold" style={{ color: TEXT }}>Endpoints</h1>
          <p className="text-[14px]" style={{ color: MUTED }}>52 total, 48 online</p>
        </div>
        <button
          onClick={() => { setAddOpen(true); setGenerated(false); }}
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
        {["All", "Online", "At Risk", "Offline"].map(f => (
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
            {filtered.map((ep) => (
              <tr
                key={ep.id}
                onClick={() => setSelected(ep)}
                className="border-b cursor-pointer hover:bg-[#F8FAFC] transition-all"
                style={{ borderColor: BORDER }}
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MUTED }} />
                    <span className="text-[13px] font-semibold" style={{ color: TEXT }}>{ep.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5"><StatusBadge status={ep.status} /></td>
                <td className="px-5 py-3.5 text-[13px]" style={{ color: MUTED }}>{ep.lastSeen}</td>
                <td className="px-5 py-3.5 text-[13px]" style={{ color: MUTED }}>{ep.os}</td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    className="p-1.5 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={e => e.stopPropagation()}
                  >
                    <MoreVertical className="w-4 h-4" style={{ color: MUTED }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Endpoint Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSelected(null)} />
          <div className="relative w-[480px] bg-white h-full shadow-2xl flex flex-col overflow-y-auto z-10">
            <div className="flex items-start justify-between px-6 py-5 border-b" style={{ borderColor: BORDER }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-[16px] font-bold" style={{ color: TEXT }}>{selected.name}</h2>
                  <StatusBadge status={selected.status} />
                </div>
                <p className="text-[12px]" style={{ color: MUTED }}>Last seen {selected.lastSeen} · {selected.os}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded hover:bg-gray-100 mt-0.5 cursor-pointer">
                <X className="w-4 h-4" style={{ color: MUTED }} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6">
              {/* Specs */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>System Specs</p>
                {[
                  { label: "CPU Usage", val: selected.cpu },
                  { label: "RAM Usage", val: selected.ram },
                  { label: "Disk Usage", val: selected.disk },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-3 mb-2.5">
                    <span className="text-[12px] w-20" style={{ color: MUTED }}>{s.label}</span>
                    <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: BORDER }}>
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${s.val}%`, backgroundColor: s.val > 80 ? RED : STORM }}
                      />
                    </div>
                    <span className="text-[12px] font-semibold w-7 text-right" style={{ color: TEXT }}>{s.val}%</span>
                  </div>
                ))}
              </div>

              {/* File activity */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Recent File Activity</p>
                {[
                  { path: "C:\\Users\\Admin\\Documents\\report_q4.docx", warn: false },
                  { path: "C:\\Windows\\System32\\cmd.exe", warn: false },
                  { path: "C:\\Users\\Admin\\AppData\\Local\\Temp\\~tmp482.dat", warn: true },
                ].map(({ path, warn }, i) => (
                  <div key={i} className="flex items-start gap-2 py-2 border-b" style={{ borderColor: BORDER }}>
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: warn ? RED : BORDER }} />
                    <span className="text-[11px] break-all" style={{ color: MUTED, fontFamily: "var(--font-mono, monospace)" }}>{path}</span>
                  </div>
                ))}
              </div>

              {/* Detection history */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Detection History</p>
                {DETECTIONS.filter(d => d.endpoint === selected.name).length === 0
                  ? <p className="text-[12px]" style={{ color: MUTED }}>No detections for this endpoint.</p>
                  : DETECTIONS.filter(d => d.endpoint === selected.name).map(d => (
                    <div key={d.id} className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: BORDER }}>
                      <span className="text-[11px]" style={{ color: MUTED, fontFamily: "var(--font-mono, monospace)" }}>{d.time}</span>
                      <div className="flex items-center gap-2">
                        <ScoreBadge score={d.score} />
                        <StatusBadge status={d.status} />
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

            <div className="mt-auto px-6 py-4 border-t flex gap-3" style={{ borderColor: BORDER }}>
              <button className="flex-1 h-10 rounded-lg text-[13px] font-medium border transition-colors hover:bg-gray-50 cursor-pointer"
                style={{ borderColor: BORDER, color: TEXT }}>Rename</button>
              <button className="flex-1 h-10 rounded-lg text-[13px] font-medium border transition-colors hover:bg-red-50 cursor-pointer"
                style={{ borderColor: RED, color: RED }}>Deactivate</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Endpoint Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setAddOpen(false)} />
          <div className="relative w-[480px] bg-white rounded-2xl shadow-2xl p-7 z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[18px] font-bold" style={{ color: TEXT }}>Add New Endpoint</h2>
              <button onClick={() => setAddOpen(false)} className="hover:opacity-70 cursor-pointer">
                <X className="w-4 h-4" style={{ color: MUTED }} />
              </button>
            </div>
            <FieldInput label="Endpoint Name" placeholder="e.g. WORKSTATION-A05" value="" onChange={() => {}} />
            {!generated
              ? (
                <div className="mt-4">
                  <PrimaryBtn onClick={() => setGenerated(true)}>Generate Installer</PrimaryBtn>
                </div>
              )
              : (
                <div className="mt-4 flex flex-col gap-4">
                  <div>
                    <p className="text-[12px] font-semibold mb-2" style={{ color: MUTED }}>Installation Token</p>
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border"
                      style={{ borderColor: BORDER, backgroundColor: BG }}>
                      <span className="flex-1 text-[12px] truncate" style={{ color: TEXT, fontFamily: "var(--font-mono, monospace)" }}>
                        SENTIQ-4F2A-7B9C-E1D3-8A6F
                      </span>
                      <button><Copy className="w-3.5 h-3.5 cursor-pointer" style={{ color: MUTED }} /></button>
                    </div>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold mb-2.5" style={{ color: MUTED }}>Installation Steps</p>
                    {[
                      "Download the installer package below",
                      "Run installer with administrator privileges",
                      "Enter the token when prompted, then restart",
                    ].map((s, i) => (
                      <div key={i} className="flex gap-3 mb-2.5">
                        <span
                          className="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 text-white"
                          style={{ backgroundColor: P }}
                        >{i + 1}</span>
                        <span className="text-[13px]" style={{ color: TEXT }}>{s}</span>
                      </div>
                    ))}
                  </div>
                  <PrimaryBtn>Download Installer</PrimaryBtn>
                </div>
              )
            }
          </div>
        </div>
      )}
    </div>
  );
}

export default function EndpointsPage() {
  return (
    <Layout>
      <EndpointsContent />
    </Layout>
  )
}
