'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Clock, Globe, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { useApp } from '@/lib/context'
import { SeverityBadge, DetectionStatusBadge, Button, ConfirmModal, Card } from '@/components/ui'
import { apiGet } from '@/lib/api'
import type { Detection } from '@/lib/types'

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

const indicatorTypeColors: Record<string, string> = {
  FILE_ACTIVITY: 'bg-purple-50 text-purple-700 border-purple-200',
  PROCESS: 'bg-blue-50 text-blue-700 border-blue-200',
  NETWORK: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  REGISTRY: 'bg-orange-50 text-orange-700 border-orange-200',
  SIGNATURE: 'bg-red-50 text-red-700 border-red-200',
}

function SkeletonDetail() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      <div className="h-4 w-28 bg-slate-100 rounded" />
      <div className="flex flex-wrap justify-between gap-4">
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="h-5 w-16 bg-slate-100 rounded-full" />
            <div className="h-5 w-20 bg-slate-100 rounded-full" />
          </div>
          <div className="h-6 w-48 bg-slate-100 rounded" />
          <div className="h-3 w-40 bg-slate-100 rounded" />
        </div>
        <div className="h-12 w-16 bg-slate-100 rounded" />
      </div>
      <div className="rounded-2xl border border-slate-100 p-5 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex gap-2">
              <div className="h-4 w-20 bg-slate-100 rounded" />
              <div className="h-4 w-28 bg-slate-100 rounded" />
            </div>
            <div className="h-3 w-full bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DetectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const id = resolvedParams.id
  const router = useRouter()
  const { detections, ctiReports, resolveDetection, generateCTI, navigate, pageParams } = useApp()
  const detId = id || pageParams.id

  const fromList = detections.find(d => d._id === detId) ?? null
  const [detection, setDetection] = useState<Detection | null>(fromList)
  const [loading, setLoading] = useState(!fromList)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [confirmResolve, setConfirmResolve] = useState<'RESOLVED' | 'FALSE_POSITIVE' | null>(null)
  const [resolving, setResolving] = useState(false)
  const [generatingCTI, setGeneratingCTI] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (fromList) {
      setDetection(fromList)
      return
    }
    setLoading(true)
    apiGet<{ detection: Detection }>(`/detections/${detId}`)
      .then(data => {
        setDetection(data.detection)
        setLoading(false)
      })
      .catch(err => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load detection')
        setLoading(false)
      })
  }, [detId, fromList])

  useEffect(() => {
    if (fromList) setDetection(fromList)
  }, [fromList])

  const goBack = () => {
    navigate('detections')
    router.push('/detections')
  }

  if (loading) return <SkeletonDetail />

  if (loadError || !detection) {
    return (
      <div className="p-6">
        <button onClick={goBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-900 mb-4 cursor-pointer">
          <ChevronLeft size={16} /> Back to Detections
        </button>
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{loadError ?? 'Detection not found.'}</span>
        </div>
      </div>
    )
  }

  const existingCTI = ctiReports.find(r => r.detectionId === detection._id)
  const isActive = detection.status === 'NEW' || detection.status === 'INVESTIGATING'
  const riskColor = detection.riskScore >= 85 ? 'text-red-600' : detection.riskScore >= 65 ? 'text-orange-500' : detection.riskScore >= 40 ? 'text-yellow-600' : 'text-slate-600'

  const handleResolve = async () => {
    if (!confirmResolve) return
    setResolving(true)
    setActionError(null)
    try {
      await resolveDetection(detection._id, confirmResolve)
      setConfirmResolve(null)
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to resolve detection')
    } finally {
      setResolving(false)
    }
  }

  const handleGenerateCTI = async () => {
    setGeneratingCTI(true)
    setActionError(null)
    try {
      const report = await generateCTI(detection._id)
      navigate('cti-draft-editor', { id: report._id })
      router.push(`/cti-draft-editor?id=${report._id}`)
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to generate CTI report')
    } finally {
      setGeneratingCTI(false)
    }
  }

  return (
    <div className="p-6 space-y-5">
      <button
        onClick={goBack}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-900 transition-colors cursor-pointer"
      >
        <ChevronLeft size={16} /> Back to Detections
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <SeverityBadge severity={detection.severity} />
            <DetectionStatusBadge status={detection.status} />
          </div>
          <h2 className="text-xl font-bold text-navy-900 font-mono mt-1">{detection.endpointName}</h2>
          <p className="text-sm text-slate-500 mt-0.5">Detected {fmt(detection.detectedAt)}</p>
        </div>
        <div className="text-center">
          <p className={`text-5xl font-bold font-mono ${riskColor}`}>{detection.riskScore}</p>
          <p className="text-xs text-slate-500 mt-1">Risk Score</p>
        </div>
      </div>

      {/* Indicators */}
      <Card>
        <div className="px-5 py-4 border-b border-slate-50">
          <h3 className="text-sm font-semibold text-navy-900">Indicators of Compromise</h3>
          <p className="text-xs text-slate-500 mt-0.5">{detection.indicators.length} indicator{detection.indicators.length !== 1 ? 's' : ''} observed</p>
        </div>
        <div className="divide-y divide-slate-50">
          {detection.indicators.map((ind, i) => (
            <div key={i} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${indicatorTypeColors[ind.type] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  {ind.type}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                  <Clock size={10} />
                  {fmt(ind.observedAt)}
                </div>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{ind.description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-navy-900 mb-4">Actions</h3>
        {actionError && (
          <div className="flex items-center gap-2 mb-3 p-3 bg-red-50 border border-red-100 rounded-lg">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{actionError}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          {!existingCTI ? (
            <Button onClick={handleGenerateCTI} loading={generatingCTI} disabled={!isActive && !existingCTI}>
              <Globe size={15} />
              {generatingCTI ? 'Generating…' : 'Generate CTI Report'}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => {
                navigate('cti-draft-editor', { id: existingCTI._id })
                router.push(`/cti-draft-editor?id=${existingCTI._id}`)
              }}>
                <Globe size={15} />
                {existingCTI.status === 'DRAFT' ? 'Edit CTI Draft' : 'View CTI Report'}
              </Button>
              <span className="text-xs text-emerald-600 font-medium">CTI report exists</span>
            </div>
          )}

          {isActive && (
            <>
              <Button
                variant="secondary"
                onClick={() => setConfirmResolve('RESOLVED')}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
              >
                <CheckCircle2 size={15} />
                Mark Resolved
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirmResolve('FALSE_POSITIVE')}
                className="border-slate-200 text-slate-600 cursor-pointer"
              >
                <XCircle size={15} />
                Mark False Positive
              </Button>
            </>
          )}
        </div>

        {generatingCTI && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <Loader2 size={12} className="animate-spin" />
            Analyzing detection data and generating CTI draft…
          </div>
        )}
      </Card>

      <ConfirmModal
        open={!!confirmResolve}
        onClose={() => setConfirmResolve(null)}
        onConfirm={handleResolve}
        title={confirmResolve === 'RESOLVED' ? 'Mark as Resolved' : 'Mark as False Positive'}
        message={
          confirmResolve === 'RESOLVED'
            ? 'This will mark the detection as resolved, indicating the threat has been contained and remediated.'
            : 'This will mark the detection as a false positive. Ensure you have verified that no actual threat exists before proceeding.'
        }
        confirmLabel={confirmResolve === 'RESOLVED' ? 'Mark Resolved' : 'Mark False Positive'}
        loading={resolving}
      />
    </div>
  )
}
