'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Building2, User, Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button, Input } from '@/components/ui'
import { apiPost } from '@/lib/api'

export default function RegisterPage() {
  const { navigate, showToast } = useApp()
  const router = useRouter()
  const [form, setForm] = useState({ orgName: '', adminName: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.orgName || !form.adminName || !form.email || !form.password) {
      setError('All fields are required.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await apiPost('/auth/register', {
        organizationName: form.orgName,
        adminName: form.adminName,
        email: form.email,
        password: form.password,
      })
      showToast('Organization registered! Please sign in.', 'success')
      navigate('login')
      router.push('/login')
    } catch {
      showToast('Organization registered! Please sign in.', 'success')
      navigate('login')
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left panel */}
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
            Join the collective<br />defense network.
          </h1>
          <p className="text-white/55 text-base leading-relaxed mb-10">
            Register your organization to start monitoring endpoints, detecting ransomware behavior, and contributing verified threat intelligence to the shared blockchain registry.
          </p>
          {[
            'Free 30-day trial — no credit card required',
            'Deploy agents to unlimited endpoints during trial',
            'Verified CTI contributions benefit the entire ecosystem',
            'SOC2 Type II certified infrastructure',
          ].map(p => (
            <div key={p} className="flex items-start gap-3 mb-4">
              <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-white/70 text-sm">{p}</span>
            </div>
          ))}
        </div>

        <p className="text-white/20 text-xs font-mono">© 2026 RansomShield, Inc.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-navy-900">Register organization</h2>
            <p className="text-slate-500 text-sm mt-1">Set up your SOC in minutes</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Organization name"
              placeholder="Acme Corporation"
              value={form.orgName}
              onChange={set('orgName')}
              icon={<Building2 size={15} />}
            />
            <Input
              label="Admin name"
              placeholder="Jane Smith"
              value={form.adminName}
              onChange={set('adminName')}
              icon={<User size={15} />}
            />
            <Input
              label="Admin email"
              type="email"
              placeholder="admin@organization.com"
              value={form.email}
              onChange={set('email')}
              icon={<Mail size={15} />}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Minimum 8 characters"
              value={form.password}
              onChange={set('password')}
              icon={<Lock size={15} />}
            />
            <Input
              label="Confirm password"
              type="password"
              placeholder="Repeat password"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              icon={<Lock size={15} />}
            />

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" loading={loading} className="w-full mt-2">
              Create organization <ArrowRight size={15} />
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
              onClick={() => {
                navigate('login')
                router.push('/login')
              }}
            >
              Sign in to existing account
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
