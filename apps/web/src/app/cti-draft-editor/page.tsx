'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Plus, Trash2, Loader2 } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button, Textarea, ConfirmModal, CTIStatusBadge, VerificationBadge, Card } from '@/components/ui'

function CTIDraftEditorContent() {
  const { ctiReports, updateCTIDraft, publishCTI, discardCTI, navigate, pageParams } = useApp()
  const router = useRouter()
  const searchParams = useSearchParams()
  const reportId = searchParams.get('id') || pageParams.id

  const report = ctiReports.find(r => r._id === reportId)

  const [attackSummary, setAttackSummary] = useState(report?.attackSummary ?? '')
  const [analystNotes, setAnalystNotes] = useState(report?.analystNotes ?? '')
  const [iocs, setIocs] = useState<string[]>(report?.indicatorsOfCompromise ?? [])
  const [actions, setActions] = useState<string[]>(report?.recommendedActions ?? [])
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [showDiscard, setShowDiscard] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [newIoc, setNewIoc] = useState('')
  const [newAction, setNewAction] = useState('')

  useEffect(() => {
    if (report) {
      setAttackSummary(report.attackSummary)
      setAnalystNotes(report.analystNotes)
      setIocs(report.indicatorsOfCompromise)
      setActions(report.recommendedActions)
    }
  }, [report?._id])

  const goBack = () => {
    navigate('cti-center')
    router.push('/cti-center')
  }

  if (!report) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Report not found.</p>
        <button onClick={goBack} className="text-sm text-navy-600 mt-2 hover:underline cursor-pointer">Back to CTI Center</button>
      </div>
    )
  }

  const isDraft = report.status === 'DRAFT'

  const handleSave = async () => {
    setSaving(true)
    await updateCTIDraft(report._id, {
      attackSummary,
      analystNotes,
      indicatorsOfCompromise: iocs,
      recommendedActions: actions,
    })
    setSaving(false)
  }

  const handlePublish = async () => {
    await handleSave()
    setPublishing(true)
    await publishCTI(report._id)
    setPublishing(false)
    goBack()
  }

  const handleDiscard = async () => {
    setDiscarding(true)
    await discardCTI(report._id)
    setDiscarding(false)
    goBack()
  }

  const addIoc = () => {
    if (newIoc.trim()) { setIocs(prev => [...prev, newIoc.trim()]); setNewIoc('') }
  }
  const addAction = () => {
    if (newAction.trim()) { setActions(prev => [...prev, newAction.trim()]); setNewAction('') }
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <button
        onClick={goBack}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-900 transition-colors cursor-pointer"
      >
        <ChevronLeft size={16} /> Back to CTI Center
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CTIStatusBadge status={report.status} />
          {report.status === 'PUBLISHED' && <VerificationBadge status={report.verificationStatus} />}
          <span className="text-xs font-mono text-slate-400">Report ID: {report._id}</span>
        </div>
        {publishing && (
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <Loader2 size={14} className="animate-spin text-navy-600" />
            Publishing to Polygon blockchain…
          </div>
        )}
      </div>

      {/* Attack Summary */}
      <Card className="p-5">
        <Textarea
          label="Attack Summary"
          value={attackSummary}
          onChange={e => setAttackSummary(e.target.value)}
          rows={5}
          placeholder="Describe the attack vector, threat actor behavior, and affected systems…"
          disabled={!isDraft}
          className={isDraft ? '' : 'bg-slate-50 cursor-default'}
        />
      </Card>

      {/* IOCs */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-navy-900 mb-3">Indicators of Compromise</h3>
        <div className="space-y-2 mb-3">
          {iocs.map((ioc, i) => (
            <div key={i} className="flex items-start gap-2 bg-slate-50 rounded-lg px-3 py-2 group">
              <span className="text-xs font-mono text-slate-700 flex-1">{ioc}</span>
              {isDraft && (
                <button
                  onClick={() => setIocs(prev => prev.filter((_, j) => j !== i))}
                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
          {iocs.length === 0 && <p className="text-xs text-slate-400 italic">No IOCs added yet.</p>}
        </div>
        {isDraft && (
          <div className="flex gap-2">
            <input
              className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600/30"
              placeholder="Add indicator of compromise…"
              value={newIoc}
              onChange={e => setNewIoc(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addIoc()}
            />
            <Button size="sm" variant="secondary" onClick={addIoc}><Plus size={13} /></Button>
          </div>
        )}
      </Card>

      {/* Recommended Actions */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-navy-900 mb-3">Recommended Actions</h3>
        <ol className="space-y-2 mb-3">
          {actions.map((action, i) => (
            <li key={i} className="flex items-start gap-3 bg-slate-50 rounded-lg px-3 py-2 group">
              <span className="text-xs font-mono text-slate-400 flex-shrink-0 mt-0.5">{i + 1}.</span>
              <span className="text-xs text-slate-700 flex-1">{action}</span>
              {isDraft && (
                <button
                  onClick={() => setActions(prev => prev.filter((_, j) => j !== i))}
                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </li>
          ))}
          {actions.length === 0 && <p className="text-xs text-slate-400 italic">No actions added yet.</p>}
        </ol>
        {isDraft && (
          <div className="flex gap-2">
            <input
              className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600/30"
              placeholder="Add recommended action…"
              value={newAction}
              onChange={e => setNewAction(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addAction()}
            />
            <Button size="sm" variant="secondary" onClick={addAction}><Plus size={13} /></Button>
          </div>
        )}
      </Card>

      {/* Analyst Notes */}
      <Card className="p-5">
        <Textarea
          label="Analyst Notes"
          value={analystNotes}
          onChange={e => setAnalystNotes(e.target.value)}
          rows={4}
          placeholder="Internal notes for your SOC team — not shared publicly…"
          disabled={!isDraft}
          className={isDraft ? '' : 'bg-slate-50 cursor-default'}
        />
      </Card>

      {/* Actions */}
      {isDraft && (
        <div className="flex flex-wrap gap-3 pb-6">
          <Button onClick={handleSave} loading={saving} variant="secondary">Save Draft</Button>
          <Button onClick={handlePublish} loading={publishing} disabled={saving}>
            Publish to Blockchain
          </Button>
          <button
            onClick={() => setShowDiscard(true)}
            className="text-sm text-red-500 hover:text-red-700 transition-colors px-2 cursor-pointer"
          >
            Discard Draft
          </button>
        </div>
      )}

      <ConfirmModal
        open={showDiscard}
        onClose={() => setShowDiscard(false)}
        onConfirm={handleDiscard}
        title="Discard CTI Draft"
        message="This draft will be permanently deleted and cannot be recovered."
        confirmLabel="Discard"
        danger
        loading={discarding}
      />
    </div>
  )
}

export default function CTIDraftEditorPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading editor…</div>}>
      <CTIDraftEditorContent />
    </Suspense>
  )
}
