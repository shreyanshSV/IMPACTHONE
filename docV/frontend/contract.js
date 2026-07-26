// ==================== DocVerifyRegistry — On-chain config ==================== //
//
// Paste the address you got from deploying DocVerifyRegistry.sol in Remix.
// See ../contracts/README_REMIX.md for step-by-step instructions.
//
// Until this is set, the Issuer Portal will warn you and refuse to publish.
const CONTRACT_ADDRESS = "0xf0Ad70110e8016c2777E09465b40CA43f72a45c5";

// Sepolia testnet (matches WEB3_PROVIDER_URL in .env)
const CHAIN_CONFIG = {
    chainIdHex: "0xaa36a7",          // 11155111
    chainName: "Sepolia Testnet",
    rpcUrls: ["https://rpc.sepolia.org"],
    nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

// Minimal ABI for the functions the frontend uses.
const CONTRACT_ABI = [
    {
        "inputs": [
            { "internalType": "bytes32", "name": "docId", "type": "bytes32" },
            { "internalType": "bytes32", "name": "fileHash", "type": "bytes32" },
            { "internalType": "address", "name": "receiver", "type": "address" },
            { "internalType": "string", "name": "ipfsCID", "type": "string" },
            { "internalType": "string", "name": "docType", "type": "string" },
            { "internalType": "string", "name": "docNumber", "type": "string" }
        ],
        "name": "issueDocument",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "bytes32", "name": "docId", "type": "bytes32" }],
        "name": "getDocument",
        "outputs": [
            { "internalType": "bytes32", "name": "fileHash", "type": "bytes32" },
            { "internalType": "address", "name": "issuer", "type": "address" },
            { "internalType": "address", "name": "receiver", "type": "address" },
            { "internalType": "string", "name": "ipfsCID", "type": "string" },
            { "internalType": "string", "name": "docType", "type": "string" },
            { "internalType": "string", "name": "docNumber", "type": "string" },
            { "internalType": "uint256", "name": "issuedAt", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "bytes32", "name": "docId", "type": "bytes32" },
            { "internalType": "address", "name": "wallet", "type": "address" }
        ],
        "name": "canAccess",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "wallet", "type": "address" }],
        "name": "getIssuedDocs",
        "outputs": [{ "internalType": "bytes32[]", "name": "", "type": "bytes32[]" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "wallet", "type": "address" }],
        "name": "getReceivedDocs",
        "outputs": [{ "internalType": "bytes32[]", "name": "", "type": "bytes32[]" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "bytes32", "name": "docId", "type": "bytes32" },
            { "indexed": true, "internalType": "address", "name": "issuer", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "receiver", "type": "address" },
            { "indexed": false, "internalType": "bytes32", "name": "fileHash", "type": "bytes32" },
            { "indexed": false, "internalType": "string", "name": "ipfsCID", "type": "string" },
            { "indexed": false, "internalType": "uint256", "name": "issuedAt", "type": "uint256" }
        ],
        "name": "DocumentIssued",
        "type": "event"
    }
];

// Expose for script.js
window.DOCV_CONTRACT = { CONTRACT_ADDRESS, CONTRACT_ABI, CHAIN_CONFIG };
