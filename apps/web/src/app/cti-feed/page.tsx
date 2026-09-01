'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import { AlertTriangle, Check, X, ExternalLink, Monitor } from 'lucide-react'
import {
  P, STORM, BG, TEXT, MUTED, BORDER, RED, AMBER, GREEN,
  CTI_FEED,
} from '@/components/ui'

function CTIFeedContent() {
  type FEED = typeof CTI_FEED[0];
  const [selected, setSelected] = useState<FEED | null>(null);
  const [reviewed, setReviewed] = useState<number[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered = CTI_FEED.filter(c => activeFilter === "All" || c.type === activeFilter);

  const typeColor = (t: string) =>
    t === "Ransomware" ? RED : t === "Phishing" ? AMBER : STORM;
  const typeBg = (t: string) =>
    t === "Ransomware" ? "rgba(220,38,38,0.08)" : t === "Phishing" ? "rgba(245,158,11,0.08)" : "rgba(65,94,114,0.08)";

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-[24px] font-bold" style={{ color: TEXT }}>CTI Feed</h1>
        <p className="text-[14px]" style={{ color: MUTED }}>Threat intelligence shared across the network.</p>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {["All", "Ransomware", "Phishing", "Supply Chain"].map(t => (
          <button
            key={t}
            onClick={() => setActiveFilter(t)}
            className="px-3 h-8 rounded-full text-[12px] font-medium border transition-colors cursor-pointer"
            style={{
              borderColor: activeFilter === t ? P : BORDER,
              backgroundColor: activeFilter === t ? "rgba(23,49,62,0.07)" : "white",
              color: activeFilter === t ? P : MUTED,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((c) => (
          <div
            key={c.id}
            onClick={() => setSelected(c)}
            className="bg-white border rounded-[10px] p-5 cursor-pointer transition-all hover:shadow-md"
            style={{ borderColor: BORDER }}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: typeBg(c.type) }}>
                <AlertTriangle className="w-4 h-4" style={{ color: typeColor(c.type) }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-bold" style={{ color: TEXT }}>{c.type}</span>
                  <span className="text-[12px]" style={{ color: MUTED }}>
                    — {c.org === "Anonymous" ? <em style={{ color: MUTED }}>Anonymous</em> : c.org}
                  </span>
                </div>
                <p className="text-[13px] truncate mb-1.5" style={{ color: MUTED }}>{c.preview}</p>
                <span className="text-[11px]" style={{ color: MUTED }}>{c.time}</span>
              </div>
              <div className="flex-shrink-0">
                {c.verified
                  ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{ backgroundColor: "rgba(22,163,74,0.1)", color: GREEN }}>
                      <Check className="w-3 h-3" /> Verified
                    </span>
                  )
                  : (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#92400E" }}>
                      Pending
                    </span>
                  )
                }
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTI Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSelected(null)} />
          <div className="relative w-[560px] bg-white h-full shadow-2xl flex flex-col overflow-y-auto z-10">
            <div className="flex items-start justify-between px-6 py-5 border-b" style={{ borderColor: BORDER }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-[16px] font-bold" style={{ color: TEXT }}>{selected.type}</h2>
                  {selected.verified
                    ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ backgroundColor: "rgba(22,163,74,0.1)", color: GREEN }}>
                        <Check className="w-3 h-3" /> Verified
                      </span>
                    )
                    : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#92400E" }}>
                        Pending
                      </span>
                    )
                  }
                </div>
                <p className="text-[12px]" style={{ color: MUTED }}>Source: {selected.org} · {selected.time}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded hover:bg-gray-100 mt-0.5 cursor-pointer">
                <X className="w-4 h-4" style={{ color: MUTED }} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Full Description</p>
                <p className="text-[13px] leading-relaxed" style={{ color: TEXT }}>
                  {selected.preview} Attackers were observed using multiple evasion techniques including process
                  injection and legitimate tool abuse (LOLBaS). Initial access vector confirmed as spear-phishing
                  with weaponized Office documents containing malicious macro payloads.
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Indicators of Compromise</p>
                <div className="flex flex-wrap gap-2">
                  {["3f2a1b4c5d6e7f8a", "185.220.101.47", "malicious-doc.xlsm", "C:\\Temp\\loader.exe"].map(ioc => (
                    <span key={ioc} className="px-2.5 py-1 rounded border text-[11px]"
                      style={{ borderColor: BORDER, backgroundColor: BG, color: TEXT, fontFamily: "var(--font-mono, monospace)" }}>
                      {ioc}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Affected Systems</p>
                {[
                  "Endpoint Type: Workstation",
                  "OS: Windows 10 / Windows 11",
                  "Sector: Healthcare, Finance",
                ].map(s => (
                  <div key={s} className="flex items-center gap-2 py-2.5 border-b text-[13px]" style={{ borderColor: BORDER, color: TEXT }}>
                    <Monitor className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MUTED }} />
                    {s}
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Recommended Actions</p>
                {[
                  "Block listed IPs at perimeter firewall",
                  "Scan all endpoints for IOC file hashes",
                  "Enable MFA on all remote access services",
                  "Patch CVE-2023-36884 on all Windows hosts",
                ].map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5 py-2.5 border-b" style={{ borderColor: BORDER }}>
                    <div className="w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center"
                      style={{ borderColor: GREEN }}>
                      <Check className="w-2.5 h-2.5" style={{ color: GREEN }} />
                    </div>
                    <span className="text-[13px]" style={{ color: TEXT }}>{a}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sticky bottom-0 px-6 py-4 border-t bg-white flex items-center gap-2" style={{ borderColor: BORDER }}>
              <button className="h-9 px-4 rounded-lg text-[13px] font-medium border hover:bg-gray-50 transition-colors cursor-pointer"
                style={{ borderColor: BORDER, color: TEXT }}>
                Download Report
              </button>
              <button className="h-9 px-4 rounded-lg text-[13px] font-medium border hover:bg-gray-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                style={{ borderColor: BORDER, color: TEXT }}>
                <ExternalLink className="w-3.5 h-3.5" /> View on Blockchain
              </button>
              <button
                onClick={() => !reviewed.includes(selected.id) && setReviewed(r => [...r, selected.id])}
                disabled={reviewed.includes(selected.id)}
                className="ml-auto h-9 px-4 rounded-lg text-[13px] font-semibold text-white transition-colors cursor-pointer"
                style={{
                  backgroundColor: reviewed.includes(selected.id) ? GREEN : P,
                  cursor: reviewed.includes(selected.id) ? "default" : "pointer",
                }}
              >
                {reviewed.includes(selected.id) ? "Reviewed ✓" : "Mark as Reviewed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CTIFeedPage() {
  return (
    <Layout>
      <CTIFeedContent />
    </Layout>
  )
}
