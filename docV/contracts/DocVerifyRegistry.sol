// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DocVerifyRegistry
 * @notice On-chain registry for the DocVerify Issuer Portal.
 *
 *         An *issuer* publishes an original document by recording its
 *         cryptographic fingerprint (keccak256 file hash) together with the
 *         IPFS CID and a designated *receiver* wallet address.
 *
 *         The blockchain proof is public and immutable, but the application
 *         layer only unlocks the off-chain document content (IPFS) for the two
 *         parties bound to the record: the issuer (sender) and the receiver.
 *         `canAccess()` exposes that same rule on-chain so any verifier can
 *         confirm who is authorised.
 *
 *         Deploy this contract with Remix IDE (Injected Provider - MetaMask)
 *         on the Sepolia testnet. See contracts/README_REMIX.md.
 */
contract DocVerifyRegistry {
    struct Document {
        bytes32 fileHash;   // keccak256 of the raw file bytes
        address issuer;     // sender / publishing wallet
        address receiver;   // recipient wallet allowed to access
        string ipfsCID;     // IPFS content identifier (Pinata)
        string docType;     // e.g. "Birth Certificate"
        string docNumber;   // human-readable document number
        uint256 issuedAt;   // block timestamp
        bool exists;        // guard against empty/overwritten slots
    }

    // docId (a unique bytes32 chosen off-chain) => Document
    mapping(bytes32 => Document) private documents;

    // Reverse indexes so a wallet can enumerate its own records
    mapping(address => bytes32[]) private issuedBy;
    mapping(address => bytes32[]) private receivedBy;

    event DocumentIssued(
        bytes32 indexed docId,
        address indexed issuer,
        address indexed receiver,
        bytes32 fileHash,
        string ipfsCID,
        uint256 issuedAt
    );

    /**
     * @notice Publish an original document. Called by the issuer's wallet.
     * @param docId     Unique identifier for this record (must be unused).
     * @param fileHash  keccak256 hash of the document bytes.
     * @param receiver  Wallet address permitted to access the document.
     * @param ipfsCID   IPFS CID where the encrypted/original file is pinned.
     * @param docType   Document category label.
     * @param docNumber Human-readable document number.
     */
    function issueDocument(
        bytes32 docId,
        bytes32 fileHash,
        address receiver,
        string calldata ipfsCID,
        string calldata docType,
        string calldata docNumber
    ) external {
        require(!documents[docId].exists, "docId already used");
        require(receiver != address(0), "invalid receiver");
        require(fileHash != bytes32(0), "invalid fileHash");

        documents[docId] = Document({
            fileHash: fileHash,
            issuer: msg.sender,
            receiver: receiver,
            ipfsCID: ipfsCID,
            docType: docType,
            docNumber: docNumber,
            issuedAt: block.timestamp,
            exists: true
        });

        issuedBy[msg.sender].push(docId);
        receivedBy[receiver].push(docId);

        emit DocumentIssued(docId, msg.sender, receiver, fileHash, ipfsCID, block.timestamp);
    }

    /// @notice Fetch the full record for a docId. Reverts if it does not exist.
    function getDocument(bytes32 docId)
        external
        view
        returns (
            bytes32 fileHash,
            address issuer,
            address receiver,
            string memory ipfsCID,
            string memory docType,
            string memory docNumber,
            uint256 issuedAt
        )
    {
        Document storage d = documents[docId];
        require(d.exists, "document not found");
        return (d.fileHash, d.issuer, d.receiver, d.ipfsCID, d.docType, d.docNumber, d.issuedAt);
    }

    /// @notice True only for the issuer or the receiver of the document.
    function canAccess(bytes32 docId, address wallet) external view returns (bool) {
        Document storage d = documents[docId];
        if (!d.exists) return false;
        return wallet == d.issuer || wallet == d.receiver;
    }

    /// @notice Verify a file hash matches what was published on-chain.
    function verifyHash(bytes32 docId, bytes32 fileHash) external view returns (bool) {
        Document storage d = documents[docId];
        return d.exists && d.fileHash == fileHash;
    }

    /// @notice docIds issued by a given wallet (sender view).
    function getIssuedDocs(address wallet) external view returns (bytes32[] memory) {
        return issuedBy[wallet];
    }

    /// @notice docIds where a given wallet is the receiver (recipient view).
    function getReceivedDocs(address wallet) external view returns (bytes32[] memory) {
        return receivedBy[wallet];
    }
}
