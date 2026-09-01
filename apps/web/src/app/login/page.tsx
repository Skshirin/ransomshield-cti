'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Lock } from 'lucide-react'
import { useApp } from '@/lib/context'
import { P, STORM, BG, TEXT, MUTED, BORDER, FieldInput, PrimaryBtn } from '@/components/ui'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useApp()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!email || !pw) { setError(true); return; }
    setError(false)
    setErrorMessage(null)
    setLoading(true)
    try {
      await login(email, pw)
      router.push('/dashboard')
    } catch (err: any) {
      setError(true)
      setErrorMessage(err?.message || "Invalid email or password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG }}>
      <div className="w-full max-w-[420px]">
        <div className="bg-white rounded-2xl border p-8 shadow-sm" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: P }}>
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-[20px] font-bold tracking-tight" style={{ color: TEXT }}>SentinelIQ</span>
          </div>

          <div className="flex flex-col gap-4">
            <FieldInput
              label="Work Email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={setEmail}
              error={error && !email ? "Email is required." : error && email ? "Invalid email or password." : null}
            />
            <div className="flex flex-col gap-1">
              <FieldInput
                label="Password"
                type="password"
                placeholder="••••••••"
                value={pw}
                onChange={setPw}
                error={error && !pw ? "Password is required." : null}
              />
              <div className="flex justify-end">
                <button
                  onClick={() => router.push('/forgot-password')}
                  className="text-[13px] hover:opacity-75 transition-opacity cursor-pointer"
                  style={{ color: STORM }}
                >
                  Forgot password?
                </button>
              </div>
            </div>
            <div className="mt-1">
              <PrimaryBtn onClick={submit} loading={loading}>Log In</PrimaryBtn>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t text-center" style={{ borderColor: BORDER }}>
            <p className="text-[13px]" style={{ color: MUTED }}>
              {"Don't have an account? "}
              <button onClick={() => router.push('/register')} className="hover:opacity-75 cursor-pointer font-semibold" style={{ color: STORM }}>Create one</button>
            </p>
          </div>
        </div>

        <p className="text-center mt-5 text-[11px] flex items-center justify-center gap-1" style={{ color: MUTED }}>
          <Lock className="w-3 h-3 opacity-60" />
          Enterprise-grade security · SSO available · SOC 2 Type II
        </p>
      </div>
    </div>
  )
}
