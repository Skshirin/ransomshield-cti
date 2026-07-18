export enum UserRole {
  ORG_ADMIN = "ORG_ADMIN",
  SECURITY_ANALYST = "SECURITY_ANALYST",
  SUPER_ADMIN = "SUPER_ADMIN",
}

export enum EndpointStatus {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
  AT_RISK = "AT_RISK",
}

export enum DetectionStatus {
  NEW = "NEW",
  INVESTIGATING = "INVESTIGATING",
  RESOLVED = "RESOLVED",
  FALSE_POSITIVE = "FALSE_POSITIVE",
}

export enum DetectionSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum CTIStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  FAILED = "FAILED",
}

export enum BlockchainVerificationStatus {
  VERIFIED = "VERIFIED",
  PENDING = "PENDING",
  FAILED = "FAILED",
}

export enum AlertStatus {
  ACTIVE = "ACTIVE",
  ACKNOWLEDGED = "ACKNOWLEDGED",
}