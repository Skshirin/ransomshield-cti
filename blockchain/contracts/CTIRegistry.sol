// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CTIRegistry
/// @notice Tamper-proof notice board for Cyber Threat Intelligence report
/// hashes. This contract does NOT detect ransomware and does NOT store
/// sensitive report content — only a SHA-256 content hash plus minimal
/// non-sensitive metadata, so any organization can verify a report they
/// received has not been altered since it was published.
contract CTIRegistry {
    struct CTIRecord {
        bytes32 contentHash;
        address publisher;
        uint256 timestamp;
        string attackType;
    }

    // reportId (an off-chain MongoDB _id, passed in as a string→bytes32 hash)
    // maps to its on-chain record.
    mapping(bytes32 => CTIRecord) private records;

    event CTIPublished(
        bytes32 indexed reportKey,
        bytes32 contentHash,
        address indexed publisher,
        uint256 timestamp,
        string attackType
    );

    /// @notice Publish a new CTI report's hash. Reverts if this reportKey
    /// was already published, since records must be immutable once written.
    function publishCTI(
        bytes32 reportKey,
        bytes32 contentHash,
        string calldata attackType
    ) external {
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
    /// a reportKey. Used by the "Blockchain Verification" screen.
    function verifyCTI(bytes32 reportKey, bytes32 contentHash) external view returns (bool matches) {
        return records[reportKey].contentHash == contentHash && records[reportKey].timestamp != 0;
    }

    function getCTI(bytes32 reportKey) external view returns (CTIRecord memory) {
        require(records[reportKey].timestamp != 0, "CTIRegistry: report not found");
        return records[reportKey];
    }
}