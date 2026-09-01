'use client'

import Layout from '@/components/Layout'
import { Globe } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  STORM, LAV, TEXT, MUTED, BORDER, RED, GREEN,
  lineData, pieData, riskData, DETECTIONS, CTI_FEED,
  StatusBadge, ScoreBadge,
} from '@/components/ui'

function DashboardContent() {
  return (
    <div className="p-6 flex flex-col gap-7">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        {([
          { label: "ENDPOINTS ONLINE", value: "48 / 50", sub: "2 offline", dot: GREEN },
          { label: "ACTIVE DETECTIONS", value: "7", sub: "Requires review", dot: RED, alert: true },
          { label: "CTI PUBLISHED", value: "14", sub: "Reports on-chain", accent: LAV },
          { label: "CTI RECEIVED", value: "31", sub: "From network feed" },
        ] as const).map((c, i) => (
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
              <YAxis tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={false} />
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
              <Pie data={pieData} cx={44} cy={44} innerRadius={28} outerRadius={44} dataKey="value" strokeWidth={0}>
                {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
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
                  <div className="h-1.5 rounded-full" style={{ width: `${(r.count / 49) * 100}%`, backgroundColor: r.color }} />
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
              {DETECTIONS.slice(0, 4).map((d) => (
                <tr key={d.id} className="border-b hover:bg-[#F8FAFC] transition-colors" style={{ borderColor: BORDER }}>
                  <td className="px-4 py-3 text-[12px] font-medium" style={{ color: TEXT }}>{d.endpoint}</td>
                  <td className="px-4 py-3 text-[11px] font-mono" style={{ color: MUTED, fontFamily: "var(--font-mono, monospace)" }}>{d.time.split(" ")[1]}</td>
                  <td className="px-4 py-3"><ScoreBadge score={d.score} /></td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CTI Activity */}
        <div className="bg-white border rounded-[10px] shadow-sm overflow-hidden" style={{ borderColor: BORDER }}>
          <div className="px-5 py-3.5 border-b" style={{ borderColor: BORDER }}>
            <p className="text-[13px] font-semibold" style={{ color: TEXT }}>Recent CTI Activity</p>
          </div>
          {CTI_FEED.map((c) => (
            <div key={c.id} className="flex items-start gap-3 px-5 py-3.5 border-b hover:bg-[#F8FAFC] transition-colors" style={{ borderColor: BORDER }}>
              <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: "rgba(197,176,205,0.15)" }}>
                <Globe className="w-3.5 h-3.5" style={{ color: LAV }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-semibold" style={{ color: TEXT }}>{c.type}</p>
                  {c.verified && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: "rgba(22,163,74,0.1)", color: GREEN }}>Verified</span>
                  )}
                </div>
                <p className="text-[11px] truncate" style={{ color: MUTED }}>{c.org} · {c.time}</p>
              </div>
            </div>
          ))}
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
