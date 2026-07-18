import { EndpointStatus } from "./enums";

export interface Endpoint {
  _id: string;
  organizationId: string;
  name: string;
  status: EndpointStatus;
  osVersion: string;
  agentVersion: string;
  activationToken?: string;
  lastCheckInAt?: string;
  cpuUsagePercent?: number;
  ramUsagePercent?: number;
  diskUsagePercent?: number;
  createdAt: string;
  updatedAt: string;
}