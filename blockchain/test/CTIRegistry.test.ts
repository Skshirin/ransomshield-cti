import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("CTIRegistry", () => {
  async function deployFixture() {
    const [owner, otherAccount] = await ethers.getSigners();
    const registry = await ethers.deployContract("CTIRegistry", [owner.address]);
    await registry.waitForDeployment();
    return { registry, owner, otherAccount };
  }

  it("publishes a CTI record and allows verification", async () => {
    const { registry } = await deployFixture();

    const reportKey = ethers.keccak256(ethers.toUtf8Bytes("report-123"));
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes("summary + iocs + actions"));

    await registry.publishCTI(reportKey, contentHash, "RANSOMWARE");

    const isValid = await registry.verifyCTI(reportKey, contentHash);
    expect(isValid).to.equal(true);
  });

  it("rejects verification against a tampered hash", async () => {
    const { registry } = await deployFixture();

    const reportKey = ethers.keccak256(ethers.toUtf8Bytes("report-456"));
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes("original content"));
    const tamperedHash = ethers.keccak256(ethers.toUtf8Bytes("tampered content"));

    await registry.publishCTI(reportKey, contentHash, "RANSOMWARE");

    const isValid = await registry.verifyCTI(reportKey, tamperedHash);
    expect(isValid).to.equal(false);
  });

  it("prevents publishing the same reportKey twice", async () => {
    const { registry } = await deployFixture();

    const reportKey = ethers.keccak256(ethers.toUtf8Bytes("report-789"));
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes("some content"));

    await registry.publishCTI(reportKey, contentHash, "RANSOMWARE");

    await expect(
      registry.publishCTI(reportKey, contentHash, "RANSOMWARE")
    ).to.be.revertedWith("CTIRegistry: report already published");
  });

  it("rejects publishCTI from a non-owner account", async () => {
    const { registry, otherAccount } = await deployFixture();

    const reportKey = ethers.keccak256(ethers.toUtf8Bytes("report-999"));
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes("some content"));

    await expect(
      registry.connect(otherAccount).publishCTI(reportKey, contentHash, "RANSOMWARE")
    ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
  });

  it("allows anyone to call verifyCTI (read-only, unrestricted)", async () => {
    const { registry, otherAccount } = await deployFixture();

    const reportKey = ethers.keccak256(ethers.toUtf8Bytes("report-111"));
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes("content"));

    await registry.publishCTI(reportKey, contentHash, "RANSOMWARE");

    // Called from otherAccount, not the owner - should still succeed since
    // verification is intentionally public.
    const isValid = await registry.connect(otherAccount).verifyCTI(reportKey, contentHash);
    expect(isValid).to.equal(true);
  });
});