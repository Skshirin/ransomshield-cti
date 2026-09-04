export type EndpointStatus = 'PENDING' | 'ONLINE' | 'OFFLINE' | 'AT_RISK' | 'ISOLATED'
export type DetectionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type DetectionStatus = 'NEW' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE'
export type CTIStatus = 'DRAFT' | 'PUBLISHED' | 'FAILED'
export type VerificationStatus = 'VERIFIED' | 'PENDING' | 'FAILED'
export type UserRole = 'ORG_ADMIN' | 'SECURITY_ANALYST' | 'SUPER_ADMIN'

export type TimelineEventType =
  | 'DETECTION_CREATED'
  | 'DETECTION_UPDATED'
  | 'DETECTION_RESOLVED'
  | 'DETECTION_FALSE_POSITIVE'
  | 'ISOLATION_REQUESTED'
  | 'ISOLATION_SENT'
  | 'ISOLATION_ACKNOWLEDGED'
  | 'ISOLATION_COMPLETED'
  | 'ISOLATION_FAILED'
  | 'UNISOLATION_REQUESTED'
  | 'UNISOLATION_SENT'
  | 'UNISOLATION_ACKNOWLEDGED'
  | 'UNISOLATION_COMPLETED'
  | 'UNISOLATION_FAILED'
  | 'ENDPOINT_STATUS_CHANGED'
  | 'POLICY_TRIGGERED'
  | 'HEARTBEAT_STATUS_CHANGED'

export type TimelineActorType =
  | 'USER'
  | 'SECURITY_ANALYST'
  | 'ORG_ADMIN'
  | 'AGENT'
  | 'SYSTEM'
  | 'AUTOMATED_POLICY'

export interface TimelineEvent {
  _id: string
  organizationId: string
  endpointId: string
  endpointName: string
  detectionId?: string
  actionId?: string
  eventType: TimelineEventType
  actorType: TimelineActorType
  actorId?: string
  actorName?: string
  message: string
  metadata?: Record<string, unknown>
  timestamp: string
  createdAt: string
  updatedAt: string
}

export interface EndpointAction {
  _id: string
  organizationId: string
  endpointId: string
  actionType: 'ISOLATE' | 'UNISOLATE'
  status: 'PENDING' | 'SENT' | 'ACKNOWLEDGED' | 'COMPLETED' | 'FAILED'
  reason?: string
  requestedAt: string
  executedAt?: string
  errorMessage?: string
}

export interface Endpoint {
  _id: string
  name: string
  status: EndpointStatus
  osVersion: string
  agentVersion: string
  lastCheckInAt: string
  cpuUsagePercent: number
  ramUsagePercent: number
  diskUsagePercent: number
  createdAt: string
}

export interface Indicator {
  type: string
  description: string
  observedAt: string
}

export interface Detection {
  _id: string
  endpointName: string
  endpointId: string
  riskScore: number
  severity: DetectionSeverity
  status: DetectionStatus
  indicators: Indicator[]
  detectedAt: string
  resolvedAt?: string
  resolvedByUserId?: string
}

export interface CTIReport {
  _id: string
  detectionId: string
  attackSummary: string
  indicatorsOfCompromise: string[]
  recommendedActions: string[]
  analystNotes: string
  status: CTIStatus
  transactionHash: string | null
  blockNumber: number | null
  verificationStatus: VerificationStatus
  publishedAt: string | null
  createdAt: string
}

export interface TeamUser {
  _id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  lastLoginAt: string
}

export interface AuditLog {
  _id: string
  userEmail: string
  action: string
  method: string
  path: string
  statusCode: number
  success: boolean
  ipAddress: string
  createdAt: string
}

export interface CurrentUser {
  id: string
  name: string
  email: string
  role: UserRole
  organizationId: string
}

export interface Invitation {
  _id: string
  code: string
  organizationId: string
  createdBy: { _id?: string; name: string; email: string } | string
  isConsumed: boolean
  consumedBy?: { _id?: string; name: string; email: string } | string
  consumedAt?: string
  createdAt: string
}

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}
