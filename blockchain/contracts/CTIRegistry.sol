// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title CTIRegistry
/// @notice Tamper-proof notice board for Cyber Threat Intelligence report
/// hashes. This contract does NOT detect ransomware and does NOT store
/// sensitive report content - only a SHA-256 content hash plus minimal
/// non-sensitive metadata, so any organization can verify a report they
/// received has not been altered since it was published.
/// @dev Only the contract owner (the backend's wallet) may publish new
/// records. Without this restriction, any external wallet could call
/// publishCTI() directly and inject fake or spam entries onto the ledger,
/// bypassing all of the backend's validation, auditing, and organization
/// scoping entirely.
contract CTIRegistry is Ownable {
    struct CTIRecord {
        bytes32 contentHash;
        address publisher;
        uint256 timestamp;
        string attackType;
    }

    mapping(bytes32 => CTIRecord) private records;

    event CTIPublished(
        bytes32 indexed reportKey,
        bytes32 contentHash,
        address indexed publisher,
        uint256 timestamp,
        string attackType
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Publish a new CTI report's hash. Only callable by the
    /// contract owner (the backend's wallet). Reverts if this reportKey
    /// was already published, since records must be immutable once written.
    function publishCTI(
        bytes32 reportKey,
        bytes32 contentHash,
        string calldata attackType
    ) external onlyOwner {
        require(records[reportKey].timestamp == 0, "CTIRegistry: report already published");

        records[reportKey] = CTIRecord({
            contentHash: contentHash,
            publisher: msg.sender,
            timestamp: block.timestamp,
            attackType: attackType
        });

        emit CTIPublished(reportKey, contentHash, msg.sender, block.timestamp, attackType);
    }

    /// @notice Verify a given contentHash still matches what's on-chain for
    /// a reportKey. Publicly callable - anyone should be able to verify
    /// integrity, only publishing is restricted.
    function verifyCTI(bytes32 reportKey, bytes32 contentHash) external view returns (bool matches) {
        return records[reportKey].contentHash == contentHash && records[reportKey].timestamp != 0;
    }

    function getCTI(bytes32 reportKey) external view returns (CTIRecord memory) {
        require(records[reportKey].timestamp != 0, "CTIRegistry: report not found");
        return records[reportKey];
    }
}