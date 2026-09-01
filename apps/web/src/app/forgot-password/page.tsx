'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Mail, AlertCircle } from 'lucide-react'
import { STORM, BG, TEXT, MUTED, BORDER, RED, AMBER, GREEN, FieldInput, PrimaryBtn } from '@/components/ui'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [email, setEmail] = useState("")
  const [pw, setPw] = useState("")
  const [pw2, setPw2] = useState("")
  const [strength, setStrength] = useState(0)
  const [loading, setLoading] = useState(false)

  const calcStrength = (v: string) => {
    let s = 0;
    if (v.length >= 8) s++;
    if (/[A-Z]/.test(v)) s++;
    if (/[0-9]/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    return s;
  };

  const strengthColors = ["#E5E7EB", RED, AMBER, AMBER, GREEN];
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

  const doSend = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep(2); }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG }}>
      <div className="w-full max-w-[420px]">
        <button
          onClick={() => step === 1 ? router.push('/login') : setStep(s => (s - 1) as 1 | 2 | 3)}
          className="flex items-center gap-1.5 text-[13px] mb-6 hover:opacity-70 transition-opacity cursor-pointer"
          style={{ color: MUTED }}
        >
          <ChevronLeft className="w-4 h-4" /> Back to login
        </button>

        <div className="bg-white rounded-2xl border p-8 shadow-sm" style={{ borderColor: BORDER }}>
          {step === 1 && (
            <>
              <h2 className="text-[20px] font-bold mb-1" style={{ color: TEXT }}>Reset your password</h2>
              <p className="text-[14px] mb-6" style={{ color: MUTED }}>{"Enter your email and we'll send you a reset link."}</p>
              <div className="flex flex-col gap-4">
                <FieldInput label="Work Email" type="email" placeholder="you@company.com" value={email} onChange={setEmail} />
                <PrimaryBtn onClick={doSend} loading={loading}>Send Reset Link</PrimaryBtn>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ backgroundColor: "rgba(65,94,114,0.1)" }}>
                <Mail className="w-7 h-7" style={{ color: STORM }} />
              </div>
              <h2 className="text-[20px] font-bold mb-2" style={{ color: TEXT }}>Check your inbox</h2>
              <p className="text-[14px] mb-4" style={{ color: MUTED }}>
                {"We've sent a reset link to "}
                <strong style={{ color: TEXT }}>{email || "your@email.com"}</strong>
              </p>
              <button className="text-[13px] hover:opacity-70 cursor-pointer font-medium" style={{ color: MUTED }}>{"Didn't get it? Resend"}</button>
              <div className="mt-6">
                <PrimaryBtn onClick={() => setStep(3)}>Set New Password</PrimaryBtn>
              </div>
            </div>
          )}

          {step === 3 && (
            <>
              <div className="mb-4 px-4 py-3 rounded-xl text-[13px] flex items-center gap-2"
                style={{ backgroundColor: "rgba(245,158,11,0.08)", color: "#92400E" }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Link expired — request a new one
              </div>
              <h2 className="text-[20px] font-bold mb-1" style={{ color: TEXT }}>Set a new password</h2>
              <p className="text-[14px] mb-6" style={{ color: MUTED }}>Choose a strong password for your account.</p>
              <div className="flex flex-col gap-4">
                <div>
                  <FieldInput
                    label="New Password"
                    type="password"
                    placeholder="••••••••"
                    value={pw}
                    onChange={(v) => { setPw(v); setStrength(calcStrength(v)); }}
                  />
                  {pw.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(i => (
                          <div
                            key={i}
                            className="h-1 flex-1 rounded-full transition-colors"
                            style={{ backgroundColor: i <= strength ? strengthColors[strength] : BORDER }}
                          />
                        ))}
                      </div>
                      <p className="text-[11px] mt-1" style={{ color: MUTED }}>{strengthLabels[strength]}</p>
                    </div>
                  )}
                </div>
                <FieldInput
                  label="Confirm Password"
                  type="password"
                  placeholder="••••••••"
                  value={pw2}
                  onChange={setPw2}
                  error={pw2.length > 0 && pw !== pw2 ? "Passwords do not match." : null}
                />
                <PrimaryBtn onClick={() => router.push('/login')}>Update Password</PrimaryBtn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
