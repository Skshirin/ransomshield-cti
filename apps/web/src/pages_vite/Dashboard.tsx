import { Monitor, AlertTriangle, Globe, WifiOff, ChevronRight, ExternalLink } from 'lucide-react'
import { useApp } from '@/lib/context'
import { KPICard, SeverityBadge, DetectionStatusBadge, EndpointStatusBadge, Card } from '@/components/ui'

function fmt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-50 animate-pulse">
      <div className="flex-1 space-y-1.5">
        <div className="flex gap-2">
          <div className="h-4 w-14 bg-slate-100 rounded-full" />
          <div className="h-4 w-24 bg-slate-100 rounded" />
        </div>
        <div className="h-3 w-3/4 bg-slate-100 rounded" />
      </div>
      <div className="flex-shrink-0 flex items-center gap-3">
        <div className="h-6 w-8 bg-slate-100 rounded" />
        <div className="h-5 w-16 bg-slate-100 rounded-full" />
      </div>
    </div>
  )
}

function SkeletonKPI() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 animate-pulse">
      <div className="h-3 w-24 bg-slate-100 rounded mb-3" />
      <div className="h-8 w-16 bg-slate-100 rounded mb-1" />
      <div className="h-3 w-20 bg-slate-100 rounded" />
    </div>
  )
}

export default function DashboardPage() {
  const { endpoints, detections, ctiReports, navigate, endpointsLoading, detectionsLoading, ctiLoading } = useApp()

  const isLoading = endpointsLoading || detectionsLoading || ctiLoading

  const totalEndpoints = endpoints.length
  const activeDetections = detections.filter(d => d.status === 'NEW' || d.status === 'INVESTIGATING').length
  const publishedCTI = ctiReports.filter(r => r.status === 'PUBLISHED').length
  const offlineEndpoints = endpoints.filter(e => e.status === 'OFFLINE').length

  const recentDetections = [...detections]
    .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
    .slice(0, 6)

  const publishedReports = ctiReports
    .filter(r => r.status === 'PUBLISHED')
    .sort((a, b) => new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime())
    .slice(0, 3)

  return (
    <div className="p-6 space-y-6">
      {/* KPI cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => <SkeletonKPI key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Total Endpoints"
            value={totalEndpoints}
            sub={`${endpoints.filter(e => e.status === 'ONLINE').length} online`}
            accentIndex={0}
            icon={<Monitor size={28} />}
          />
          <KPICard
            label="Active Detections"
            value={activeDetections}
            sub={`${detections.filter(d => d.status === 'NEW').length} new`}
            accentIndex={1}
            icon={<AlertTriangle size={28} />}
          />
          <KPICard
            label="CTI Published"
            value={publishedCTI}
            sub="to blockchain"
            accentIndex={2}
            icon={<Globe size={28} />}
          />
          <KPICard
            label="Endpoints Offline"
            value={offlineEndpoints}
            sub="require attention"
            accentIndex={3}
            icon={<WifiOff size={28} />}
          />
        </div>
      )}

      {/* Main 2-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Left: Recent Detections */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <h2 className="text-sm font-semibold text-navy-900">Recent Detections</h2>
              <button
                onClick={() => navigate('detections')}
                className="text-xs text-navy-600 hover:text-navy-900 font-medium flex items-center gap-1 transition-colors"
              >
                View all <ChevronRight size={13} />
              </button>
            </div>

            {detectionsLoading ? (
              <div>{[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}</div>
            ) : recentDetections.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-slate-500 font-medium">No detections yet</p>
                <p className="text-xs text-slate-400 mt-1">Your endpoints are all clear</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentDetections.map(det => (
                  <button
                    key={det._id}
                    onClick={() => navigate('detection-detail', { id: det._id })}
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/70 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <SeverityBadge severity={det.severity} />
                        <span className="text-xs font-mono text-slate-500 truncate">{det.endpointName}</span>
                      </div>
                      <p className="text-xs text-slate-600 truncate">{det.indicators[0]?.type ?? '—'}: {det.indicators[0]?.description.slice(0, 70)}…</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-3">
                      <span className="text-2xl font-bold font-mono text-slate-800">{det.riskScore}</span>
                      <DetectionStatusBadge status={det.status} />
                      <p className="text-[10px] text-slate-400 hidden xl:block">{fmt(det.detectedAt)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Recently Published Intelligence */}
          <Card>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <h2 className="text-sm font-semibold text-navy-900">Recently Published Intelligence</h2>
              <button
                onClick={() => navigate('cti-center')}
                className="text-xs text-navy-600 hover:text-navy-900 font-medium flex items-center gap-1 transition-colors"
              >
                CTI Center <ChevronRight size={13} />
              </button>
            </div>
            {ctiLoading ? (
              <div className="p-5 space-y-4 animate-pulse">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-full bg-slate-100 rounded" />
                    <div className="h-3 w-3/4 bg-slate-100 rounded" />
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            ) : publishedReports.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-slate-500">No published reports yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {publishedReports.map(r => (
                  <div key={r._id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800 line-clamp-2 leading-relaxed">{r.attackSummary}</p>
                        <p className="text-[11px] text-slate-400 mt-1.5">{fmtDate(r.publishedAt!)}</p>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                          Blockchain verified
                        </span>
                        {r.transactionHash && (
                          <a
                            href={`https://amoy.polygonscan.com/tx/${r.transactionHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-mono text-blue-500 hover:text-blue-700 flex items-center gap-1"
                            onClick={e => e.stopPropagation()}
                          >
                            {r.transactionHash.slice(0, 12)}… <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right: Endpoint Status */}
        <div>
          <Card className="sticky top-4">
            <div className="px-5 py-4 border-b border-slate-50">
              <h2 className="text-sm font-semibold text-navy-900">Endpoint Status</h2>
            </div>
            {endpointsLoading ? (
              <div className="p-4 space-y-3 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="h-3 w-32 bg-slate-100 rounded" />
                    <div className="h-5 w-14 bg-slate-100 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {endpoints.map(ep => (
                  <button
                    key={ep._id}
                    onClick={() => navigate('endpoint-detail', { id: ep._id })}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50/70 transition-colors text-left"
                  >
                    <span className="text-sm text-slate-700 font-medium font-mono text-xs truncate flex-1">{ep.name}</span>
                    <EndpointStatusBadge status={ep.status} />
                  </button>
                ))}
              </div>
            )}
            <div className="px-5 py-3 border-t border-slate-50">
              <button
                onClick={() => navigate('endpoints')}
                className="text-xs text-navy-600 hover:text-navy-900 font-medium flex items-center gap-1 transition-colors"
              >
                Manage endpoints <ChevronRight size={13} />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
