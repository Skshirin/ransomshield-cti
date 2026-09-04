import { createContext, useContext } from 'react'
import type { CurrentUser, Endpoint, Detection, CTIReport, TeamUser, AuditLog, Invitation, Toast, UserRole, TimelineEvent } from './types'

export interface AppContextType {
  // Auth
  currentUser: CurrentUser | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void

  // Navigation
  page: string
  pageParams: Record<string, string>
  navigate: (page: string, params?: Record<string, string>) => void

  // Toasts
  toasts: Toast[]
  showToast: (message: string, type?: Toast['type']) => void
  dismissToast: (id: string) => void

  // Data lists + loading/error/refetch
  endpoints: Endpoint[]
  endpointsLoading: boolean
  endpointsError: string | null
  refetchEndpoints: () => void

  detections: Detection[]
  detectionsLoading: boolean
  detectionsError: string | null
  refetchDetections: () => void

  ctiReports: CTIReport[]
  ctiLoading: boolean
  ctiError: string | null
  refetchCTI: () => void

  teamUsers: TeamUser[]
  teamLoading: boolean
  teamError: string | null
  refetchTeam: () => void

  invitations: Invitation[]
  invitationsLoading: boolean
  invitationsError: string | null
  refetchInvitations: () => void

  auditLogs: AuditLog[]
  auditLogsLoading: boolean
  auditLogsError: string | null
  refetchAuditLogs: () => void

  globalFeed: CTIReport[]
  feedLoading: boolean
  feedError: string | null

  // Timeline
  fetchEndpointTimeline: (endpointId: string) => Promise<TimelineEvent[]>
  fetchDetectionTimeline: (detectionId: string) => Promise<TimelineEvent[]>

  // Mutations
  addEndpoint: (name: string) => Promise<{ endpoint: Endpoint; activationToken: string; installInstructions: string }>
  removeEndpoint: (id: string) => Promise<void>
  isolateEndpoint: (id: string, reason?: string) => Promise<void>
  unisolateEndpoint: (id: string) => Promise<void>
  resolveDetection: (id: string, outcome?: 'RESOLVED' | 'FALSE_POSITIVE') => Promise<void>
  generateCTI: (detectionId: string) => Promise<CTIReport>
  updateCTIDraft: (id: string, data: Partial<Pick<CTIReport, 'attackSummary' | 'analystNotes' | 'indicatorsOfCompromise' | 'recommendedActions'>>) => Promise<void>
  publishCTI: (id: string) => Promise<void>
  discardCTI: (id: string) => Promise<void>
  inviteUser: (data: { name: string; email: string; temporaryPassword: string; role: UserRole }) => Promise<void>
  generateInvitation: () => Promise<Invitation>
  changeUserRole: (id: string, role: UserRole) => Promise<void>
  toggleUserActive: (id: string, currentlyActive: boolean) => Promise<void>
}

export const AppContext = createContext<AppContextType | null>(null)

export function useApp(): AppContextType {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppContext.Provider')
  return ctx
}
