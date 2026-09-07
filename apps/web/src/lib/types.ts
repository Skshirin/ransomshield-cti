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
  | 'CTI_MATCHED'
  | 'CASCADE_DETECTED'
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

export type IOCType = 'IP' | 'DOMAIN' | 'HASH' | 'URL'

export interface ThreatIntelIOC {
  indicator: string
  type: IOCType
  isMalicious: boolean
  confidence: number
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  threatCategory: string
  tags: string[]
  source: string
  firstSeen: string
  lastSeen: string
  description?: string
}

export interface CTIMatchResult {
  matched: boolean
  indicator?: string
  type?: IOCType
  isMalicious?: boolean
  confidence?: number
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  threatCategory?: string
  tags?: string[]
  source?: string
  matchedAt?: string
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
  ctiMatch?: CTIMatchResult
  cascadeId?: string
}

export type PolicyConditionField =
  | 'riskScore'
  | 'severity'
  | 'detectionType'
  | 'consecutiveDetections'
  | 'ctiMatch'
  | 'ctiConfidence'
  | 'maliciousIocMatch'
  | 'affectedEndpointCount'
  | 'crossEndpointAttack'
  | 'endpointStatus'

export type PolicyConditionOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'IN'
  | 'CONTAINS'

export interface PolicyCondition {
  field: PolicyConditionField
  operator: PolicyConditionOperator
  value: any
}

export type PolicyActionType =
  | 'ISOLATE_ENDPOINT'
  | 'CREATE_ALERT'
  | 'MARK_HIGH_RISK'

export interface PolicyAction {
  type: PolicyActionType
  params?: Record<string, any>
}

export interface Policy {
  _id: string
  organizationId: string
  name: string
  description?: string
  enabled: boolean
  priority: number
  logicalOperator: 'AND' | 'OR'
  conditions: PolicyCondition[]
  actions: PolicyAction[]
  cooldownPeriodSeconds: number
  lastTriggeredAt?: string | null
  triggerCount: number
  createdByUserId?: string
  updatedByUserId?: string
  createdAt: string
  updatedAt: string
}

export type CascadeAttackType =
  | 'RANSOMWARE_PROPAGATION'
  | 'COORDINATED_C2_BURST'
  | 'LATERAL_MOVEMENT'
  | 'MULTI_HOST_ANOMALY'

export type CascadeSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type CascadeStatus = 'ACTIVE' | 'CONTAINED' | 'RESOLVED'

export interface Cascade {
  _id: string
  organizationId: string
  cascadeId: string
  title: string
  attackType: CascadeAttackType
  severity: CascadeSeverity
  confidence: number
  status: CascadeStatus
  affectedEndpointIds: string[]
  affectedEndpointNames: string[]
  relatedDetectionIds: string[]
  matchedIOCs: string[]
  correlationReason: string
  firstSeen: string
  lastSeen: string
  containedAt?: string | null
  resolvedAt?: string | null
  createdAt: string
  updatedAt: string
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
  type: 'success' | 'error' | 'info' | 'warning'
}
