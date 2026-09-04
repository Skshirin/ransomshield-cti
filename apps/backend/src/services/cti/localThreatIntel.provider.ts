import { IOCType, ThreatIntelIOC, CTIMatchResult } from "@ransomware-cti/shared-types";
import { ThreatIntelProvider } from "./threatIntel.provider";

export class LocalThreatIntelProvider implements ThreatIntelProvider {
  public name = "SentinelIQ Local Threat Intel Provider";

  private iocs: ThreatIntelIOC[] = [
    {
      indicator: "malicious.example.com",
      type: "DOMAIN",
      isMalicious: true,
      confidence: 94,
      severity: "CRITICAL",
      threatCategory: "Ransomware C2",
      tags: ["ransomware", "c2", "command-and-control", "active-campaign"],
      source: "SentinelIQ Global Threat Feed",
      firstSeen: "2026-01-15T08:00:00Z",
      lastSeen: new Date().toISOString(),
      description: "Active Command & Control domain associated with automated ransomware staging.",
    },
    {
      indicator: "ransomware-payload.cc",
      type: "DOMAIN",
      isMalicious: true,
      confidence: 96,
      severity: "CRITICAL",
      threatCategory: "Malware Drop",
      tags: ["payload-delivery", "ransomware", "lockbit"],
      source: "SentinelIQ Curated Intelligence",
      firstSeen: "2026-02-01T12:00:00Z",
      lastSeen: new Date().toISOString(),
      description: "Known staging domain hosting secondary payload encryptors.",
    },
    {
      indicator: "198.51.100.23",
      type: "IP",
      isMalicious: true,
      confidence: 91,
      severity: "HIGH",
      threatCategory: "Command & Control",
      tags: ["c2", "botnet", "beaconing"],
      source: "SentinelIQ Local CTI",
      firstSeen: "2026-01-20T10:30:00Z",
      lastSeen: new Date().toISOString(),
      description: "Fast-flux IP address observed receiving periodic telemetry bursts.",
    },
    {
      indicator: "203.0.113.88",
      type: "IP",
      isMalicious: true,
      confidence: 98,
      severity: "CRITICAL",
      threatCategory: "Data Exfiltration Gateway",
      tags: ["exfiltration", "ransomware", "double-extortion"],
      source: "SentinelIQ Intelligence Grid",
      firstSeen: "2026-02-10T14:15:00Z",
      lastSeen: new Date().toISOString(),
      description: "High-risk egress destination used in coordinated multi-endpoint exfiltration.",
    },
    {
      indicator: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      type: "HASH",
      isMalicious: true,
      confidence: 99,
      severity: "CRITICAL",
      threatCategory: "Known Ransomware Binary",
      tags: ["sha256", "lockbit3", "encryptor"],
      source: "SentinelIQ Hash Registry",
      firstSeen: "2026-01-05T00:00:00Z",
      lastSeen: new Date().toISOString(),
      description: "SHA-256 fingerprint of LockBit 3.0 file system encryption engine.",
    },
    {
      indicator: "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
      type: "HASH",
      isMalicious: true,
      confidence: 93,
      severity: "HIGH",
      threatCategory: "Malicious Loader",
      tags: ["sha256", "loader", "blackcat"],
      source: "SentinelIQ Hash Registry",
      firstSeen: "2026-02-12T09:00:00Z",
      lastSeen: new Date().toISOString(),
      description: "SHA-256 hash of credential dumping and lateral movement staging binary.",
    },
    {
      indicator: "http://malicious.example.com/beacon",
      type: "URL",
      isMalicious: true,
      confidence: 95,
      severity: "CRITICAL",
      threatCategory: "Ransomware Beacon Endpoint",
      tags: ["url", "beacon", "c2"],
      source: "SentinelIQ Global Threat Feed",
      firstSeen: "2026-01-18T16:20:00Z",
      lastSeen: new Date().toISOString(),
      description: "HTTP endpoint actively receiving ransomware beacon heartbeats.",
    },
  ];

  public async lookup(indicator: string, type?: IOCType): Promise<CTIMatchResult> {
    if (!indicator || typeof indicator !== "string") {
      return { matched: false };
    }

    const clean = indicator.trim().toLowerCase();

    const match = this.iocs.find((ioc) => {
      const iocInd = ioc.indicator.toLowerCase();
      const typeMatches = !type || ioc.type === type;
      if (!typeMatches) return false;

      // Exact match or substring / domain containment
      if (clean === iocInd) return true;
      if (ioc.type === "DOMAIN" && (clean.includes(iocInd) || iocInd.includes(clean))) return true;
      if (ioc.type === "URL" && (clean.includes(iocInd) || iocInd.includes(clean))) return true;
      if (ioc.type === "IP" && clean.includes(iocInd)) return true;
      if (ioc.type === "HASH" && clean === iocInd) return true;

      return false;
    });

    if (!match) {
      return { matched: false };
    }

    return {
      matched: true,
      indicator: match.indicator,
      type: match.type,
      isMalicious: match.isMalicious,
      confidence: match.confidence,
      severity: match.severity,
      threatCategory: match.threatCategory,
      tags: match.tags,
      source: match.source,
      matchedAt: new Date().toISOString(),
    };
  }

  public async lookupIP(ip: string): Promise<CTIMatchResult> {
    return this.lookup(ip, "IP");
  }

  public async lookupDomain(domain: string): Promise<CTIMatchResult> {
    return this.lookup(domain, "DOMAIN");
  }

  public async lookupHash(hash: string): Promise<CTIMatchResult> {
    return this.lookup(hash, "HASH");
  }

  public async lookupUrl(url: string): Promise<CTIMatchResult> {
    return this.lookup(url, "URL");
  }

  public async getAllIOCs(): Promise<ThreatIntelIOC[]> {
    return [...this.iocs];
  }
}

// Singleton instance
export const localThreatIntelProvider = new LocalThreatIntelProvider();
