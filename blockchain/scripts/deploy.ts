import { network } from "hardhat";

async function main() {
  const { ethers } = await network.create();

  const registry = await ethers.deployContract("CTIRegistry");
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`CTIRegistry deployed to: ${address}`);
  console.log(`Save this address into apps/backend/.env as CTI_REGISTRY_CONTRACT_ADDRESS`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});