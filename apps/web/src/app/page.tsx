'use client'

import { useRouter } from 'next/navigation'
import { Shield, Plus, Globe, ChevronRight } from 'lucide-react'
import { P, STORM, BG, TEXT, MUTED, BORDER } from '@/components/ui'

export default function Home() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: BG }}>
      {/* Wordmark */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: P }}
        >
          <Shield className="w-5 h-5 text-white" />
        </div>
        <span className="text-[26px] font-bold tracking-tight" style={{ color: TEXT }}>SentinelIQ</span>
      </div>
      <p className="text-[14px] mb-12" style={{ color: MUTED }}>Cyber Threat Intelligence Platform</p>

      {/* Option cards */}
      <div className="w-full max-w-[480px] flex flex-col gap-3">
        {/* Create Organization */}
        <div
          className="bg-white border rounded-2xl p-6 shadow-sm flex items-start gap-5 group cursor-pointer hover:shadow-md transition-all"
          style={{ borderColor: BORDER }}
          onClick={() => router.push('/register')}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: "rgba(23,49,62,0.07)" }}
          >
            <Plus className="w-5 h-5" style={{ color: P }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-bold mb-1" style={{ color: TEXT }}>Create Organization</h2>
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: MUTED }}>
              Set up a new SentinelIQ organization and become its administrator.
            </p>
            <button
              className="flex items-center gap-1.5 text-[13px] font-semibold transition-opacity group-hover:opacity-80 cursor-pointer"
              style={{ color: P }}
            >
              Create Organization <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Join Organization */}
        <div
          className="bg-white border rounded-2xl p-6 shadow-sm flex items-start gap-5 group cursor-pointer hover:shadow-md transition-all"
          style={{ borderColor: BORDER }}
          onClick={() => router.push('/join-organization')}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: "rgba(65,94,114,0.08)" }}
          >
            <Globe className="w-5 h-5" style={{ color: STORM }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-bold mb-1" style={{ color: TEXT }}>Join Organization</h2>
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: MUTED }}>
              Join an existing SentinelIQ organization using an invitation.
            </p>
            <button
              className="flex items-center gap-1.5 text-[13px] font-semibold transition-opacity group-hover:opacity-80 cursor-pointer"
              style={{ color: STORM }}
            >
              Join Organization <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sign in link */}
      <p className="mt-8 text-[13px]" style={{ color: MUTED }}>
        Already have an account?{" "}
        <button
          onClick={() => router.push('/login')}
          className="hover:opacity-75 transition-opacity cursor-pointer font-semibold"
          style={{ color: STORM }}
        >
          Sign in
        </button>
      </p>
    </div>
  )
}
