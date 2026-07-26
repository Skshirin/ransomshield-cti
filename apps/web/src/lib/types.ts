export type EndpointStatus = 'PENDING' | 'ONLINE' | 'OFFLINE' | 'AT_RISK'
export type DetectionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type DetectionStatus = 'NEW' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE'
export type CTIStatus = 'DRAFT' | 'PUBLISHED' | 'FAILED'
export type VerificationStatus = 'VERIFIED' | 'PENDING' | 'FAILED'
export type UserRole = 'ORG_ADMIN' | 'SECURITY_ANALYST' | 'SUPER_ADMIN'

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

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}
