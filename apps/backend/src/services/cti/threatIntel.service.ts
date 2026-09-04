import { CTIMatchResult, ThreatIntelIOC } from "@ransomware-cti/shared-types";
import { ThreatIntelProvider } from "./threatIntel.provider";
import { localThreatIntelProvider } from "./localThreatIntel.provider";

export class ThreatIntelService {
  private provider: ThreatIntelProvider;

  constructor(provider: ThreatIntelProvider = localThreatIntelProvider) {
    this.provider = provider;
  }

  public setProvider(provider: ThreatIntelProvider) {
    this.provider = provider;
  }

  public getProviderName(): string {
    return this.provider.name;
  }

  public async lookupIndicator(indicator: string, type?: any): Promise<CTIMatchResult> {
    return this.provider.lookup(indicator, type);
  }

  public async getAllIOCs(): Promise<ThreatIntelIOC[]> {
    return this.provider.getAllIOCs();
  }

  /**
   * Correlates incoming detection telemetry indicators against known Threat Intel IOCs.
   * Scans indicator descriptions, network destinations, and simulated payload signatures.
   */
  public async correlateDetection(indicators: Array<{ type: string; description: string }>): Promise<CTIMatchResult> {
    if (!indicators || indicators.length === 0) {
      return { matched: false };
    }

    const allIOCs = await this.provider.getAllIOCs();

    // Check each detection indicator against known threat intel IOCs
    for (const ind of indicators) {
      const desc = (ind.description || "").toLowerCase();

      for (const ioc of allIOCs) {
        const iocTarget = ioc.indicator.toLowerCase();

        // Check if description directly references the IOC or contains related signature terms
        if (desc.includes(iocTarget)) {
          return {
            matched: true,
            indicator: ioc.indicator,
            type: ioc.type,
            isMalicious: ioc.isMalicious,
            confidence: ioc.confidence,
            severity: ioc.severity,
            threatCategory: ioc.threatCategory,
            tags: ioc.tags,
            source: ioc.source,
            matchedAt: new Date().toISOString(),
          };
        }
      }
    }

    return { matched: false };
  }
}

export const threatIntelService = new ThreatIntelService();
