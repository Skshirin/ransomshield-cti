export type IOCType = "IP" | "DOMAIN" | "HASH" | "URL";

export interface ThreatIntelIOC {
  indicator: string;
  type: IOCType;
  isMalicious: boolean;
  confidence: number; // 0 - 100
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  threatCategory: string; // e.g. "Ransomware C2", "Malware Payload", "Data Exfiltration"
  tags: string[];
  source: string;
  firstSeen: string;
  lastSeen: string;
  description?: string;
}

export interface CTIMatchResult {
  matched: boolean;
  indicator?: string;
  type?: IOCType;
  isMalicious?: boolean;
  confidence?: number;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  threatCategory?: string;
  tags?: string[];
  source?: string;
  matchedAt?: string;
}