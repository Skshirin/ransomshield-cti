import { CTIStatus, BlockchainVerificationStatus } from "./enums";

export interface CTIReport {
  _id: string;
  organizationId: string;
  detectionId: string;
  attackSummary: string;
  indicatorsOfCompromise: string[];
  recommendedActions: string[];
  analystNotes?: string;
  status: CTIStatus;
  transactionHash?: string;
  blockNumber?: number;
  verificationStatus?: BlockchainVerificationStatus;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}