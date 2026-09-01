'use client'

import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { X, CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react'
import type { DetectionSeverity, DetectionStatus, EndpointStatus, CTIStatus, VerificationStatus, UserRole, Toast } from '@/lib/types'

// ── Figma Design System Tokens ───────────────────────────────────────────────
export const P = "#17313E";     // primary dark teal
export const STORM = "#415E72"; // storm blue
export const LAV = "#C5B0CD";   // lavender haze
export const BG = "#F8FAFC";
export const TEXT = "#111827";
export const MUTED = "#6B7280";
export const BORDER = "#E5E7EB";
export const RED = "#DC2626";
export const AMBER = "#F59E0B";
export const GREEN = "#16A34A";

// ── Figma Datasets ────────────────────────────────────────────────────────────
export const lineData = [
  { d: 1, v: 3 }, { d: 2, v: 5 }, { d: 3, v: 2 }, { d: 4, v: 8 },
  { d: 5, v: 12 }, { d: 6, v: 6 }, { d: 7, v: 3 }, { d: 8, v: 4 },
  { d: 9, v: 7 }, { d: 10, v: 9 }, { d: 11, v: 14 }, { d: 12, v: 11 },
  { d: 13, v: 5 }, { d: 14, v: 3 }, { d: 15, v: 8 }, { d: 16, v: 6 },
  { d: 17, v: 4 }, { d: 18, v: 9 }, { d: 19, v: 16 }, { d: 20, v: 13 },
  { d: 21, v: 7 }, { d: 22, v: 5 }, { d: 23, v: 3 }, { d: 24, v: 6 },
  { d: 25, v: 8 }, { d: 26, v: 11 }, { d: 27, v: 9 }, { d: 28, v: 4 },
  { d: 29, v: 6 }, { d: 30, v: 3 },
];

export const pieData = [
  { name: "Online", value: 48, color: GREEN },
  { name: "Offline", value: 2, color: MUTED },
  { name: "At Risk", value: 3, color: AMBER },
];

export const riskData = [
  { label: "Low", count: 24, color: GREEN },
  { label: "Medium", count: 14, color: AMBER },
  { label: "High", count: 8, color: "#F97316" },
  { label: "Critical", count: 3, color: RED },
];

export const ENDPOINTS = [
  { id: 1, name: "WORKSTATION-A01", status: "Online", lastSeen: "2 min ago", os: "Windows 11 22H2", cpu: 34, ram: 62, disk: 45 },
  { id: 2, name: "WORKSTATION-B07", status: "Online", lastSeen: "5 min ago", os: "Windows 10 21H2", cpu: 78, ram: 81, disk: 67 },
  { id: 3, name: "SERVER-MAIN-01", status: "At Risk", lastSeen: "12 min ago", os: "Ubuntu 22.04 LTS", cpu: 91, ram: 87, disk: 73 },
  { id: 4, name: "LAPTOP-EXEC-04", status: "Offline", lastSeen: "3 hrs ago", os: "macOS Ventura 13.4", cpu: 0, ram: 0, disk: 0 },
  { id: 5, name: "WORKSTATION-C12", status: "Online", lastSeen: "1 min ago", os: "Windows 11 22H2", cpu: 22, ram: 41, disk: 38 },
  { id: 6, name: "SERVER-DB-02", status: "Online", lastSeen: "8 min ago", os: "Ubuntu 20.04 LTS", cpu: 55, ram: 69, disk: 82 },
];

export const DETECTIONS = [
  { id: 1, time: "2024-01-15 14:23:07", endpoint: "SERVER-MAIN-01", score: 96, status: "New", severity: "Critical" },
  { id: 2, time: "2024-01-15 11:04:33", endpoint: "WORKSTATION-B07", score: 72, status: "Investigating", severity: "High" },
  { id: 3, time: "2024-01-14 22:17:51", endpoint: "LAPTOP-EXEC-04", score: 38, status: "Resolved", severity: "Low" },
  { id: 4, time: "2024-01-14 09:42:18", endpoint: "WORKSTATION-A01", score: 61, status: "Resolved", severity: "Medium" },
  { id: 5, time: "2024-01-13 16:55:44", endpoint: "SERVER-DB-02", score: 88, status: "New", severity: "High" },
];

export const CTI_FEED = [
  { id: 1, org: "ThreatWatch Inc.", type: "Ransomware", preview: "LockBit 3.0 variant detected targeting healthcare sector infrastructure via RDP brute-force...", time: "2 hrs ago", verified: true },
  { id: 2, org: "Anonymous", type: "Phishing", preview: "Credential harvesting campaign using fake Microsoft 365 login pages, spoofing internal IT...", time: "5 hrs ago", verified: true },
  { id: 3, org: "CyberSentinel", type: "Supply Chain", preview: "Compromised npm package 'auth-utils@2.1.4' exfiltrating environment variables on install...", time: "1 day ago", verified: false },
  { id: 4, org: "RedTeam Labs", type: "Ransomware", preview: "Novel encryption routine targeting network shares with double-extortion ransom demand...", time: "2 days ago", verified: true },
];

// ── Figma Core Components ───────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    Online:       { bg: "#DCFCE7", color: GREEN },
    Offline:      { bg: "#F3F4F6", color: MUTED },
    "At Risk":    { bg: "#FEF3C7", color: "#92400E" },
    New:          { bg: "#EEF2FF", color: "#4338CA" },
    Investigating:{ bg: "#FEF3C7", color: "#92400E" },
    Resolved:     { bg: "#DCFCE7", color: GREEN },
  };
  const s = map[status] ?? { bg: "#F3F4F6", color: MUTED };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const bg = score > 75 ? RED : score > 40 ? AMBER : GREEN;
  return (
    <span
      className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[12px] font-bold text-white flex-shrink-0"
      style={{ backgroundColor: bg }}
    >
      {score}
    </span>
  );
}

export function FieldInput({
  label, type = "text", placeholder, value, onChange, error, right,
}: {
  label?: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void;
  error?: string | null; right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[13px] font-medium" style={{ color: MUTED }}>{label}</label>
      )}
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-11 px-3 rounded-xl text-[14px] border outline-none transition-colors"
          style={{
            borderColor: error ? RED : BORDER,
            backgroundColor: error ? "rgba(220,38,38,0.04)" : "white",
            color: TEXT,
          }}
        />
        {right && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>
        )}
      </div>
      {error && <p className="text-[12px]" style={{ color: RED }}>{error}</p>}
    </div>
  );
}

export function PrimaryBtn({
  children, onClick, disabled, loading, full = true,
}: {
  children: React.ReactNode; onClick?: () => void;
  disabled?: boolean; loading?: boolean; full?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="h-11 px-5 rounded-[10px] text-[14px] font-semibold text-white flex items-center justify-center gap-2 transition-opacity"
      style={{
        width: full ? "100%" : undefined,
        backgroundColor: disabled ? BORDER : P,
        color: disabled ? MUTED : "white",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: loading ? 0.85 : 1,
      }}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

const severityStyles: Record<DetectionSeverity, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border border-red-200',
  HIGH: 'bg-orange-100 text-orange-700 border border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  LOW: 'bg-slate-100 text-slate-600 border border-slate-200',
}

const detectionStatusStyles: Record<DetectionStatus, string> = {
  NEW: 'bg-red-50 text-red-600 border border-red-200',
  INVESTIGATING: 'bg-amber-50 text-amber-700 border border-amber-200',
  RESOLVED: 'bg-green-50 text-green-700 border border-green-200',
  FALSE_POSITIVE: 'bg-slate-100 text-slate-500 border border-slate-200',
}

const endpointStatusStyles: Record<EndpointStatus, string> = {
  ONLINE: 'bg-green-50 text-green-700 border border-green-200',
  OFFLINE: 'bg-slate-100 text-slate-500 border border-slate-200',
  AT_RISK: 'bg-red-50 text-red-600 border border-red-200',
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
}

const ctiStatusStyles: Record<CTIStatus, string> = {
  PUBLISHED: 'bg-green-50 text-green-700 border border-green-200',
  DRAFT: 'bg-slate-100 text-slate-500 border border-slate-200',
  FAILED: 'bg-red-50 text-red-600 border border-red-200',
}

const verificationStyles: Record<VerificationStatus, string> = {
  VERIFIED: 'bg-green-50 text-green-700 border border-green-200',
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
  FAILED: 'bg-red-50 text-red-600 border border-red-200',
}

const roleBadgeStyles: Record<UserRole, string> = {
  ORG_ADMIN: 'bg-navy-600/10 text-navy-700 border border-navy-600/20',
  SECURITY_ANALYST: 'bg-blue-50 text-blue-700 border border-blue-200',
  SUPER_ADMIN: 'bg-purple-50 text-purple-700 border border-purple-200',
}

const roleBadgeLabels: Record<UserRole, string> = {
  ORG_ADMIN: 'Org Admin',
  SECURITY_ANALYST: 'Analyst',
  SUPER_ADMIN: 'Super Admin',
}

export function SeverityBadge({ severity }: { severity: DetectionSeverity }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-mono ${severityStyles[severity]}`}>
      {severity}
    </span>
  )
}

export function DetectionStatusBadge({ status }: { status: DetectionStatus }) {
  const label = status.replace('_', ' ')
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${detectionStatusStyles[status]}`}>
      {label}
    </span>
  )
}

export function EndpointStatusBadge({ status }: { status: EndpointStatus }) {
  const dotColors: Record<EndpointStatus, string> = {
    ONLINE: 'bg-green-500',
    OFFLINE: 'bg-slate-400',
    AT_RISK: 'bg-red-500',
    PENDING: 'bg-amber-500',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${endpointStatusStyles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[status]}`} />
      {status.replace('_', ' ')}
    </span>
  )
}

export function CTIStatusBadge({ status }: { status: CTIStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ctiStatusStyles[status]}`}>
      {status}
    </span>
  )
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${verificationStyles[status]}`}>
      {status}
    </span>
  )
}

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeStyles[role]}`}>
      {roleBadgeLabels[role]}
    </span>
  )
}

// ── Button ─────────────────────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  className?: string
  disabled?: boolean
}

export function Button({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none cursor-pointer'

  const variants = {
    primary: 'bg-navy-900 text-white hover:bg-navy-800 focus:ring-navy-600',
    secondary: 'bg-white text-navy-900 border border-slate-200 hover:bg-slate-50 focus:ring-slate-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-400',
    ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-200',
  }

  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-sm px-5 py-2.5',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}

// ── Card ───────────────────────────────────────────────────────────────────

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-100 ${className}`}>
      {children}
    </div>
  )
}

// ── KPI Card ───────────────────────────────────────────────────────────────

const accentColors = ['bg-violet-500', 'bg-red-500', 'bg-emerald-500', 'bg-amber-500']

export function KPICard({
  label,
  value,
  sub,
  accentIndex = 0,
  icon,
}: {
  label: string
  value: string | number
  sub?: string
  accentIndex?: number
  icon?: ReactNode
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className={`h-1 ${accentColors[accentIndex % accentColors.length]}`} />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-bold text-navy-900 mt-1.5 font-mono">{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
          </div>
          {icon && <div className="text-slate-300">{icon}</div>}
        </div>
      </div>
    </div>
  )
}

// ── Input ──────────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
  placeholder?: string
  value?: string | number | readonly string[]
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
  type?: string
}

export function Input({ label, error, icon, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <input
          className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600/30 focus:border-navy-600/50 transition-all ${icon ? 'pl-10' : ''} ${error ? 'border-red-400' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ── Textarea ───────────────────────────────────────────────────────────────

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  value?: string
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>
  rows?: number
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function Textarea({ label, className = '', ...props }: TextareaProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <textarea
        className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600/30 focus:border-navy-600/50 transition-all resize-none ${className}`}
        {...props}
      />
    </div>
  )
}

// ── Select ─────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  children: ReactNode
  className?: string
  value?: string | number | readonly string[]
  onChange?: React.ChangeEventHandler<HTMLSelectElement>
  disabled?: boolean
}

export function Select({ label, children, className = '', ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <select
        className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/30 focus:border-navy-600/50 transition-all ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

// ── Modal ──────────────────────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${width} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-navy-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ── Confirm Modal ──────────────────────────────────────────────────────────

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  loading = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-sm">
      <p className="text-sm text-slate-600 mb-5">{message}</p>
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded animate-pulse ${className}`} />
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── ResourceBar ────────────────────────────────────────────────────────────

export function ResourceBar({ value, label }: { value: number; label: string }) {
  const color = value >= 85 ? 'bg-red-500' : value >= 65 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-mono text-slate-500 uppercase">{label}</span>
        <span className="text-[10px] font-mono text-slate-600">{value}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, message }: { icon: ReactNode; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-slate-300 mb-3">{icon}</div>
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      <p className="text-xs text-slate-400 mt-1 max-w-xs">{message}</p>
    </div>
  )
}

// ── Toast Container ────────────────────────────────────────────────────────

const toastStyles = {
  success: { icon: CheckCircle2, bar: 'bg-emerald-500', bg: 'bg-white', text: 'text-emerald-700' },
  error: { icon: AlertCircle, bar: 'bg-red-500', bg: 'bg-white', text: 'text-red-700' },
  info: { icon: Info, bar: 'bg-blue-500', bg: 'bg-white', text: 'text-blue-700' },
}

export function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const s = toastStyles[toast.type]
  const Icon = s.icon
  return (
    <div className={`${s.bg} rounded-xl shadow-xl border border-slate-100 overflow-hidden flex w-80 items-start`}>
      <div className={`w-1 self-stretch ${s.bar} flex-shrink-0`} />
      <div className="flex items-start gap-3 px-4 py-3 flex-1 min-w-0">
        <Icon size={16} className={`${s.text} flex-shrink-0 mt-0.5`} />
        <p className="text-sm text-slate-700 flex-1 min-w-0">{toast.message}</p>
        <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
