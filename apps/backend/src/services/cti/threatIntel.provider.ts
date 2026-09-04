import { IOCType, ThreatIntelIOC, CTIMatchResult } from "@ransomware-cti/shared-types";

export interface ThreatIntelProvider {
  name: string;
  lookup(indicator: string, type?: IOCType): Promise<CTIMatchResult>;
  lookupIP(ip: string): Promise<CTIMatchResult>;
  lookupDomain(domain: string): Promise<CTIMatchResult>;
  lookupHash(hash: string): Promise<CTIMatchResult>;
  lookupUrl(url: string): Promise<CTIMatchResult>;
  getAllIOCs(): Promise<ThreatIntelIOC[]>;
}
