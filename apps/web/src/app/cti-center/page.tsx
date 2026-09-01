'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import { Check, ChevronRight, Lock, Loader2, ExternalLink, CheckCircle2 } from 'lucide-react'
import {
  P, STORM, BG, TEXT, MUTED, BORDER, RED, GREEN,
} from '@/components/ui'

function CTICenterContent() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [visibility, setVisibility] = useState<"org" | "network">("network");
  const [publishing, setPublishing] = useState(false);

  const stepLabels = ["Review Draft", "Publish", "Verify"];

  const doPublish = () => {
    setPublishing(true);
    setTimeout(() => { setPublishing(false); setStep(3); }, 2200);
  };

  return (
    <div className="p-6">
      <h1 className="text-[24px] font-bold mb-6" style={{ color: TEXT }}>CTI Center</h1>

      {/* Step indicator */}
      <div className="flex items-start justify-center gap-0 mb-8">
        {stepLabels.map((label, i) => {
          const n = i + 1 as 1 | 2 | 3;
          const done = n < step;
          const active = n === step;
          return (
            <div key={n} className="flex items-start">
              <div className="flex flex-col items-center gap-2 w-28">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold border-2 transition-all"
                  style={{
                    backgroundColor: done ? GREEN : active ? P : "white",
                    borderColor: done ? GREEN : active ? P : BORDER,
                    color: done || active ? "white" : MUTED,
                  }}
                >
                  {done ? <Check className="w-4 h-4" /> : n}
                </div>
                <span className="text-[12px] font-medium text-center" style={{ color: active ? TEXT : MUTED }}>{label}</span>
              </div>
              {i < 2 && (
                <div className="w-24 h-px mt-4" style={{ backgroundColor: done ? GREEN : BORDER }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Stage 1 */}
      {step === 1 && (
        <>
          <div className="grid grid-cols-5 gap-6">
            <div className="col-span-3 flex flex-col gap-4">
              <div className="border rounded-[10px] overflow-hidden" style={{ borderColor: BORDER }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: BORDER, backgroundColor: BG }}>
                  <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>Attack Summary</p>
                </div>
                <p className="p-4 text-[13px] leading-relaxed" style={{ color: TEXT }}>
                  LockBit 3.0 ransomware variant detected targeting network shares via lateral movement.
                  Initial access achieved through a phishing email with a macro-enabled document. The attacker
                  executed vssadmin.exe to delete shadow copies before initiating mass file encryption
                  with the .locked extension. Estimated 1,204 files affected across 3 network shares.
                </p>
              </div>

              <div className="border rounded-[10px] overflow-hidden" style={{ borderColor: BORDER }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: BORDER, backgroundColor: BG }}>
                  <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>Indicators of Compromise</p>
                </div>
                <div className="p-4 flex flex-wrap gap-2">
                  {["3f2a1b4c5d6e7f8a9b0c", "192.168.1.47", "vssadmin.exe", "C:\\Temp\\~tmp482.dat", "*.locked", "SHA256:a1b2c3d4"].map(ioc => (
                    <span key={ioc} className="px-2.5 py-1 rounded border text-[11px]"
                      style={{ borderColor: BORDER, backgroundColor: BG, color: TEXT, fontFamily: "var(--font-mono, monospace)" }}>
                      {ioc}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border rounded-[10px] overflow-hidden" style={{ borderColor: BORDER }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: BORDER, backgroundColor: BG }}>
                  <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>Recommended Actions</p>
                </div>
                <ul className="p-4 flex flex-col gap-2.5">
                  {[
                    "Isolate affected endpoint immediately from network",
                    "Restore from last clean backup (pre-14:21 UTC)",
                    "Reset credentials for all accounts accessed from affected host",
                    "Patch email gateway — block macro-enabled attachments",
                  ].map((a, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px]" style={{ color: TEXT }}>
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: P }} />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Sidebar */}
            <div className="col-span-2">
              <div className="sticky top-4 border rounded-[10px] overflow-hidden" style={{ borderColor: BORDER }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: BORDER, backgroundColor: BG }}>
                  <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>Affected Endpoint</p>
                </div>
                <div className="p-4 flex flex-col gap-2.5 border-b" style={{ borderColor: BORDER }}>
                  {[
                    ["Hostname", "SERVER-MAIN-01"],
                    ["OS", "Ubuntu 22.04 LTS"],
                    ["Risk Score", "96 / 100"],
                    ["Detection Time", "2024-01-15 14:23:07"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-[12px]" style={{ color: MUTED }}>{k}</span>
                      <span className="text-[12px] font-semibold" style={{ color: TEXT }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 border-b" style={{ borderColor: BORDER, backgroundColor: BG }}>
                  <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>Analyst Notes</p>
                </div>
                <div className="p-4">
                  <textarea
                    rows={5}
                    className="w-full text-[12px] outline-none resize-none bg-transparent"
                    style={{ color: TEXT }}
                    defaultValue="Confirmed ransomware. Pattern matches LockBit 3.0 IOCs. No exfiltration evidence yet — network capture ongoing."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mt-6 pt-5 border-t" style={{ borderColor: BORDER }}>
            <button className="text-[13px] hover:opacity-70 transition-opacity cursor-pointer font-medium" style={{ color: RED }}>Discard</button>
            <button
              onClick={() => setStep(2)}
              className="h-10 px-6 rounded-[10px] text-[13px] font-semibold text-white flex items-center gap-2 cursor-pointer"
              style={{ backgroundColor: P }}
            >
              Publish to Blockchain <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* Stage 2 */}
      {step === 2 && (
        <div className="flex justify-center">
          <div className="w-full max-w-[560px] bg-white border rounded-2xl p-7 shadow-sm" style={{ borderColor: BORDER }}>
            <h2 className="text-[18px] font-bold mb-1" style={{ color: TEXT }}>{"You're about to publish this CTI report."}</h2>
            <p className="text-[13px] mb-5" style={{ color: MUTED }}>This action is permanent and cannot be reversed.</p>

            <div className="p-4 rounded-[10px] border mb-5" style={{ borderColor: BORDER, backgroundColor: BG }}>
              <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>What will be published on-chain</p>
              {[
                ["Report hash (SHA-256)", "3f2a1b4c5d6e7f8a..."],
                ["Attack type", "Ransomware"],
                ["Timestamp", "2024-01-15 14:23:07 UTC"],
                ["Author org hash", "Anonymized"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5">
                  <span className="text-[12px]" style={{ color: MUTED }}>{k}</span>
                  <span className="text-[12px] font-semibold" style={{ color: TEXT, fontFamily: "var(--font-mono, monospace)" }}>{v}</span>
                </div>
              ))}
              <div className="mt-3 flex items-center gap-1.5 text-[11px]" style={{ color: GREEN }}>
                <Lock className="w-3 h-3" /> No sensitive files included
              </div>
            </div>

            <div className="flex flex-col gap-2 mb-6">
              <p className="text-[12px] font-semibold" style={{ color: MUTED }}>Visibility</p>
              <div className="flex gap-2">
                {(["org", "network"] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setVisibility(v)}
                    className="flex-1 py-2.5 rounded-lg text-[13px] font-medium border transition-colors cursor-pointer"
                    style={{
                      borderColor: visibility === v ? P : BORDER,
                      backgroundColor: visibility === v ? "rgba(23,49,62,0.07)" : "white",
                      color: visibility === v ? P : MUTED,
                    }}
                  >
                    {v === "org" ? "Organization Only" : "Network-wide"}
                  </button>
                ))}
              </div>
            </div>

            {publishing
              ? (
                <div className="flex flex-col items-center py-5 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: STORM }} />
                  <p className="text-[13px]" style={{ color: MUTED }}>Publishing to Polygon...</p>
                  <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: BORDER }}>
                    <div className="h-1 rounded-full w-2/3 animate-pulse" style={{ backgroundColor: STORM }} />
                  </div>
                </div>
              )
              : (
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 h-10 rounded-[10px] text-[13px] font-medium border hover:bg-gray-50 transition-colors cursor-pointer"
                    style={{ borderColor: BORDER, color: TEXT }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={doPublish}
                    className="flex-1 h-10 rounded-[10px] text-[13px] font-semibold text-white cursor-pointer"
                    style={{ backgroundColor: P }}
                  >
                    Confirm & Publish
                  </button>
                </div>
              )
            }
          </div>
        </div>
      )}

      {/* Stage 3 */}
      {step === 3 && (
        <div className="flex flex-col items-center gap-5">
          <div className="w-full px-5 py-3 rounded-xl flex items-center gap-2 text-[13px] font-medium"
            style={{ backgroundColor: "rgba(22,163,74,0.08)", color: GREEN }}>
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            CTI published successfully. Transaction confirmed on Polygon.
          </div>
          <div className="w-full max-w-[560px] bg-white border rounded-2xl p-7 shadow-sm" style={{ borderColor: BORDER }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-bold" style={{ color: TEXT }}>Blockchain Verification</h2>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                style={{ backgroundColor: "rgba(22,163,74,0.1)", color: GREEN }}>
                <Check className="w-3.5 h-3.5" /> Verified
              </span>
            </div>
            {[
              ["Transaction Hash", "0x4a7b9c2f1d8e3a6b5c0f2e1d..."],
              ["Block Number", "47,291,834"],
              ["Timestamp", "2024-01-15 14:31:22 UTC"],
              ["Network", "Polygon Mainnet"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2.5 border-b" style={{ borderColor: BORDER }}>
                <span className="text-[12px]" style={{ color: MUTED }}>{k}</span>
                <span className="text-[12px]" style={{ color: TEXT, fontFamily: "var(--font-mono, monospace)" }}>{v}</span>
              </div>
            ))}
            <div className="mt-5 flex items-center justify-between">
              <button className="text-[13px] hover:opacity-70 cursor-pointer font-medium" style={{ color: MUTED }} onClick={() => setStep(1)}>
                Publish another report
              </button>
              <button className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-medium border hover:bg-gray-50 transition-colors cursor-pointer"
                style={{ borderColor: BORDER, color: TEXT }}>
                <ExternalLink className="w-3.5 h-3.5" /> Open in Block Explorer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CTICenterPage() {
  return (
    <Layout>
      <CTICenterContent />
    </Layout>
  )
}
