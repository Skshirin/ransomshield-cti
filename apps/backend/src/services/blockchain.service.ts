import { ethers, ctiRegistryContract } from "../config/blockchain";

export interface PublishToBlockchainResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  error?: string;
}

/**
 * Publishes a CTI report's content hash to the real CTIRegistry contract
 * on Polygon Amoy. reportId is the MongoDB _id (a string) — we hash it into
 * a bytes32 key since Solidity mappings need fixed-size keys, not arbitrary
 * strings. attackType is a short label (e.g. "RANSOMWARE") stored alongside
 * the hash for the on-chain event log.
 */
export async function publishHashToBlockchain(
  reportId: string,
  contentHashHex: string,
  attackType: string
): Promise<PublishToBlockchainResult> {
  try {
    const reportKey = ethers.keccak256(ethers.toUtf8Bytes(reportId));
    // contentHashHex arrives as a raw sha256 hex digest (64 chars, no 0x);
    // Solidity's bytes32 expects a 0x-prefixed 32-byte value, so we prefix it.
    const contentHashBytes32 = "0x" + contentHashHex;

    const tx = await ctiRegistryContract.publishCTI(reportKey, contentHashBytes32, attackType);
    const receipt = await tx.wait();

    return {
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (error) {
    console.error("[blockchain] Publish failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown blockchain error",
    };
  }
}

export function computeReportContentHash(report: {
  attackSummary: string;
  indicatorsOfCompromise: string[];
  recommendedActions: string[];
}): string {
  const canonical = JSON.stringify({
    attackSummary: report.attackSummary,
    indicatorsOfCompromise: [...report.indicatorsOfCompromise].sort(),
    recommendedActions: [...report.recommendedActions].sort(),
  });
  return ethers.sha256(ethers.toUtf8Bytes(canonical)).slice(2); // strip 0x to match old stub's format
}