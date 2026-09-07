'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import {
  SlidersHorizontal,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Play,
  Trash2,
  Edit2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Info,
  Layers,
  ArrowRight,
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
  Modal,
  ConfirmModal,
  Button,
  EmptyState,
} from '@/components/ui'
import { useApp } from '@/lib/context'
import type {
  Policy,
  PolicyCondition,
  PolicyAction,
  PolicyActionType,
  PolicyConditionField,
  PolicyConditionOperator,
} from '@/lib/types'

const CONDITION_FIELDS: { value: PolicyConditionField; label: string; defaultOp: PolicyConditionOperator; defaultVal: any; unit?: string }[] = [
  { value: 'riskScore', label: 'Detection Risk Score (0.0 - 1.0)', defaultOp: 'GREATER_THAN_OR_EQUAL', defaultVal: 0.85, unit: 'score' },
  { value: 'severity', label: 'Detection Severity', defaultOp: 'EQUALS', defaultVal: 'CRITICAL' },
  { value: 'consecutiveDetections', label: 'Consecutive Critical Detections', defaultOp: 'GREATER_THAN_OR_EQUAL', defaultVal: 3, unit: 'events' },
  { value: 'ctiMatch', label: 'Threat Intel Match Found', defaultOp: 'EQUALS', defaultVal: true },
  { value: 'ctiConfidence', label: 'CTI Threat Confidence (%)', defaultOp: 'GREATER_THAN_OR_EQUAL', defaultVal: 80, unit: '%' },
  { value: 'maliciousIocMatch', label: 'Malicious IOC Present', defaultOp: 'EQUALS', defaultVal: true },
  { value: 'crossEndpointAttack', label: 'Cross-Endpoint Attack Active', defaultOp: 'EQUALS', defaultVal: true },
  { value: 'affectedEndpointCount', label: 'Affected Endpoints in Cascade', defaultOp: 'GREATER_THAN_OR_EQUAL', defaultVal: 2, unit: 'hosts' },
  { value: 'endpointStatus', label: 'Endpoint Current State', defaultOp: 'EQUALS', defaultVal: 'AT_RISK' },
]

const OPERATOR_LABELS: Record<PolicyConditionOperator, string> = {
  GREATER_THAN_OR_EQUAL: '>=',
  GREATER_THAN: '>',
  LESS_THAN_OR_EQUAL: '<=',
  LESS_THAN: '<',
  EQUALS: '==',
  NOT_EQUALS: '!=',
  CONTAINS: 'CONTAINS',
  IN: 'IN',
}

const ACTION_OPTIONS: { value: PolicyActionType; label: string; desc: string; color: string }[] = [
  {
    value: 'ISOLATE_ENDPOINT',
    label: 'Isolate Affected Endpoint(s)',
    desc: 'Automatically queues safe containment command to cut off ransomware spread.',
    color: RED,
  },
  {
    value: 'MARK_HIGH_RISK',
    label: 'Escalate to High Risk',
    desc: 'Flags endpoint as critical risk and elevates priority in SOC queues.',
    color: AMBER,
  },
  {
    value: 'CREATE_ALERT',
    label: 'Generate Incident Alert',
    desc: 'Dispatches real-time broadcast and audit notification without host state change.',
    color: STORM,
  },
]

export default function PoliciesPage() {
  const { policies, currentUser, createPolicy, updatePolicy, togglePolicy, deletePolicy } = useApp()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState(50)
  const [cooldownPeriodSeconds, setCooldownPeriodSeconds] = useState(300)
  const [enabled, setEnabled] = useState(true)
  const [logicalOperator, setLogicalOperator] = useState<'AND' | 'OR'>('AND')
  const [conditions, setConditions] = useState<PolicyCondition[]>([
    { field: 'riskScore', operator: 'GREATER_THAN_OR_EQUAL', value: 0.85 },
  ])
  const [actionType, setActionType] = useState<PolicyActionType>('ISOLATE_ENDPOINT')
  const [formError, setFormError] = useState<string | null>(null)

  const isAuthorized = currentUser?.role === 'ORG_ADMIN' || currentUser?.role === 'SECURITY_ANALYST'

  const activeCount = policies.filter(p => p.enabled).length
  const disabledCount = policies.filter(p => !p.enabled).length
  const totalTriggers = policies.reduce((sum, p) => sum + (p.triggerCount || 0), 0)

  const openCreateModal = () => {
    setEditingPolicy(null)
    setName('')
    setDescription('')
    setPriority(50)
    setCooldownPeriodSeconds(300)
    setEnabled(true)
    setLogicalOperator('AND')
    setConditions([{ field: 'riskScore', operator: 'GREATER_THAN_OR_EQUAL', value: 0.85 }])
    setActionType('ISOLATE_ENDPOINT')
    setFormError(null)
    setModalOpen(true)
  }

  const openEditModal = (p: Policy) => {
    setEditingPolicy(p)
    setName(p.name)
    setDescription(p.description || '')
    setPriority(p.priority || 50)
    setCooldownPeriodSeconds(p.cooldownPeriodSeconds || 300)
    setEnabled(p.enabled)
    setLogicalOperator(p.logicalOperator || 'AND')
    setConditions(p.conditions && p.conditions.length > 0 ? [...p.conditions] : [{ field: 'riskScore', operator: 'GREATER_THAN_OR_EQUAL', value: 0.85 }])
    setActionType(p.actions && p.actions[0] ? p.actions[0].type : 'ISOLATE_ENDPOINT')
    setFormError(null)
    setModalOpen(true)
  }

  const handleAddCondition = () => {
    setConditions(prev => [
      ...prev,
      { field: 'ctiMatch', operator: 'EQUALS', value: true },
    ])
  }

  const handleRemoveCondition = (index: number) => {
    if (conditions.length <= 1) return
    setConditions(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpdateCondition = (index: number, updates: Partial<PolicyCondition>) => {
    setConditions(prev => {
      const copy = [...prev]
      const current = copy[index]
      const updated = { ...current, ...updates }

      // If field changed, set smart defaults
      if (updates.field && updates.field !== current.field) {
        const meta = CONDITION_FIELDS.find(f => f.value === updates.field)
        if (meta) {
          updated.operator = meta.defaultOp
          updated.value = meta.defaultVal
        }
      }

      copy[index] = updated
      return copy
    })
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setFormError('Policy name is required')
      return
    }
    if (conditions.length === 0) {
      setFormError('At least one condition is required')
      return
    }

    setIsSubmitting(true)
    setFormError(null)

    const payload: Partial<Policy> = {
      name: name.trim(),
      description: description.trim(),
      priority: Number(priority),
      cooldownPeriodSeconds: Number(cooldownPeriodSeconds),
      enabled,
      logicalOperator,
      conditions,
      actions: [{ type: actionType }],
    }

    try {
      if (editingPolicy) {
        await updatePolicy(editingPolicy._id, payload)
      } else {
        await createPolicy(payload)
      }
      setModalOpen(false)
    } catch (err: any) {
      setFormError(err.message || 'Failed to save policy')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirmId) return
    setIsSubmitting(true)
    try {
      await deletePolicy(deleteConfirmId)
      setDeleteConfirmId(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Layout>
      <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: P }}>
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: TEXT }}>
                Automated Response Policies
              </h1>
            </div>
            <p className="text-[13px] mt-1" style={{ color: MUTED }}>
              Deterministic security rules that correlate CTI, risk scores, and cross-endpoint activity to automate safe response actions.
            </p>
          </div>

          {isAuthorized && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity shadow-sm cursor-pointer self-start sm:self-auto"
              style={{ backgroundColor: P }}
            >
              <Plus className="w-4 h-4" />
              Create Policy
            </button>
          )}
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border rounded-[10px] p-5 shadow-sm" style={{ borderColor: BORDER }}>
            <p className="text-[10px] font-bold tracking-[0.1em] mb-2 uppercase" style={{ color: MUTED }}>
              ACTIVE POLICIES
            </p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold leading-none" style={{ color: GREEN }}>
                {activeCount}
              </span>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: GREEN }} />
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: MUTED }}>
              Evaluating incoming detections
            </p>
          </div>

          <div className="bg-white border rounded-[10px] p-5 shadow-sm" style={{ borderColor: BORDER }}>
            <p className="text-[10px] font-bold tracking-[0.1em] mb-2 uppercase" style={{ color: MUTED }}>
              DISABLED POLICIES
            </p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold leading-none" style={{ color: TEXT }}>
                {disabledCount}
              </span>
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: MUTED }}>
              Rules suspended by admin
            </p>
          </div>

          <div className="bg-white border rounded-[10px] p-5 shadow-sm" style={{ borderColor: BORDER }}>
            <p className="text-[10px] font-bold tracking-[0.1em] mb-2 uppercase" style={{ color: MUTED }}>
              POLICY TRIGGERS
            </p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold leading-none" style={{ color: RED }}>
                {totalTriggers}
              </span>
              {totalTriggers > 0 && <Zap className="w-4 h-4" style={{ color: RED }} />}
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: MUTED }}>
              Automated responses executed
            </p>
          </div>

          <div className="bg-white border rounded-[10px] p-5 shadow-sm" style={{ borderColor: BORDER }}>
            <p className="text-[10px] font-bold tracking-[0.1em] mb-2 uppercase" style={{ color: MUTED }}>
              PROTECTION STATUS
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold" style={{ color: activeCount > 0 ? GREEN : AMBER }}>
                {activeCount > 0 ? 'ACTIVE ENFORCEMENT' : 'MANUAL MODE'}
              </span>
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: MUTED }}>
              Audit logged via System Engine
            </p>
          </div>
        </div>

        {/* Policy Listing Table */}
        <div className="bg-white border rounded-[10px] shadow-sm overflow-hidden" style={{ borderColor: BORDER }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
            <div>
              <h2 className="text-[14px] font-bold" style={{ color: TEXT }}>Configured Security Policies</h2>
              <p className="text-[11px]" style={{ color: MUTED }}>Policies are evaluated in order of priority (highest first).</p>
            </div>
            {!isAuthorized && (
              <span className="text-[11px] px-2.5 py-1 rounded bg-slate-100 font-medium text-slate-500">
                Read-Only Access
              </span>
            )}
          </div>

          {policies.length === 0 ? (
            <div className="p-12">
              <EmptyState
                icon={<SlidersHorizontal className="w-10 h-10 stroke-1" />}
                title="No policies configured"
                message="Create an automated response policy to automatically isolate ransomware or contain multi-host attacks."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-slate-50/50" style={{ borderColor: BORDER }}>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Status</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Priority</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Policy Name</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Rule Condition(s)</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Automated Action</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Cooldown</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Triggers</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-right" style={{ color: MUTED }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: BORDER }}>
                  {policies.map(p => {
                    const primaryAction = p.actions && p.actions[0] ? p.actions[0].type : 'ISOLATE_ENDPOINT'
                    const actionInfo = ACTION_OPTIONS.find(a => a.value === primaryAction) || {
                      label: primaryAction,
                      color: P,
                    }

                    return (
                      <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Status Toggle */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {isAuthorized ? (
                            <button
                              onClick={() => togglePolicy(p._id, !p.enabled)}
                              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                p.enabled ? 'bg-emerald-600' : 'bg-slate-300'
                              }`}
                              title={p.enabled ? 'Click to disable' : 'Click to enable'}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  p.enabled ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                p.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {p.enabled ? 'Active' : 'Disabled'}
                            </span>
                          )}
                        </td>

                        {/* Priority */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700">
                            P{p.priority ?? 50}
                          </span>
                        </td>

                        {/* Name & Description */}
                        <td className="px-5 py-4 max-w-xs">
                          <p className="text-[13px] font-semibold" style={{ color: TEXT }}>
                            {p.name}
                          </p>
                          {p.description && (
                            <p className="text-[11px] truncate mt-0.5" style={{ color: MUTED }}>
                              {p.description}
                            </p>
                          )}
                        </td>

                        {/* Visual Conditions */}
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 uppercase">
                              IF
                            </span>
                            {p.conditions.map((c, idx) => {
                              const fLabel = CONDITION_FIELDS.find(f => f.value === c.field)?.label.split(' ')[0] || c.field
                              const opStr = OPERATOR_LABELS[c.operator] || c.operator
                              const valStr = typeof c.value === 'boolean' ? (c.value ? 'TRUE' : 'FALSE') : String(c.value)

                              return (
                                <div key={idx} className="flex items-center gap-1">
                                  {idx > 0 && (
                                    <span className="text-[9px] font-extrabold px-1 rounded bg-teal-100 text-teal-800">
                                      {p.logicalOperator || 'AND'}
                                    </span>
                                  )}
                                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                                    <span className="font-semibold text-slate-600">{fLabel}</span> {opStr}{' '}
                                    <span className="font-bold text-teal-700">{valStr}</span>
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </td>

                        {/* Action */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                            style={{ backgroundColor: `${actionInfo.color}15`, color: actionInfo.color }}
                          >
                            <ArrowRight className="w-3 h-3" />
                            {actionInfo.label}
                          </span>
                        </td>

                        {/* Cooldown */}
                        <td className="px-5 py-4 whitespace-nowrap text-[12px] font-mono" style={{ color: MUTED }}>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {p.cooldownPeriodSeconds || 300}s
                          </span>
                        </td>

                        {/* Trigger Count */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-bold" style={{ color: p.triggerCount ? RED : MUTED }}>
                              {p.triggerCount || 0} hits
                            </span>
                            {p.lastTriggeredAt && (
                              <span className="text-[10px]" style={{ color: MUTED }}>
                                {new Date(p.lastTriggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Row Actions */}
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          {isAuthorized ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditModal(p)}
                                className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
                                title="Edit Policy"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(p._id)}
                                className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer"
                                title="Delete Policy"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
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

      {/* Create / Edit Policy Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPolicy ? 'Edit Response Policy' : 'Create Automated Response Policy'}
        width="max-w-2xl"
      >
        <div className="space-y-5">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Name & Priority */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-700">Policy Name *</label>
              <input
                type="text"
                placeholder="e.g. Critical Ransomware Auto-Containment"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-600/30"
                style={{ borderColor: BORDER }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Priority (1-100)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={priority}
                onChange={e => setPriority(Math.max(1, Math.min(100, Number(e.target.value))))}
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-teal-600/30"
                style={{ borderColor: BORDER }}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Description</label>
            <textarea
              rows={2}
              placeholder="Explain what this automated response policy accomplishes and why it triggers..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-600/30 resize-none"
              style={{ borderColor: BORDER }}
            />
          </div>

          {/* Condition Logic Combinator */}
          <div className="border rounded-xl p-4 bg-slate-50/50 space-y-3" style={{ borderColor: BORDER }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">IF Conditions Match</span>
                <div className="inline-flex rounded-md border bg-white p-0.5" style={{ borderColor: BORDER }}>
                  <button
                    type="button"
                    onClick={() => setLogicalOperator('AND')}
                    className={`px-2.5 py-1 text-xs font-bold rounded ${logicalOperator === 'AND' ? 'bg-[#17313E] text-white' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    ALL (AND)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogicalOperator('OR')}
                    className={`px-2.5 py-1 text-xs font-bold rounded ${logicalOperator === 'OR' ? 'bg-[#17313E] text-white' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    ANY (OR)
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddCondition}
                className="flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Condition
              </button>
            </div>

            {/* Condition Rows */}
            <div className="space-y-2.5">
              {conditions.map((cond, idx) => {
                return (
                  <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border shadow-2xs" style={{ borderColor: BORDER }}>
                    {/* Field Selector */}
                    <select
                      value={cond.field}
                      onChange={e => handleUpdateCondition(idx, { field: e.target.value as PolicyConditionField })}
                      className="text-xs font-semibold px-2.5 py-1.5 border rounded bg-white text-slate-800 outline-none flex-1"
                      style={{ borderColor: BORDER }}
                    >
                      {CONDITION_FIELDS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>

                    {/* Operator Selector */}
                    <select
                      value={cond.operator}
                      onChange={e => handleUpdateCondition(idx, { operator: e.target.value as PolicyConditionOperator })}
                      className="text-xs font-mono font-bold px-2 py-1.5 border rounded bg-white text-slate-800 outline-none w-28"
                      style={{ borderColor: BORDER }}
                    >
                      {Object.entries(OPERATOR_LABELS).map(([k, v]) => (
                        <option key={k} value={k as PolicyConditionOperator}>{v} ({k})</option>
                      ))}
                    </select>

                    {/* Value Input depending on type */}
                    {cond.field === 'severity' ? (
                      <select
                        value={String(cond.value)}
                        onChange={e => handleUpdateCondition(idx, { value: e.target.value })}
                        className="text-xs font-bold px-2 py-1.5 border rounded bg-white text-slate-800 outline-none w-32"
                        style={{ borderColor: BORDER }}
                      >
                        <option value="CRITICAL">CRITICAL</option>
                        <option value="HIGH">HIGH</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="LOW">LOW</option>
                      </select>
                    ) : cond.field === 'ctiMatch' || cond.field === 'maliciousIocMatch' || cond.field === 'crossEndpointAttack' ? (
                      <select
                        value={String(cond.value)}
                        onChange={e => handleUpdateCondition(idx, { value: e.target.value === 'true' })}
                        className="text-xs font-bold px-2 py-1.5 border rounded bg-white text-slate-800 outline-none w-28"
                        style={{ borderColor: BORDER }}
                      >
                        <option value="true">TRUE</option>
                        <option value="false">FALSE</option>
                      </select>
                    ) : (
                      <input
                        type="number"
                        step={cond.field === 'riskScore' ? '0.05' : '1'}
                        value={cond.value}
                        onChange={e => handleUpdateCondition(idx, { value: Number(e.target.value) })}
                        className="text-xs font-mono font-bold px-2 py-1.5 border rounded bg-white text-slate-800 outline-none w-24"
                        style={{ borderColor: BORDER }}
                      />
                    )}

                    {/* Remove button */}
                    <button
                      type="button"
                      disabled={conditions.length <= 1}
                      onClick={() => handleRemoveCondition(idx)}
                      className={`p-1 rounded text-slate-400 hover:text-red-600 ${conditions.length <= 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action & Cooldown */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-700">THEN Automated Action *</label>
              <select
                value={actionType}
                onChange={e => setActionType(e.target.value as PolicyActionType)}
                className="w-full px-3 py-2 border rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-600/30"
                style={{ borderColor: BORDER }}
              >
                {ACTION_OPTIONS.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                {ACTION_OPTIONS.find(a => a.value === actionType)?.desc}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Cooldown (Sec)</label>
              <input
                type="number"
                min="10"
                max="86400"
                value={cooldownPeriodSeconds}
                onChange={e => setCooldownPeriodSeconds(Math.max(10, Number(e.target.value)))}
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-teal-600/30"
                style={{ borderColor: BORDER }}
              />
              <p className="text-[11px] text-slate-400">Loop prevention timer</p>
            </div>
          </div>

          {/* Enable switch */}
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="enablePolicyCheck"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-teal-700 focus:ring-teal-500 cursor-pointer"
            />
            <label htmlFor="enablePolicyCheck" className="text-sm font-medium text-slate-700 cursor-pointer">
              Enable policy immediately upon saving
            </label>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: BORDER }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={isSubmitting}>
              {editingPolicy ? 'Update Policy' : 'Create Policy'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDelete}
        title="Delete Response Policy"
        message="Are you sure you want to delete this response policy? This action cannot be undone and automated containment rules associated with this policy will immediately stop executing."
        confirmLabel="Delete Policy"
        danger
        loading={isSubmitting}
      />
    </Layout>
  )
}
