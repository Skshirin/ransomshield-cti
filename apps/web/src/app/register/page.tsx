'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Eye, EyeOff, Check, CheckCircle2 } from 'lucide-react'
import { apiPost } from '@/lib/api'
import { P, STORM, BG, TEXT, MUTED, BORDER, GREEN, FieldInput, PrimaryBtn } from '@/components/ui'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ org: "", name: "", email: "", pw: "" })
  const [agreed, setAgreed] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.org || !form.name || !form.email || !form.pw) {
      setEmailError("All fields are required.")
      return
    }
    setEmailError(null)
    setLoading(true)
    try {
      await apiPost('/auth/register', {
        organizationName: form.org,
        adminName: form.name,
        email: form.email,
        password: form.pw,
      })
      setSuccess(true)
    } catch (err: any) {
      if (err?.status === 409) {
        setEmailError("This email is already registered.")
      } else {
        setEmailError(err?.message || "Registration failed. Please try again.")
      }
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
            style={{ backgroundColor: "rgba(22,163,74,0.1)" }}
          >
            <CheckCircle2 className="w-7 h-7" style={{ color: GREEN }} />
          </div>
          <h2 className="text-[20px] font-bold mb-2" style={{ color: TEXT }}>Organization Created!</h2>
          <p className="text-[14px] mb-6" style={{ color: MUTED }}>
            Your organization and administrator account are ready. Please sign in to access your workspace.
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

          <h1 className="text-[22px] font-bold mb-1" style={{ color: TEXT }}>Create your organization</h1>
          <p className="text-[14px] mb-6" style={{ color: MUTED }}>Set up your security workspace in under 2 minutes.</p>

          <div className="flex flex-col gap-4">
            <FieldInput label="Organization Name" placeholder="Acme Corp" value={form.org} onChange={set("org")} />
            <FieldInput label="Admin Full Name" placeholder="Jane Smith" value={form.name} onChange={set("name")} />
            <FieldInput
              label="Work Email"
              type="email"
              placeholder="jane@acme.com"
              value={form.email}
              onChange={(v) => { set("email")(v); setEmailError(null); }}
              error={emailError}
            />
            <FieldInput
              label="Password"
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              value={form.pw}
              onChange={set("pw")}
              right={
                <button onClick={() => setShowPw(s => !s)} style={{ color: MUTED }} className="cursor-pointer">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <div className="flex items-start gap-3 mt-1">
              <button
                onClick={() => setAgreed(a => !a)}
                className="w-4 h-4 mt-0.5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer"
                style={{ backgroundColor: agreed ? P : "white", borderColor: agreed ? P : BORDER }}
              >
                {agreed && <Check className="w-2.5 h-2.5 text-white" />}
              </button>
              <p className="text-[13px]" style={{ color: MUTED }}>
                {"I agree to the "}
                <span className="cursor-pointer hover:opacity-75" style={{ color: STORM }}>Terms of Service</span>
                {" and "}
                <span className="cursor-pointer hover:opacity-75" style={{ color: STORM }}>Privacy Policy</span>
              </p>
            </div>

            <div className="mt-1">
              <PrimaryBtn onClick={submit} disabled={!agreed} loading={loading}>Create Account</PrimaryBtn>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t text-center" style={{ borderColor: BORDER }}>
            <p className="text-[13px]" style={{ color: MUTED }}>
              Already have an account?{" "}
              <button onClick={() => router.push('/login')} className="hover:opacity-75 cursor-pointer font-semibold" style={{ color: STORM }}>Log in</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
