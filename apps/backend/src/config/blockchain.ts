import { ethers } from "ethers";
import { env } from "./env";
import ctiRegistryArtifact from "../abi/CTIRegistry.json";

// A single shared provider + wallet + contract instance, reused across
// requests rather than recreated per-call — avoids reconnecting to the
// RPC endpoint on every publish.
const provider = new ethers.JsonRpcProvider(env.blockchain.rpcUrl);
const wallet = new ethers.Wallet(env.blockchain.privateKey, provider);

export const ctiRegistryContract = new ethers.Contract(
  env.blockchain.contractAddress,
  ctiRegistryArtifact.abi,
  wallet
);

export { ethers };