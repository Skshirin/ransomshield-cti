'use client'

import { useMemo } from 'react'
import Layout from '@/components/Layout'
import { Globe, ShieldCheck } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  STORM, LAV, TEXT, MUTED, BORDER, RED, AMBER, GREEN,
  StatusBadge, ScoreBadge,
} from '@/components/ui'
import { useApp } from '@/lib/context'

function DashboardContent() {
  const { endpoints, detections, ctiReports, globalFeed } = useApp()

  // ── 1. Endpoint status metrics ───────────────────────────────────────────────
  const totalEndpoints = endpoints.length
  const onlineCount = endpoints.filter(e => e.status === 'ONLINE').length
  const offlineCount = endpoints.filter(e => e.status === 'OFFLINE' || e.status === 'PENDING').length
  const atRiskCount = endpoints.filter(e => e.status === 'AT_RISK').length
  const isolatedCount = endpoints.filter(e => e.status === 'ISOLATED').length

  // ── 2. Detection metrics ─────────────────────────────────────────────────────
  const activeDetections = detections.filter(
    d => d.status === 'NEW' || d.status === 'INVESTIGATING'
  ).length

  // ── 3. CTI metrics ───────────────────────────────────────────────────────────
  const ctiPublished = ctiReports.filter(r => r.status === 'PUBLISHED').length
  const ctiReceived = globalFeed.length

  // ── 4. 30-day detection timeline ─────────────────────────────────────────────
  const lineData = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (29 - i))
      d.setHours(0, 0, 0, 0)
      return {
        d: i + 1,
        dateStr: d.toISOString().slice(0, 10),
        v: 0,
      }
    })

    detections.forEach(det => {
      if (!det.detectedAt) return
      const detDateStr = new Date(det.detectedAt).toISOString().slice(0, 10)
      const match = days.find(day => day.dateStr === detDateStr)
      if (match) {
        match.v += 1
      }
    })

    return days
  }, [detections])

  // ── 5. Donut chart datasets ──────────────────────────────────────────────────
  const pieData = useMemo(() => [
    { name: "Online", value: onlineCount, color: GREEN },
    { name: "Offline", value: offlineCount, color: MUTED },
    { name: "At Risk", value: atRiskCount, color: AMBER },
    ...(isolatedCount > 0 ? [{ name: "Isolated", value: isolatedCount, color: "#9333EA" }] : []),
  ], [onlineCount, offlineCount, atRiskCount, isolatedCount])

  const hasEndpoints = totalEndpoints > 0
  const renderedPieData = hasEndpoints
    ? pieData
    : [{ name: "No Endpoints", value: 1, color: BORDER }]

  // ── 6. Risk distribution breakdown ───────────────────────────────────────────
  const riskData = useMemo(() => {
    let low = 0, med = 0, high = 0, crit = 0

    detections.forEach(d => {
      const score = d.riskScore ?? 0
      const sev = (d.severity || '').toUpperCase()
      if (score >= 85 || sev === 'CRITICAL') crit++
      else if (score >= 70 || sev === 'HIGH') high++
      else if (score >= 40 || sev === 'MEDIUM') med++
      else low++
    })

    const total = low + med + high + crit || 1

    return [
      { label: "Low", count: low, color: GREEN, pct: totalEndpoints > 0 ? (low / total) * 100 : 0 },
      { label: "Medium", count: med, color: AMBER, pct: totalEndpoints > 0 ? (med / total) * 100 : 0 },
      { label: "High", count: high, color: "#F97316", pct: totalEndpoints > 0 ? (high / total) * 100 : 0 },
      { label: "Critical", count: crit, color: RED, pct: totalEndpoints > 0 ? (crit / total) * 100 : 0 },
    ]
  }, [detections, totalEndpoints])

  // ── 7. Recent lists ──────────────────────────────────────────────────────────
  const recentDetections = detections.slice(0, 4)
  const recentCTI = (globalFeed.length > 0 ? globalFeed : ctiReports).slice(0, 4)

  return (
    <div className="p-6 flex flex-col gap-7">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: "ENDPOINTS ONLINE",
            value: `${onlineCount} / ${totalEndpoints}`,
            sub: `${offlineCount} offline${isolatedCount > 0 ? `, ${isolatedCount} isolated` : ''}`,
            dot: onlineCount > 0 ? GREEN : MUTED,
          },
          {
            label: "ACTIVE DETECTIONS",
            value: `${activeDetections}`,
            sub: activeDetections > 0 ? "Requires review" : "No active threats",
            dot: RED,
            alert: activeDetections > 0,
          },
          {
            label: "CTI PUBLISHED",
            value: `${ctiPublished}`,
            sub: "Reports on-chain",
            accent: LAV,
          },
          {
            label: "CTI RECEIVED",
            value: `${ctiReceived}`,
            sub: "From network feed",
          },
        ].map((c, i) => (
          <div key={i} className="bg-white border rounded-[10px] p-5 shadow-sm" style={{ borderColor: BORDER }}>
            <p className="text-[10px] font-bold tracking-[0.1em] mb-3 uppercase" style={{ color: MUTED }}>{c.label}</p>
            <div className="flex items-center gap-2">
              <span className="text-[28px] font-bold leading-none" style={{ color: "alert" in c && c.alert ? RED : TEXT }}>
                {c.value}
              </span>
              {"dot" in c && c.dot && (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: c.dot,
                    boxShadow: "alert" in c && c.alert ? `0 0 0 4px rgba(220,38,38,0.15)` : "none",
                  }}
                />
              )}
              {"accent" in c && c.accent && (
                <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: "rgba(197,176,205,0.15)" }}>
                  <Globe className="w-3 h-3" style={{ color: LAV }} />
                </div>
              )}
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: MUTED }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Line chart */}
        <div className="col-span-2 bg-white border rounded-[10px] p-5 shadow-sm" style={{ borderColor: BORDER }}>
          <p className="text-[13px] font-semibold mb-4" style={{ color: TEXT }}>Detections — Last 30 Days</p>
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={lineData} margin={{ top: 5, right: 8, bottom: 0, left: -24 }}>
              <defs>
                <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={STORM} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={STORM} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
              <XAxis dataKey="d" tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${BORDER}`, color: TEXT }}
                itemStyle={{ color: STORM }}
              />
              <Line
                type="monotone"
                dataKey="v"
                stroke={STORM}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: STORM }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Donut */}
        <div className="bg-white border rounded-[10px] p-5 shadow-sm" style={{ borderColor: BORDER }}>
          <p className="text-[13px] font-semibold mb-4" style={{ color: TEXT }}>Endpoint Status</p>
          <div className="flex items-center gap-3">
            <PieChart width={96} height={96}>
              <Pie data={renderedPieData} cx={44} cy={44} innerRadius={28} outerRadius={44} dataKey="value" strokeWidth={0}>
                {renderedPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
            <div className="flex flex-col gap-2.5">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-[12px]" style={{ color: MUTED }}>{d.name}</span>
                  <span className="text-[12px] font-bold ml-auto pl-3" style={{ color: TEXT }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Risk bars */}
          <div className="mt-5 pt-4 border-t" style={{ borderColor: BORDER }}>
            <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Risk Distribution</p>
            {riskData.map((r) => (
              <div key={r.label} className="flex items-center gap-2 mb-2">
                <span className="text-[11px] w-14" style={{ color: MUTED }}>{r.label}</span>
                <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: BORDER }}>
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${r.pct}%`, backgroundColor: r.color }} />
                </div>
                <span className="text-[11px] font-semibold w-5 text-right" style={{ color: TEXT }}>{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recent Detections */}
        <div className="bg-white border rounded-[10px] shadow-sm overflow-hidden" style={{ borderColor: BORDER }}>
          <div className="px-5 py-3.5 border-b" style={{ borderColor: BORDER }}>
            <p className="text-[13px] font-semibold" style={{ color: TEXT }}>Recent Detections</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: BORDER }}>
                {["Endpoint", "Time", "Score", "Status"].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentDetections.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[12px]" style={{ color: MUTED }}>
                    <div className="flex flex-col items-center gap-1.5">
                      <ShieldCheck className="w-5 h-5" style={{ color: GREEN }} />
                      <span>No active or recent detections. All systems clear.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                recentDetections.map((d) => {
                  const timeFormatted = d.detectedAt
                    ? new Date(d.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : 'Just now'
                  return (
                    <tr key={d._id} className="border-b hover:bg-[#F8FAFC] transition-colors" style={{ borderColor: BORDER }}>
                      <td className="px-4 py-3 text-[12px] font-medium" style={{ color: TEXT }}>{d.endpointName || 'Unknown'}</td>
                      <td className="px-4 py-3 text-[11px] font-mono" style={{ color: MUTED, fontFamily: "var(--font-mono, monospace)" }}>
                        {timeFormatted}
                      </td>
                      <td className="px-4 py-3"><ScoreBadge score={d.riskScore ?? 0} /></td>
                      <td className="px-4 py-3"><StatusBadge status={d.status || 'New'} /></td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* CTI Activity */}
        <div className="bg-white border rounded-[10px] shadow-sm overflow-hidden" style={{ borderColor: BORDER }}>
          <div className="px-5 py-3.5 border-b" style={{ borderColor: BORDER }}>
            <p className="text-[13px] font-semibold" style={{ color: TEXT }}>Recent CTI Activity</p>
          </div>
          {recentCTI.length === 0 ? (
            <div className="px-5 py-8 text-center text-[12px]" style={{ color: MUTED }}>
              <div className="flex flex-col items-center gap-1.5">
                <Globe className="w-5 h-5" style={{ color: MUTED }} />
                <span>No CTI reports published or received yet.</span>
              </div>
            </div>
          ) : (
            recentCTI.map((c) => {
              const timeFormatted = c.publishedAt || c.createdAt
                ? new Date(c.publishedAt || c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
                : 'Recent'
              const summaryPreview = c.attackSummary || 'Automated Threat Intelligence Report'
              const threatType = summaryPreview.toLowerCase().includes('ransomware') ? 'Ransomware' : 'Threat Intelligence'

              return (
                <div key={c._id} className="flex items-start gap-3 px-5 py-3.5 border-b hover:bg-[#F8FAFC] transition-colors" style={{ borderColor: BORDER }}>
                  <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: "rgba(197,176,205,0.15)" }}>
                    <Globe className="w-3.5 h-3.5" style={{ color: LAV }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-semibold" style={{ color: TEXT }}>{threatType}</p>
                      {c.verificationStatus === 'VERIFIED' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={{ backgroundColor: "rgba(22,163,74,0.1)", color: GREEN }}>Verified</span>
                      )}
                    </div>
                    <p className="text-[11px] truncate" style={{ color: MUTED }}>{summaryPreview} · {timeFormatted}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Layout>
      <DashboardContent />
    </Layout>
  )
}
