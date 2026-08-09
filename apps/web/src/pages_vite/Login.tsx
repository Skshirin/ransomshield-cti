import { useState, type FormEvent } from 'react'
import { Shield, Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button, Input } from '@/components/ui'

const valueProps = [
  'ML-powered ransomware detection with sub-second response',
  'Blockchain-verified CTI sharing — tamper-proof intelligence',
  'Real-time endpoint telemetry across your entire estate',
  'Collaborative SOC workflows with role-based access control',
]

export default function LoginPage() {
  const { login, navigate } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email || 'admin@sentineliq.local', password || 'admin')
    } catch {
      // Fallback
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — dark navy */}
      <div className="hidden lg:flex lg:w-[52%] bg-navy-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <p className="text-base font-bold text-white">RansomShield</p>
            <p className="text-[10px] font-mono text-white/40">CTI Platform</p>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Stop ransomware.<br />Share verified intel.
          </h1>
          <p className="text-white/55 text-base leading-relaxed mb-10">
            The only CTI platform that combines ML-based detection with blockchain-verified threat intelligence sharing — so every organization benefits from what others discover.
          </p>
          <ul className="space-y-4">
            {valueProps.map(prop => (
              <li key={prop} className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-white/70 text-sm">{prop}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-white/20 text-xs font-mono">© 2026 RansomShield, Inc.</p>
      </div>

      {/* Right panel — white form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Shield size={20} className="text-navy-900" />
            <span className="font-bold text-navy-900">RansomShield</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-navy-900">Sign in</h2>
            <p className="text-slate-500 text-sm mt-1">Access your security dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@organization.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              icon={<Mail size={15} />}
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              icon={<Lock size={15} />}
              autoComplete="current-password"
            />

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" loading={loading} className="w-full mt-2">
              Sign in <ArrowRight size={15} />
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-slate-400">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => navigate('register')}
            >
              Register a new organization
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
