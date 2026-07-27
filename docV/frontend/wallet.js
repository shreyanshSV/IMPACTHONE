/* ============================================================
   wallet.js — MetaMask connect + signature auth. Shared by the
   desktop portal (script.js) and the mobile app (app.js).

   - Desktop: uses the injected MetaMask extension (window.ethereum).
   - Mobile: if window.ethereum exists (already inside MetaMask's in-app
     browser) it's used directly; otherwise we deep-link to MetaMask —
     Android/iOS opens the MetaMask APP if installed, or its install/web
     page if not. Inside MetaMask's browser window.ethereum is injected.
   ============================================================ */
(function (global) {
  function getEth() { return global.ethereum || null; }
  function hasWallet() { return !!global.ethereum; }
  function isMobile() { return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || ""); }

  function openInMetaMask() {
    var target = location.host + location.pathname + location.search;
    location.href = "https://metamask.app.link/dapp/" + target;
  }

  // No injected provider: on mobile bounce into the MetaMask app; on desktop
  // ask the user to install the extension.
  function noProvider() {
    if (isMobile()) { openInMetaMask(); return new Error("Opening MetaMask…"); }
    return new Error("MetaMask not found. Please install the MetaMask browser extension.");
  }

  // Connect and return the chosen address. `pick` forces the account chooser.
  async function connect(pick) {
    var eth = getEth();
    if (!eth) throw noProvider();
    if (pick) {
      try { await eth.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] }); }
      catch (e) { /* user dismissed the picker — use whatever is connected */ }
    }
    var accounts = await eth.request({ method: "eth_requestAccounts" });
    if (!accounts || !accounts.length) throw new Error("No wallet account selected.");
    return accounts[0];
  }

  async function sign(message, address) {
    var eth = getEth();
    if (!eth) throw noProvider();
    return eth.request({ method: "personal_sign", params: [message, address] });
  }

  // Full challenge-response: connect → get a server nonce → sign it.
  // Returns { walletAddress, signature } to POST to /auth/signup or /auth/signin-wallet.
  async function authenticate(pick) {
    var address = await connect(pick);
    var res = await fetch(location.origin + "/api/auth/wallet-nonce", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: address }),
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.message || "Could not start wallet verification.");
    var signature = await sign(data.message, address);
    return { walletAddress: address, signature: signature };
  }

  global.Wallet = { hasWallet: hasWallet, openInMetaMask: openInMetaMask, connect: connect, sign: sign, authenticate: authenticate };
})(window);
