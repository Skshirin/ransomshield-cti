'use client'

import { useState, useMemo } from 'react'
import Layout from '@/components/Layout'
import {
  Database,
  Search,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Tag,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  Hash,
  Network,
  HelpCircle,
  ExternalLink,
} from 'lucide-react'
import {
  P,
  STORM,
  TEXT,
  MUTED,
  BORDER,
  RED,
  AMBER,
  GREEN,
  Button,
  EmptyState,
} from '@/components/ui'
import { useApp } from '@/lib/context'
import type { ThreatIntelIOC, CTIMatchResult, IOCType } from '@/lib/types'

const TYPE_ICONS: Record<IOCType, any> = {
  IP: Network,
  DOMAIN: Globe,
  HASH: Hash,
  URL: ExternalLink,
}

export default function ThreatIntelPage() {
  const { threatIntelIocs, threatIntelLoading, lookupIOC } = useApp()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<'ALL' | IOCType>('ALL')

  // Interactive Lookup tool state
  const [lookupInput, setLookupInput] = useState('')
  const [lookupType, setLookupType] = useState<string>('')
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupResult, setLookupResult] = useState<CTIMatchResult | null>(null)
  const [hasQueried, setHasQueried] = useState(false)

  const filteredIOCs = useMemo(() => {
    return threatIntelIocs.filter(ioc => {
      const matchesType = selectedType === 'ALL' || ioc.type === selectedType
      const matchesSearch =
        searchQuery === '' ||
        ioc.indicator.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ioc.threatCategory?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ioc.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesType && matchesSearch
    })
  }, [threatIntelIocs, selectedType, searchQuery])

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lookupInput.trim()) return

    setIsLookingUp(true)
    setHasQueried(true)
    try {
      const res = await lookupIOC(lookupInput.trim(), lookupType || undefined)
      setLookupResult(res)
    } catch {
      setLookupResult({ matched: false, indicator: lookupInput.trim(), type: 'IP' })
    } finally {
      setIsLookingUp(false)
    }
  }

  const handleQuickInspect = (indicator: string, type: IOCType) => {
    setLookupInput(indicator)
    setLookupType(type)
    setIsLookingUp(true)
    setHasQueried(true)
    lookupIOC(indicator, type)
      .then(res => setLookupResult(res))
      .catch(() => setLookupResult({ matched: false, indicator, type }))
      .finally(() => setIsLookingUp(false))
  }

  const maliciousCount = threatIntelIocs.filter(i => i.isMalicious).length
  const totalIOCs = threatIntelIocs.length

  return (
    <Layout>
      <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: P }}>
              <Database className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: TEXT }}>
              Cyber Threat Intelligence (CTI) & IOC Registry
            </h1>
          </div>
          <p className="text-[13px] mt-1" style={{ color: MUTED }}>
            Modular Threat Intelligence provider correlation engine for continuous telemetry hash, IP, domain, and URL verification.
          </p>
        </div>

        {/* Live IOC Lookup Tool Card */}
        <div className="bg-white border rounded-[12px] p-6 shadow-sm space-y-4" style={{ borderColor: BORDER }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: TEXT }}>
              Live Threat Intelligence Query Tool
            </h2>
            <p className="text-xs" style={{ color: MUTED }}>
              Directly interrogate active CTI providers to analyze indicator maliciousness, threat classification, and confidence scoring.
            </p>
          </div>

          <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Enter IP (e.g. 198.51.100.23), domain (e.g. ransom-c2-gateway.darknet), hash, or URL..."
                value={lookupInput}
                onChange={e => setLookupInput(e.target.value)}
                className="w-full px-3.5 py-2.5 border rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-teal-600/30"
                style={{ borderColor: BORDER }}
              />
            </div>

            <select
              value={lookupType}
              onChange={e => setLookupType(e.target.value)}
              className="px-3 py-2.5 border rounded-lg text-xs font-semibold bg-white text-slate-700 outline-none"
              style={{ borderColor: BORDER }}
            >
              <option value="">Auto-Detect Type</option>
              <option value="IP">IP Address</option>
              <option value="DOMAIN">Domain Name</option>
              <option value="HASH">File / Process Hash</option>
              <option value="URL">Network URL</option>
            </select>

            <button
              type="submit"
              disabled={isLookingUp || !lookupInput.trim()}
              className="px-5 py-2.5 rounded-lg text-xs font-bold text-white shadow-sm transition-opacity disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              style={{ backgroundColor: P }}
            >
              <Search className="w-3.5 h-3.5" />
              {isLookingUp ? 'Querying CTI...' : 'Check Indicator'}
            </button>
          </form>

          {/* Lookup Result Display */}
          {hasQueried && (
            <div className="pt-2">
              {lookupResult?.matched ? (
                <div className="p-4 rounded-xl border border-red-200 bg-red-50/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                      <span className="text-xs font-bold text-red-900 uppercase tracking-wide">
                        MATCH FOUND — MALICIOUS INDICATOR
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-red-200/80 text-red-900">
                      {lookupResult.confidence}% Confidence
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-red-100">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Indicator</p>
                      <p className="text-xs font-mono font-bold text-slate-900 truncate">{lookupResult.indicator}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Category</p>
                      <p className="text-xs font-bold text-red-700">{lookupResult.threatCategory || 'Ransomware'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Severity</p>
                      <p className="text-xs font-bold text-slate-800">{lookupResult.severity || 'CRITICAL'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Source</p>
                      <p className="text-xs font-medium text-slate-600">{lookupResult.source || 'SentinelIQ Local CTI'}</p>
                    </div>
                  </div>

                  {lookupResult.tags && lookupResult.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-slate-600">Tags:</span>
                      <div className="flex flex-wrap gap-1">
                        {lookupResult.tags.map((t, idx) => (
                          <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-100 text-red-800">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-emerald-900">NO THREAT MATCH FOUND (BENIGN / UNLISTED)</p>
                      <p className="text-[11px] text-emerald-700 font-mono">
                        Indicator <strong>{lookupResult?.indicator}</strong> has no verified malicious associations in active threat feeds.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-200 text-emerald-900">
                    CLEAN
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* IOC Directory Section */}
        <div className="bg-white border rounded-[12px] shadow-sm overflow-hidden" style={{ borderColor: BORDER }}>
          <div className="px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: BORDER }}>
            <div>
              <h3 className="text-sm font-bold" style={{ color: TEXT }}>
                Known Indicators of Compromise (IOC Registry)
              </h3>
              <p className="text-[11px]" style={{ color: MUTED }}>
                Curated and correlated indicators actively matched against agent network and process telemetry.
              </p>
            </div>

            {/* Type filters */}
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border bg-white p-0.5" style={{ borderColor: BORDER }}>
                {(['ALL', 'IP', 'DOMAIN', 'HASH', 'URL'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setSelectedType(t)}
                    className={`px-2.5 py-1 text-xs font-bold rounded ${
                      selectedType === t ? 'bg-[#17313E] text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* IOC Table */}
          {filteredIOCs.length === 0 ? (
            <div className="p-12">
              <EmptyState
                icon={<Database className="w-10 h-10 stroke-1" />}
                title="No IOCs found"
                message="No indicators match your current filter criteria."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-slate-50/50" style={{ borderColor: BORDER }}>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Type</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Indicator</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Classification</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Category</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Confidence</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Tags</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Source</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-right" style={{ color: MUTED }}>Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: BORDER }}>
                  {filteredIOCs.map(ioc => {
                    const TypeIcon = TYPE_ICONS[ioc.type] || Globe

                    return (
                      <tr key={ioc.indicator} className="hover:bg-slate-50/60 transition-colors">
                        {/* Type */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-[11px] font-mono font-bold text-slate-700">
                            <TypeIcon className="w-3 h-3 text-slate-500" />
                            {ioc.type}
                          </span>
                        </td>

                        {/* Indicator */}
                        <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-800 max-w-xs truncate">
                          {ioc.indicator}
                        </td>

                        {/* Classification */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ioc.isMalicious
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {ioc.isMalicious ? 'MALICIOUS' : 'BENIGN'}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-700">
                          {ioc.threatCategory || 'Generic'}
                        </td>

                        {/* Confidence */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className={`h-full ${ioc.confidence >= 80 ? 'bg-red-500' : 'bg-amber-500'}`}
                                style={{ width: `${ioc.confidence}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-800">{ioc.confidence}%</span>
                          </div>
                        </td>

                        {/* Tags */}
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {ioc.tags?.map((t, idx) => (
                              <span key={idx} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Source */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500">
                          {ioc.source}
                        </td>

                        {/* Inspect action */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleQuickInspect(ioc.indicator, ioc.type)}
                            className="text-xs font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
                          >
                            Lookup
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
