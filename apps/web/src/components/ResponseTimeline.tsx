'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  CheckSquare,
  Activity,
  Server,
  Cpu,
  User,
  Zap,
  Clock,
  Radio,
  AlertOctagon,
  FileText,
  Loader2,
} from 'lucide-react'
import { P, STORM, BG, TEXT, MUTED, BORDER, RED, AMBER, GREEN } from './ui'
import { getSocket } from '@/lib/socket'
import { apiGet } from '@/lib/api'
import type { TimelineEvent, TimelineEventType, TimelineActorType } from '@/lib/types'

function formatTimestamp(isoString: string) {
  const d = new Date(isoString)
  return {
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    date: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
  }
}

function getEventIcon(type: TimelineEventType) {
  switch (type) {
    case 'DETECTION_CREATED':
      return <AlertTriangle className="w-4 h-4 text-red-600" />
    case 'DETECTION_RESOLVED':
      return <CheckCircle2 className="w-4 h-4 text-emerald-600" />
    case 'DETECTION_FALSE_POSITIVE':
      return <XCircle className="w-4 h-4 text-slate-500" />
    case 'ISOLATION_REQUESTED':
      return <ShieldAlert className="w-4 h-4 text-purple-700" />
    case 'ISOLATION_SENT':
      return <Send className="w-4 h-4 text-blue-600" />
    case 'ISOLATION_ACKNOWLEDGED':
      return <CheckSquare className="w-4 h-4 text-indigo-600" />
    case 'ISOLATION_COMPLETED':
      return <ShieldCheck className="w-4 h-4 text-purple-700" />
    case 'ISOLATION_FAILED':
      return <AlertOctagon className="w-4 h-4 text-red-600" />
    case 'UNISOLATION_REQUESTED':
      return <ShieldCheck className="w-4 h-4 text-green-700" />
    case 'UNISOLATION_SENT':
      return <Send className="w-4 h-4 text-blue-600" />
    case 'UNISOLATION_ACKNOWLEDGED':
      return <CheckSquare className="w-4 h-4 text-green-600" />
    case 'ENDPOINT_STATUS_CHANGED':
      return <Activity className="w-4 h-4 text-slate-700" />
    case 'POLICY_TRIGGERED':
      return <Zap className="w-4 h-4 text-amber-600" />
    default:
      return <Clock className="w-4 h-4 text-slate-500" />
  }
}

function getEventBadgeColor(type: TimelineEventType) {
  switch (type) {
    case 'DETECTION_CREATED':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'DETECTION_RESOLVED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'DETECTION_FALSE_POSITIVE':
      return 'bg-slate-50 text-slate-600 border-slate-200'
    case 'ISOLATION_REQUESTED':
    case 'ISOLATION_COMPLETED':
      return 'bg-purple-50 text-purple-700 border-purple-200'
    case 'ISOLATION_SENT':
    case 'UNISOLATION_SENT':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'ISOLATION_ACKNOWLEDGED':
    case 'UNISOLATION_ACKNOWLEDGED':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    case 'ISOLATION_FAILED':
    case 'UNISOLATION_FAILED':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'UNISOLATION_REQUESTED':
      return 'bg-green-50 text-green-700 border-green-200'
    case 'ENDPOINT_STATUS_CHANGED':
      return 'bg-slate-100 text-slate-700 border-slate-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

function ActorBadge({ type, name }: { type: TimelineActorType; name?: string }) {
  let label = 'System'
  let bgClass = 'bg-slate-100 text-slate-700 border-slate-200'
  let Icon = Server

  if (type === 'AGENT') {
    label = name ? `Agent (${name})` : 'Endpoint Agent'
    bgClass = 'bg-teal-50 text-teal-700 border-teal-200'
    Icon = Cpu
  } else if (type === 'SECURITY_ANALYST' || type === 'USER') {
    label = name || 'Security Analyst'
    bgClass = 'bg-blue-50 text-blue-700 border-blue-200'
    Icon = User
  } else if (type === 'ORG_ADMIN') {
    label = name ? `Admin: ${name}` : 'Org Admin'
    bgClass = 'bg-purple-50 text-purple-700 border-purple-200'
    Icon = User
  } else if (type === 'AUTOMATED_POLICY') {
    label = 'Automated Policy'
    bgClass = 'bg-amber-50 text-amber-700 border-amber-200'
    Icon = Zap
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${bgClass}`}>
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span className="truncate max-w-[140px]">{label}</span>
    </span>
  )
}

interface ResponseTimelineProps {
  endpointId?: string
  detectionId?: string
  title?: string
  limit?: number
  showHeader?: boolean
}

export function ResponseTimeline({
  endpointId,
  detectionId,
  title = "Response Action Timeline",
  limit = 50,
  showHeader = true,
}: ResponseTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTimeline = useCallback(async () => {
    if (!endpointId && !detectionId) {
      setEvents([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      let url = ''
      if (endpointId) {
        url = `/endpoints/${endpointId}/timeline?limit=${limit}&sort=asc`
        if (detectionId) url += `&detectionId=${detectionId}`
      } else if (detectionId) {
        url = `/detections/${detectionId}/timeline?limit=${limit}&sort=asc`
      }

      const data = await apiGet<{ events: TimelineEvent[] }>(url)
      setEvents(data.events || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load timeline events')
    } finally {
      setLoading(false)
    }
  }, [endpointId, detectionId, limit])

  useEffect(() => {
    loadTimeline()
  }, [loadTimeline])

  // Real-time Socket.IO synchronization
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleNewEvent = (event: TimelineEvent) => {
      // Check if this event belongs to current endpoint or detection
      const matchesEndpoint = endpointId && event.endpointId === endpointId
      const matchesDetection = detectionId && (event.detectionId === detectionId || event.endpointId === endpointId)

      if (matchesEndpoint || matchesDetection) {
        setEvents(prev => {
          if (prev.some(e => e._id === event._id)) return prev
          return [...prev, event]
        })
      }
    }

    socket.on('timeline:event', handleNewEvent)
    return () => {
      socket.off('timeline:event', handleNewEvent)
    }
  }, [endpointId, detectionId])

  return (
    <div className="flex flex-col">
      {showHeader && (
        <div className="flex items-center justify-between pb-3 mb-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-bold text-navy-900 tracking-wide uppercase" style={{ color: TEXT }}>
              {title}
            </h3>
            {events.length > 0 && (
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {events.length} event{events.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Audit Trail</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          <span className="text-[12px]">Loading response timeline...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-[13px]">
          {error}
        </div>
      ) : events.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center text-center p-4">
          <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-2.5">
            <Clock className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-[13px] font-medium text-slate-700">No response activity yet</p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-[260px]">
            Timeline events will appear automatically as telemetry, detections, and isolation actions occur.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
          {events.map((ev, index) => {
            const { time, date } = formatTimestamp(ev.timestamp)
            const badgeClass = getEventBadgeColor(ev.eventType)

            return (
              <div key={ev._id || index} className="relative group">
                {/* Node dot on timeline track */}
                <div className="absolute -left-6 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center shadow-xs z-10 group-hover:border-slate-500 transition-colors">
                  {getEventIcon(ev.eventType)}
                </div>

                {/* Event Card */}
                <div
                  className="rounded-xl border p-3.5 bg-white shadow-2xs hover:shadow-xs transition-shadow"
                  style={{ borderColor: BORDER }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badgeClass}`}>
                        {ev.eventType.replace(/_/g, ' ')}
                      </span>
                      <ActorBadge type={ev.actorType} name={ev.actorName} />
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{time}</span>
                      <span className="text-slate-300">·</span>
                      <span>{date}</span>
                    </div>
                  </div>

                  <p className="text-[13px] font-medium text-slate-800 leading-snug">
                    {ev.message}
                  </p>

                  {/* Metadata display if available */}
                  {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-50 flex flex-wrap gap-2 text-[11px]">
                      {Boolean(ev.metadata.from && ev.metadata.to) && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-600">
                          {String(ev.metadata.from)} → {String(ev.metadata.to)}
                        </span>
                      )}
                      {ev.metadata.riskScore !== undefined && (
                        <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-mono font-semibold">
                          Score: {String(ev.metadata.riskScore)}/100
                        </span>
                      )}
                      {Boolean(ev.metadata.reason) && (
                        <span className="text-slate-500 italic">
                          "{String(ev.metadata.reason)}"
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
