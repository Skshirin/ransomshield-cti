import { useState } from 'react'
import { Zap, CheckCircle2, XCircle, ExternalLink, Search, Loader2 } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button, Input, Card } from '@/components/ui'

type VerifyResult = 'verified' | 'failed' | null

export default function BlockchainVerificationPage() {
  const { ctiReports, globalFeed } = useApp()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerifyResult>(null)
  const [foundReport, setFoundReport] = useState<{ attackSummary: string; transactionHash: string; blockNumber: number; publishedAt: string } | null>(null)

  const allReports = [...ctiReports, ...globalFeed]

  const handleVerify = async () => {
    if (!query.trim()) return
    setLoading(true)
    setResult(null)
    setFoundReport(null)


    const trimmed = query.trim().toLowerCase()
    const match = allReports.find(r =>
      r.transactionHash?.toLowerCase() === trimmed ||
      r._id.toLowerCase() === trimmed
    )

    if (match && match.status === 'PUBLISHED' && match.transactionHash) {
      setResult('verified')
      setFoundReport({
        attackSummary: match.attackSummary,
        transactionHash: match.transactionHash,
        blockNumber: match.blockNumber!,
        publishedAt: match.publishedAt!,
      })
    } else {
      setResult('failed')
    }
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Intro */}
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-navy-900 rounded-xl flex items-center justify-center flex-shrink-0">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-navy-900 mb-1">Blockchain Verification Tool</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Verify the authenticity and integrity of any CTI report published to the Polygon blockchain. Enter a report ID or a Polygon transaction hash to check its verification status.
            </p>
          </div>
        </div>
      </Card>

      {/* Input */}
      <Card className="p-5">
        <div className="space-y-3">
          <Input
            label="Report ID or Transaction Hash"
            placeholder="e.g. cti-001 or 0x7f3a4b1c8e9d…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleVerify()}
            icon={<Search size={15} />}
          />
          <Button onClick={handleVerify} loading={loading} className="w-full">
            {loading ? 'Verifying on Polygon…' : 'Verify Report'}
          </Button>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 justify-center">
              <Loader2 size={12} className="animate-spin" />
              Querying Polygon blockchain…
            </div>
          )}
        </div>
      </Card>

      {/* Quick access */}
      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">Quick verify — click any published report ID:</p>
        <div className="flex flex-wrap gap-2">
          {allReports
            .filter(r => r.status === 'PUBLISHED')
            .map(r => (
              <button
                key={r._id}
                onClick={() => { setQuery(r._id); setResult(null); setFoundReport(null) }}
                className="text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg transition-colors"
              >
                {r._id}
              </button>
            ))}
        </div>
      </div>

      {/* Result */}
      {result === 'verified' && foundReport && (
        <Card className="overflow-hidden">
          <div className="h-1 bg-emerald-500" />
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center">
                <CheckCircle2 size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-700">Report Verified on Polygon</p>
                <p className="text-xs text-slate-500">Integrity confirmed — report has not been tampered with</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Transaction Hash</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-slate-700">{foundReport.transactionHash.slice(0, 22)}…</span>
                  <a href={`https://amoy.polygonscan.com/tx/${foundReport.transactionHash}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Block Number</span>
                <span className="font-mono text-slate-700">#{foundReport.blockNumber.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Published</span>
                <span className="font-mono text-slate-700">{new Date(foundReport.publishedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Attack Summary</p>
              <p className="text-sm text-slate-700 leading-relaxed line-clamp-4">{foundReport.attackSummary}</p>
            </div>

            <a
              href={`https://amoy.polygonscan.com/tx/${foundReport.transactionHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              View on Polygon Amoy Explorer <ExternalLink size={14} />
            </a>
          </div>
        </Card>
      )}

      {result === 'failed' && (
        <Card className="overflow-hidden">
          <div className="h-1 bg-red-500" />
          <div className="p-5 flex items-start gap-4">
            <div className="w-10 h-10 bg-red-50 border border-red-200 rounded-xl flex items-center justify-center flex-shrink-0">
              <XCircle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-700">Verification Failed</p>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                No verified report was found for the provided ID or transaction hash. This could mean the report hasn't been published to the blockchain, the ID is incorrect, or the report integrity check failed.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
