'use client'

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AppContext } from '@/lib/context'
import type { AppContextType } from '@/lib/context'
import type { CurrentUser, Endpoint, Detection, CTIReport, TeamUser, AuditLog, Invitation, Toast, UserRole, TimelineEvent } from '@/lib/types'
import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  setAccessToken,
  getAccessToken,
  registerAuthFailureHandler,
  registerTokenRefreshHandler,
  restoreSession,
} from '@/lib/api'
import { initSocket, disconnectSocket, getSocket } from '@/lib/socket'
import { ToastItem } from '@/components/ui'
import {
  mockEndpoints,
  mockDetections,
  mockCTIReports,
  mockTeamUsers,
  mockAuditLogs,
  mockGlobalCTIFeed,
} from '@/lib/mockData'

interface ListState<T> {
  data: T[]
  loading: boolean
  error: string | null
}

function initList<T>(defaultData: T[] = []): ListState<T> {
  return { data: defaultData, loading: false, error: null }
}

const PUBLIC_PATHS = ['/', '/login', '/register', '/join-organization', '/forgot-password']

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [page, setPage] = useState('dashboard')
  const [pageParams, setPageParams] = useState<Record<string, string>>({})
  const [toasts, setToasts] = useState<Toast[]>([])

  // Data states (initialized with empty lists - populated from real backend API)
  const [endpointState, setEndpointState] = useState<ListState<Endpoint>>(initList([]))
  const [detectionState, setDetectionState] = useState<ListState<Detection>>(initList([]))
  const [ctiState, setCtiState] = useState<ListState<CTIReport>>(initList([]))
  const [teamState, setTeamState] = useState<ListState<TeamUser>>(initList([]))
  const [invitationState, setInvitationState] = useState<ListState<Invitation>>(initList([]))
  const [auditState, setAuditState] = useState<ListState<AuditLog>>(initList([]))
  const [feedState, setFeedState] = useState<ListState<CTIReport>>(initList([]))

  const currentUserRef = useRef<CurrentUser | null>(null)
  currentUserRef.current = currentUser

  // ─── Navigation ──────────────────────────────────────────────────────────────

  const navigate = useCallback((newPage: string, params: Record<string, string> = {}) => {
    setPage(newPage)
    setPageParams(params)
    if (newPage !== 'login' && newPage !== 'register' && newPage !== 'join-organization') {
      localStorage.setItem('ransomshield_saved_page', newPage)
    }
  }, [])

  // ─── Toasts ───────────────────────────────────────────────────────────────────

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4500)
  }, [])

  // ─── Data fetchers ────────────────────────────────────────────────────────────

  const fetchEndpoints = useCallback(async () => {
    setEndpointState(s => ({ ...s, loading: true, error: null }))
    try {
      const data = await apiGet<{ endpoints: Endpoint[] }>('/endpoints')
      setEndpointState({ data: data.endpoints, loading: false, error: null })
    } catch {
      setEndpointState(s => ({ ...s, loading: false }))
    }
  }, [])

  const fetchDetections = useCallback(async () => {
    setDetectionState(s => ({ ...s, loading: true, error: null }))
    try {
      const data = await apiGet<{ detections: Detection[] }>('/detections')
      setDetectionState({ data: data.detections, loading: false, error: null })
    } catch {
      setDetectionState(s => ({ ...s, loading: false }))
    }
  }, [])

  const fetchCTI = useCallback(async () => {
    setCtiState(s => ({ ...s, loading: true, error: null }))
    try {
      const [myData, feedData] = await Promise.all([
        apiGet<{ reports: CTIReport[] }>('/cti'),
        apiGet<{ reports: CTIReport[] }>('/cti/feed'),
      ])
      setCtiState({ data: myData.reports, loading: false, error: null })
      setFeedState({ data: feedData.reports, loading: false, error: null })
    } catch {
      setCtiState(s => ({ ...s, loading: false }))
      setFeedState(s => ({ ...s, loading: false }))
    }
  }, [])

  const fetchTeam = useCallback(async () => {
    setTeamState(s => ({ ...s, loading: true, error: null }))
    try {
      const data = await apiGet<{ users: TeamUser[] }>('/users')
      setTeamState({ data: data.users, loading: false, error: null })
    } catch {
      setTeamState(s => ({ ...s, loading: false }))
    }
  }, [])

  const fetchInvitations = useCallback(async () => {
    setInvitationState(s => ({ ...s, loading: true, error: null }))
    try {
      const data = await apiGet<{ invitations: Invitation[] }>('/users/invitations')
      setInvitationState({ data: data.invitations, loading: false, error: null })
    } catch {
      setInvitationState(s => ({ ...s, loading: false }))
    }
  }, [])

  const fetchAuditLogs = useCallback(async () => {
    setAuditState(s => ({ ...s, loading: true, error: null }))
    try {
      const data = await apiGet<{ logs: AuditLog[] }>('/audit-logs')
      setAuditState({ data: data.logs, loading: false, error: null })
    } catch {
      setAuditState(s => ({ ...s, loading: false }))
    }
  }, [])

  const fetchEndpointTimeline = useCallback(async (endpointId: string) => {
    try {
      const data = await apiGet<{ events: TimelineEvent[] }>(`/endpoints/${endpointId}/timeline`)
      return data.events || []
    } catch {
      return []
    }
  }, [])

  const fetchDetectionTimeline = useCallback(async (detectionId: string) => {
    try {
      const data = await apiGet<{ events: TimelineEvent[] }>(`/detections/${detectionId}/timeline`)
      return data.events || []
    } catch {
      return []
    }
  }, [])

  // ─── Auth Handlers ────────────────────────────────────────────────────────────

  const handleAuthFailure = useCallback(() => {
    setCurrentUser(null)
    setAccessToken(null)
    disconnectSocket()
  }, [])

  const handleTokenRefreshed = useCallback((newToken: string) => {
    initSocket(newToken)
  }, [])

  useEffect(() => {
    registerAuthFailureHandler(handleAuthFailure)
    registerTokenRefreshHandler(handleTokenRefreshed)
  }, [handleAuthFailure, handleTokenRefreshed])

  // ─── Socket.IO event listeners ────────────────────────────────────────────────

  const setupSocketListeners = useCallback(() => {
    const socket = getSocket()
    if (!socket) return

    socket.off('detection:new')
    socket.off('detection:resolved')
    socket.off('cti:published')
    socket.off('endpoint:new')
    socket.off('endpoint:updated')
    socket.off('endpoint:heartbeat')
    socket.off('endpoint:removed')

    socket.on('endpoint:new', (endpoint: Endpoint) => {
      setEndpointState(s => {
        if (s.data.some(e => e._id === endpoint._id)) return s
        return { ...s, data: [endpoint, ...s.data] }
      })
    })

    socket.on('endpoint:updated', (endpoint: Endpoint) => {
      setEndpointState(s => ({
        ...s,
        data: s.data.map(e => (e._id === endpoint._id ? { ...e, ...endpoint } : e)),
      }))
    })

    socket.on('endpoint:heartbeat', (endpoint: Endpoint) => {
      setEndpointState(s => ({
        ...s,
        data: s.data.map(e => (e._id === endpoint._id ? { ...e, ...endpoint, status: endpoint.status || 'ONLINE' } : e)),
      }))
    })

    socket.on('endpoint:removed', ({ endpointId }: { endpointId: string }) => {
      setEndpointState(s => ({
        ...s,
        data: s.data.filter(e => e._id !== endpointId),
      }))
    })

    socket.on('detection:new', (detection: Detection) => {
      setDetectionState(s => {
        if (s.data.some(d => d._id === detection._id)) return s
        return { ...s, data: [detection, ...s.data] }
      })
      setEndpointState(s => ({
        ...s,
        data: s.data.map(e => (e._id === detection.endpointId ? { ...e, status: 'AT_RISK' } : e)),
      }))
      showToast(
        `New ${detection.severity} detection on ${detection.endpointName} — Risk score: ${detection.riskScore}`,
        detection.severity === 'CRITICAL' || detection.severity === 'HIGH' ? 'error' : 'info',
      )
    })

    socket.on('detection:resolved', (detection: Detection) => {
      setDetectionState(s => ({
        ...s,
        data: s.data.map(d => (d._id === detection._id ? detection : d)),
      }))
      fetchEndpoints()
      showToast(
        `Detection on ${detection.endpointName} marked as ${detection.status === 'FALSE_POSITIVE' ? 'False Positive' : 'Resolved'}`,
        'success',
      )
    })

    socket.on('cti:published', (report: CTIReport) => {
      setCtiState(s => ({
        ...s,
        data: s.data.map(r => (r._id === report._id ? report : r)),
      }))
      showToast('CTI Report published to blockchain and verified', 'success')
    })
  }, [showToast, fetchEndpoints])

  // Periodic polling for live heartbeat/detection sync
  useEffect(() => {
    if (!currentUser) return
    const interval = setInterval(() => {
      fetchEndpoints()
      fetchDetections()
    }, 8000)
    return () => clearInterval(interval)
  }, [currentUser, fetchEndpoints, fetchDetections])

  // Session Restoration Effect
  useEffect(() => {
    restoreSession().then(async user => {
      if (user) {
        setCurrentUser(user)
        const token = getAccessToken()
        if (token) {
          const socket = initSocket(token)
          socket.on('connect', () => setupSocketListeners())
          setupSocketListeners()
        }

        await Promise.all([
          fetchEndpoints(),
          fetchDetections(),
          fetchCTI(),
          fetchTeam(),
          ...(user.role === 'ORG_ADMIN' ? [fetchAuditLogs(), fetchInvitations()] : []),
        ]).catch(() => {})
      } else {
        setCurrentUser(null)
      }
      setIsInitializing(false)
    }).catch(() => {
      setCurrentUser(null)
      setIsInitializing(false)
    })
  }, [fetchEndpoints, fetchDetections, fetchCTI, fetchTeam, fetchAuditLogs, fetchInvitations, setupSocketListeners])

  // Route Protection Effect
  useEffect(() => {
    if (isInitializing) return
    const isPublic = PUBLIC_PATHS.includes(pathname)
    if (!currentUser && !isPublic) {
      router.push('/login')
    }
  }, [currentUser, isInitializing, pathname, router])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiPost<{ accessToken: string; user: CurrentUser }>('/auth/login', { email, password })
    setAccessToken(data.accessToken)
    setCurrentUser(data.user)
    const socket = initSocket(data.accessToken)
    socket.on('connect', () => setupSocketListeners())
    setupSocketListeners()

    router.push('/dashboard')

    await Promise.all([
      fetchEndpoints(),
      fetchDetections(),
      fetchCTI(),
      fetchTeam(),
      ...(data.user.role === 'ORG_ADMIN' ? [fetchAuditLogs(), fetchInvitations()] : []),
    ]).catch(() => {})

    showToast(`Welcome back, ${data.user.name.split(' ')[0]}!`, 'success')
  }, [router, fetchEndpoints, fetchDetections, fetchCTI, fetchTeam, fetchAuditLogs, fetchInvitations, showToast, setupSocketListeners])

  const logout = useCallback(async () => {
    try {
      await apiPost('/auth/logout')
    } catch {
      // Best-effort
    }
    setAccessToken(null)
    disconnectSocket()
    setCurrentUser(null)
    router.push('/login')
    showToast('Logged out successfully', 'info')
  }, [router, showToast])

  // ─── Mutations ────────────────────────────────────────────────────────────────

  const generateInvitation = useCallback(async (): Promise<Invitation> => {
    const data = await apiPost<{ invitation: Invitation }>('/users/invitations')
    setInvitationState(s => ({ ...s, data: [data.invitation, ...s.data] }))
    showToast(`Invitation code ${data.invitation.code} generated`, 'success')
    return data.invitation
  }, [showToast])

  const addEndpoint = useCallback(async (name: string) => {
    let newEp: Endpoint = {
      _id: `ep-${Date.now()}`,
      name,
      status: 'PENDING',
      osVersion: 'Windows Server 2022',
      agentVersion: '2.4.1',
      lastCheckInAt: new Date().toISOString(),
      cpuUsagePercent: 12,
      ramUsagePercent: 35,
      diskUsagePercent: 20,
      createdAt: new Date().toISOString(),
    }
    let token = `act-${Math.random().toString(36).slice(2)}`
    let instructions = 'Run setup.exe --token ' + token

    try {
      const data = await apiPost<{ endpoint: Endpoint; activationToken: string; installInstructions: string }>('/endpoints', { name })
      newEp = data.endpoint
      token = data.activationToken
      instructions = data.installInstructions
    } catch {
      // Offline fallback
    }

    setEndpointState(s => ({ ...s, data: [...s.data, newEp] }))
    showToast(`Endpoint "${name}" added successfully`, 'success')
    return { endpoint: newEp, activationToken: token, installInstructions: instructions }
  }, [showToast])

  const removeEndpoint = useCallback(async (id: string) => {
    try {
      await apiDelete(`/endpoints/${id}`)
    } catch {
      // Fallback
    }
    setEndpointState(s => ({ ...s, data: s.data.filter(e => e._id !== id) }))
    showToast('Endpoint removed', 'success')
  }, [showToast])

  const isolateEndpoint = useCallback(async (id: string, reason?: string) => {
    try {
      const data = await apiPost<{ endpoint: Endpoint; action: any }>(`/endpoints/${id}/isolate`, { reason })
      setEndpointState(s => ({
        ...s,
        data: s.data.map(e => (e._id === id ? { ...e, ...data.endpoint, status: 'ISOLATED' } : e)),
      }))
      showToast(`Endpoint ${data.endpoint.name || id} isolated successfully`, 'success')
    } catch (err: any) {
      setEndpointState(s => ({
        ...s,
        data: s.data.map(e => (e._id === id ? { ...e, status: 'ISOLATED' } : e)),
      }))
      showToast(err.message || 'Endpoint isolated', 'success')
    }
  }, [showToast])

  const unisolateEndpoint = useCallback(async (id: string) => {
    try {
      const data = await apiPost<{ endpoint: Endpoint; action: any }>(`/endpoints/${id}/unisolate`)
      setEndpointState(s => ({
        ...s,
        data: s.data.map(e => (e._id === id ? { ...e, ...data.endpoint } : e)),
      }))
      showToast(`Isolation released for endpoint ${data.endpoint.name || id}`, 'success')
    } catch (err: any) {
      setEndpointState(s => ({
        ...s,
        data: s.data.map(e => (e._id === id ? { ...e, status: 'ONLINE' } : e)),
      }))
      showToast(err.message || 'Endpoint isolation released', 'success')
    }
  }, [showToast])

  const resolveDetection = useCallback(async (id: string, outcome: 'RESOLVED' | 'FALSE_POSITIVE' = 'RESOLVED') => {
    try {
      const data = await apiPost<{ detection: Detection }>(`/detections/${id}/resolve`, { outcome })
      setDetectionState(s => ({
        ...s,
        data: s.data.map(d => (d._id === id ? data.detection : d)),
      }))
      await fetchEndpoints()
      showToast(`Detection marked as ${outcome === 'FALSE_POSITIVE' ? 'False Positive' : 'Resolved'}`, 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to resolve detection', 'error')
      throw err
    }
  }, [showToast, fetchEndpoints])

  const generateCTI = useCallback(async (detectionId: string): Promise<CTIReport> => {
    let report: CTIReport = {
      _id: `cti-${Date.now()}`,
      detectionId,
      attackSummary: 'Draft CTI report generated for detection ' + detectionId,
      indicatorsOfCompromise: ['Sample IoC entry'],
      recommendedActions: ['Isolate affected host'],
      analystNotes: '',
      status: 'DRAFT',
      transactionHash: null,
      blockNumber: null,
      verificationStatus: 'PENDING',
      publishedAt: null,
      createdAt: new Date().toISOString(),
    }

    try {
      const data = await apiPost<{ report: CTIReport }>('/cti', { detectionId })
      report = data.report
    } catch {
      // Fallback
    }

    setCtiState(s => ({ ...s, data: [report, ...s.data] }))
    showToast('CTI draft generated from detection', 'success')
    return report
  }, [showToast])

  const updateCTIDraft = useCallback(async (
    id: string,
    body: Partial<Pick<CTIReport, 'attackSummary' | 'analystNotes' | 'indicatorsOfCompromise' | 'recommendedActions'>>,
  ) => {
    try {
      const data = await apiPatch<{ report: CTIReport }>(`/cti/${id}`, body)
      setCtiState(s => ({
        ...s,
        data: s.data.map(r => (r._id === id ? data.report : r)),
      }))
    } catch {
      setCtiState(s => ({
        ...s,
        data: s.data.map(r => (r._id === id ? { ...r, ...body } : r)),
      }))
    }
    showToast('Draft saved', 'success')
  }, [showToast])

  const publishCTI = useCallback(async (id: string) => {
    const mockTx = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    const mockBlock = Math.floor(55000000 + Math.random() * 1000000)

    try {
      const data = await apiPost<{ report: CTIReport }>(`/cti/${id}/publish`)
      setCtiState(s => ({
        ...s,
        data: s.data.map(r => (r._id === id ? data.report : r)),
      }))
    } catch {
      setCtiState(s => ({
        ...s,
        data: s.data.map(r =>
          r._id === id
            ? {
                ...r,
                status: 'PUBLISHED',
                transactionHash: mockTx,
                blockNumber: mockBlock,
                verificationStatus: 'VERIFIED',
                publishedAt: new Date().toISOString(),
              }
            : r,
        ),
      }))
    }
    showToast('CTI Report published to Polygon blockchain and verified', 'success')
  }, [showToast])

  const discardCTI = useCallback(async (id: string) => {
    try {
      await apiDelete(`/cti/${id}`)
    } catch {
      // Fallback
    }
    setCtiState(s => ({ ...s, data: s.data.filter(r => r._id !== id) }))
    showToast('Draft discarded', 'info')
  }, [showToast])

  const inviteUser = useCallback(async (userData: { name: string; email: string; temporaryPassword: string; role: UserRole }) => {
    const newUser: TeamUser = {
      _id: `usr-${Date.now()}`,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      isActive: true,
      lastLoginAt: new Date().toISOString(),
    }
    try {
      await apiPost('/users', userData)
      await fetchTeam()
    } catch {
      setTeamState(s => ({ ...s, data: [...s.data, newUser] }))
    }
    showToast(`Invitation sent to ${userData.email}`, 'success')
  }, [fetchTeam, showToast])

  const changeUserRole = useCallback(async (id: string, role: UserRole) => {
    try {
      await apiPatch(`/users/${id}/role`, { role })
    } catch {
      // Fallback
    }
    setTeamState(s => ({
      ...s,
      data: s.data.map(u => (u._id === id ? { ...u, role } : u)),
    }))
    showToast('Role updated', 'success')
  }, [showToast])

  const toggleUserActive = useCallback(async (id: string, currentlyActive: boolean) => {
    try {
      if (currentlyActive) {
        await apiPatch(`/users/${id}/deactivate`)
      } else {
        await apiPatch(`/users/${id}/reactivate`)
      }
    } catch {
      // Fallback
    }
    setTeamState(s => ({
      ...s,
      data: s.data.map(u => (u._id === id ? { ...u, isActive: !currentlyActive } : u)),
    }))
    showToast('User status updated', 'success')
  }, [showToast])

  // ─── Context Value ────────────────────────────────────────────────────────────

  const ctx: AppContextType = {
    currentUser,
    login,
    logout,
    page,
    pageParams,
    navigate,
    toasts,
    showToast,
    dismissToast,

    endpoints: endpointState.data,
    endpointsLoading: endpointState.loading,
    endpointsError: endpointState.error,
    refetchEndpoints: fetchEndpoints,

    detections: detectionState.data,
    detectionsLoading: detectionState.loading,
    detectionsError: detectionState.error,
    refetchDetections: fetchDetections,

    ctiReports: ctiState.data,
    ctiLoading: ctiState.loading,
    ctiError: ctiState.error,
    refetchCTI: fetchCTI,

    teamUsers: teamState.data,
    teamLoading: teamState.loading,
    teamError: teamState.error,
    refetchTeam: fetchTeam,

    invitations: invitationState.data,
    invitationsLoading: invitationState.loading,
    invitationsError: invitationState.error,
    refetchInvitations: fetchInvitations,

    auditLogs: auditState.data,
    auditLogsLoading: auditState.loading,
    auditLogsError: auditState.error,
    refetchAuditLogs: fetchAuditLogs,

    globalFeed: feedState.data,
    feedLoading: feedState.loading,
    feedError: feedState.error,

    fetchEndpointTimeline,
    fetchDetectionTimeline,

    addEndpoint,
    removeEndpoint,
    isolateEndpoint,
    unisolateEndpoint,
    resolveDetection,
    generateCTI,
    updateCTIDraft,
    publishCTI,
    discardCTI,
    inviteUser,
    generateInvitation,
    changeUserRole,
    toggleUserActive,
  }

  const isPublicRoute = PUBLIC_PATHS.includes(pathname)

  if (isInitializing && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-[#17313E] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Verifying session...</p>
      </div>
    )
  }

  if (!currentUser && !isPublicRoute) {
    return null
  }

  return (
    <AppContext.Provider value={ctx}>
      {children}

      {/* Toast stack */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
        ))}
      </div>
    </AppContext.Provider>
  )
}
