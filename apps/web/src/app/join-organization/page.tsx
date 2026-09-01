'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Eye, EyeOff, CheckCircle2, Ticket } from 'lucide-react'
import { apiPost } from '@/lib/api'
import { P, STORM, BG, TEXT, MUTED, BORDER, GREEN, FieldInput, PrimaryBtn } from '@/components/ui'

export default function JoinOrganizationPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', pw: '', code: '' })
  const [showPw, setShowPw] = useState(false)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.name || !form.email || !form.pw || !form.code) {
      setErrorMsg('All fields including the 6-character invitation code are required.')
      return
    }
    if (form.code.trim().length !== 6) {
      setErrorMsg('Invitation code must be exactly 6 characters.')
      return
    }

    setErrorMsg(null)
    setLoading(true)

    try {
      await apiPost('/auth/join', {
        name: form.name,
        email: form.email,
        password: form.pw,
        invitationCode: form.code.trim().toUpperCase(),
      })
      setSuccess(true)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid or expired invitation code.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG }}>
        <div className="w-full max-w-[440px] bg-white rounded-2xl border p-10 shadow-sm text-center" style={{ borderColor: BORDER }}>
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: 'rgba(22,163,74,0.1)' }}
          >
            <CheckCircle2 className="w-7 h-7" style={{ color: GREEN }} />
          </div>
          <h2 className="text-[20px] font-bold mb-2" style={{ color: TEXT }}>Organization Joined!</h2>
          <p className="text-[14px] mb-6" style={{ color: MUTED }}>
            Your account has been associated with your organization as a <strong style={{ color: TEXT }}>Security Analyst</strong>.
          </p>
          <PrimaryBtn onClick={() => router.push('/login')}>Go to Login</PrimaryBtn>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ backgroundColor: BG }}>
      <div className="w-full max-w-[440px]">
        <div className="bg-white rounded-2xl border p-8 shadow-sm" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: P }}>
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-[20px] font-bold" style={{ color: TEXT }}>SentinelIQ</span>
          </div>

          <h1 className="text-[22px] font-bold mb-1" style={{ color: TEXT }}>Join an Organization</h1>
          <p className="text-[14px] mb-6" style={{ color: MUTED }}>Enter your details and 6-character invitation code.</p>

          <div className="flex flex-col gap-4">
            <FieldInput
              label="Invitation Code"
              placeholder="e.g. A7B9X2"
              value={form.code}
              onChange={(v) => { set('code')(v.toUpperCase()); setErrorMsg(null); }}
              right={<Ticket className="w-4 h-4" style={{ color: MUTED }} />}
            />
            <FieldInput label="Full Name" placeholder="Jane Smith" value={form.name} onChange={set('name')} />
            <FieldInput
              label="Work Email"
              type="email"
              placeholder="jane@organization.com"
              value={form.email}
              onChange={(v) => { set('email')(v); setErrorMsg(null); }}
            />
            <FieldInput
              label="Password"
              type={showPw ? 'text' : 'password'}
              placeholder="Minimum 8 characters"
              value={form.pw}
              onChange={set('pw')}
              right={
                <button onClick={() => setShowPw(s => !s)} style={{ color: MUTED }} className="cursor-pointer">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            {errorMsg && (
              <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            )}

            <div className="mt-1">
              <PrimaryBtn onClick={submit} loading={loading}>Join Organization</PrimaryBtn>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t text-center" style={{ borderColor: BORDER }}>
            <p className="text-[13px]" style={{ color: MUTED }}>
              Already have an account?{' '}
              <button onClick={() => router.push('/login')} className="hover:opacity-75 cursor-pointer font-semibold" style={{ color: STORM }}>
                Log in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
