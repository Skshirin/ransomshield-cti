import { UserRole } from "./enums";

export interface User {
  _id: string;
  organizationId: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  _id: string;
  name: string;
  ctiSharingMode: "AUTO" | "MANUAL";
  retentionDays: number;
  createdAt: string;
  updatedAt: string;
}