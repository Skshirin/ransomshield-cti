import { useState } from 'react'
import { ExternalLink, Copy, Check, Globe, Loader2, Trash2, Edit2, AlertCircle, RefreshCw } from 'lucide-react'
import { useApp } from '@/lib/context'
import { CTIStatusBadge, VerificationBadge, Button, ConfirmModal, EmptyState, Card } from '@/components/ui'

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function TxHash({ hash, blockNumber }: { hash: string; blockNumber: number | null }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(hash)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-mono text-slate-500">{hash.slice(0, 18)}…</span>
      <button onClick={copy} className="p-0.5 text-slate-400 hover:text-slate-600">
        {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
      </button>
      <a
        href={`https://amoy.polygonscan.com/tx/${hash}`}
        target="_blank"
        rel="noreferrer"
        className="text-blue-500 hover:text-blue-700"
        title="View on Polygon Amoy testnet explorer"
      >
        <ExternalLink size={11} />
      </a>
      {blockNumber && <span className="text-[10px] font-mono text-slate-400">#{blockNumber.toLocaleString()}</span>}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 animate-pulse">
      <div className="flex justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="h-5 w-14 bg-slate-100 rounded-full" />
            <div className="h-4 w-20 bg-slate-100 rounded" />
          </div>
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="h-3 w-5/6 bg-slate-100 rounded" />
          <div className="h-3 w-3/4 bg-slate-100 rounded" />
        </div>
        <div className="flex-shrink-0 space-y-2">
          <div className="h-7 w-28 bg-slate-100 rounded-lg" />
          <div className="h-7 w-24 bg-slate-100 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export default function CTICenterPage() {
  const {
    ctiReports, globalFeed, navigate, publishCTI, discardCTI,
    ctiLoading, ctiError, refetchCTI, feedLoading, feedError,
  } = useApp()
  const [tab, setTab] = useState<'my' | 'feed'>('my')
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [discardTarget, setDiscardTarget] = useState<string | null>(null)
  const [discarding, setDiscarding] = useState(false)

  const handlePublish = async (id: string) => {
    setPublishingId(id)
    setPublishError(null)
    try {
      await publishCTI(id)
    } catch (err: unknown) {
      setPublishError(err instanceof Error ? err.message : 'Publishing failed')
    } finally {
      setPublishingId(null)
    }
  }

  const handleDiscard = async () => {
    if (!discardTarget) return
    setDiscarding(true)
    await discardCTI(discardTarget)
    setDiscarding(false)
    setDiscardTarget(null)
  }

  const myReports = [...ctiReports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const feed = [...globalFeed].sort((a, b) => new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime())

  const isLoading = tab === 'my' ? ctiLoading : feedLoading
  const hasError = tab === 'my' ? ctiError : feedError

  return (
    <div className="p-6 space-y-4">
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setTab('my')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'my' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            My Organization's Reports
          </button>
          <button
            onClick={() => setTab('feed')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'feed' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Global CTI Feed
          </button>
        </div>
        <button
          onClick={refetchCTI}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {publishError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 flex-1">{publishError}</span>
          <button onClick={() => setPublishError(null)} className="text-xs text-red-600 underline">Dismiss</button>
        </div>
      )}

      {hasError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 flex-1">{hasError}</span>
          <Button size="sm" variant="secondary" onClick={refetchCTI}>Retry</Button>
        </div>
      )}

      {/* My Reports */}
      {tab === 'my' && (
        <div className="space-y-3">
          {isLoading ? (
            [...Array(3)].map((_, i) => <SkeletonCard key={i} />)
          ) : myReports.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Globe size={40} />}
                title="No CTI reports yet"
                message="Generate a CTI report from a detection to share verified threat intelligence with the community."
              />
            </Card>
          ) : (
            myReports.map(r => (
              <Card key={r._id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <CTIStatusBadge status={r.status} />
                      {r.verificationStatus !== 'PENDING' && <VerificationBadge status={r.verificationStatus} />}
                      <span className="text-[10px] font-mono text-slate-400">{fmt(r.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-800 leading-relaxed line-clamp-3">{r.attackSummary}</p>
                    {r.transactionHash && (
                      <div className="mt-2">
                        <TxHash hash={r.transactionHash} blockNumber={r.blockNumber} />
                      </div>
                    )}
                    {r.publishedAt && (
                      <p className="text-[11px] text-slate-400 mt-1.5">Published {fmt(r.publishedAt)}</p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {r.status === 'DRAFT' && (
                      <>
                        {publishingId === r._id ? (
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            <Loader2 size={13} className="animate-spin" />
                            Publishing to Polygon… (this may take up to 60s)
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => handlePublish(r._id)} disabled={publishingId !== null}>
                            Publish to Blockchain
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => navigate('cti-draft-editor', { id: r._id })}
                          disabled={publishingId === r._id}
                        >
                          <Edit2 size={13} /> Edit Draft
                        </Button>
                        <button
                          onClick={() => setDiscardTarget(r._id)}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                          disabled={publishingId === r._id}
                        >
                          <Trash2 size={12} /> Discard
                        </button>
                      </>
                    )}
                    {r.status === 'PUBLISHED' && (
                      <Button size="sm" variant="secondary" onClick={() => navigate('cti-draft-editor', { id: r._id })}>
                        View Report
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Global Feed */}
      {tab === 'feed' && (
        <div className="space-y-3">
          {isLoading ? (
            [...Array(3)].map((_, i) => <SkeletonCard key={i} />)
          ) : feed.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Globe size={40} />}
                title="No published intelligence"
                message="No published reports in the global feed yet."
              />
            </Card>
          ) : (
            feed.map(r => (
              <Card key={r._id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                        Anonymous Organization
                      </span>
                      <VerificationBadge status={r.verificationStatus} />
                      {r.publishedAt && <span className="text-[10px] font-mono text-slate-400">{fmt(r.publishedAt)}</span>}
                    </div>
                    <p className="text-sm text-slate-800 leading-relaxed mb-3">{r.attackSummary}</p>
                    <div className="space-y-1 mb-3">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Indicators of Compromise</p>
                      <ul className="space-y-1">
                        {r.indicatorsOfCompromise.slice(0, 3).map((ioc, i) => (
                          <li key={i} className="text-xs text-slate-600 font-mono bg-slate-50 rounded px-2 py-1">{ioc}</li>
                        ))}
                        {r.indicatorsOfCompromise.length > 3 && (
                          <li className="text-xs text-slate-400">+{r.indicatorsOfCompromise.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                    {r.transactionHash && <TxHash hash={r.transactionHash} blockNumber={r.blockNumber} />}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      <ConfirmModal
        open={!!discardTarget}
        onClose={() => setDiscardTarget(null)}
        onConfirm={handleDiscard}
        title="Discard CTI Draft"
        message="This draft will be permanently deleted. This action cannot be undone."
        confirmLabel="Discard Draft"
        danger
        loading={discarding}
      />
    </div>
  )
}
