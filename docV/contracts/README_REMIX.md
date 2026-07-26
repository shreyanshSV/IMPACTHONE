# Deploying `DocVerifyRegistry.sol` with Remix IDE

The Issuer Portal needs this contract deployed on the **Sepolia** testnet (the
same network as `WEB3_PROVIDER_URL` in `.env`). No Hardhat / Truffle required —
everything is done in the browser with Remix + MetaMask.

## 1. Prerequisites
- MetaMask installed, with an account that holds some **Sepolia test ETH**
  (get it from a faucet, e.g. https://sepoliafaucet.com).
- MetaMask network set to **Sepolia**.

## 2. Open Remix and add the contract
1. Go to https://remix.ethereum.org
2. In the **File Explorer**, create a new file `DocVerifyRegistry.sol`.
3. Paste the contents of [`DocVerifyRegistry.sol`](./DocVerifyRegistry.sol).

## 3. Compile
1. Open the **Solidity Compiler** tab.
2. Select compiler version **0.8.19** (or any `0.8.x` ≥ 0.8.19).
3. Click **Compile DocVerifyRegistry.sol**. It should compile with no errors.

## 4. Deploy to Sepolia
1. Open the **Deploy & Run Transactions** tab.
2. Set **Environment** to **Injected Provider - MetaMask**.
   - MetaMask will pop up — connect the account and make sure it shows
     **Sepolia (11155111)**.
3. Make sure the contract selected is `DocVerifyRegistry`.
4. Click **Deploy** and confirm the transaction in MetaMask.
5. After it mines, expand the deployed contract under **Deployed Contracts**
   and **copy its address** (the `0x...` next to the contract name).

## 5. Wire the address into the app
Open [`frontend/contract.js`](../frontend/contract.js) and paste the deployed
address into `CONTRACT_ADDRESS`:

```js
const CONTRACT_ADDRESS = "0xYourDeployedAddressHere";
```

That's it. The Issuer Portal frontend talks to the contract directly through the
issuer's MetaMask wallet (the issuer pays the gas to publish each document).

## 6. Quick sanity check (optional, in Remix)
Using the deployed contract panel you can call:
- `issueDocument(docId, fileHash, receiver, ipfsCID, docType, docNumber)` —
  `docId`/`fileHash` are `bytes32` (e.g. `0x` + 64 hex chars).
- `getDocument(docId)` to read it back.
- `canAccess(docId, wallet)` returns `true` only for the issuer or receiver.

## Notes
- The contract stores only fingerprints (hash + CID + addresses), never the file
  itself. Document bytes live on IPFS (Pinata); access to them is gated by the
  app to the issuer and receiver wallets.
- All on-chain data is public by nature — the access restriction protects the
  off-chain content, while `canAccess()` lets anyone verify *who* is authorised.
