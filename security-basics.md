# Security & Encryption — Explained From Zero

A friendly, no-experience-needed guide to how your DocVerify document sharing
keeps things private. We start from the very beginning ("what is encryption?")
and build up to exactly how your feature works. Read top to bottom.

---

## Part 1 — The big idea

You want to send someone a document so that **only they** can read it, **for a
limited time**, and **nobody in the middle** (the internet, email, storage
companies) can peek. To do that, we scramble the document so it looks like
random noise to everyone except the right person. That scrambling is called
**encryption**. This guide explains the tools that make it work.

---

## Part 2 — The absolute basics

### Plaintext and ciphertext
- **Plaintext** = the real, readable document (your certificate, your ID).
- **Ciphertext** = the scrambled, unreadable version.

Encryption turns plaintext → ciphertext. Decryption turns it back.

```
  "Hello Bob"   --[ encrypt ]-->   8f3a9c... (gibberish)
  8f3a9c...      --[ decrypt ]-->   "Hello Bob"
```

### A key
A **key** is the secret needed to lock or unlock. Same idea as a house key:
the lock (encryption) is public knowledge, but only the key opens it.

> **Golden rule:** the security comes from keeping the **key** secret, *not* from
> hiding how the lock works. Good locks are public and well-tested.

### Two directions vs one direction
This trips everyone up at first, so remember it:

- **Encryption is two-way.** Scramble, then unscramble *with the key*. (Like a safe.)
- **Hashing is one-way.** It makes a "fingerprint" you can *check* but **never**
  turn back into the original. (Like a fingerprint at a crime scene — you can match
  it, but you can't rebuild the person from it.)

We use **both**, for different jobs. Keep this distinction in mind.

---

## Part 3 — The building blocks ("primitives")

A **primitive** is a basic, trusted tool that does **one job**. Think of them as
Lego bricks. You never carve your own brick — you use the standard, well-tested
ones and snap them together. Your app uses about six kinds of brick.

### Brick 1 — The safe: **AES-256-GCM** (encryption)
This is the actual scrambler. Give it the plaintext and a key; it gives back
ciphertext. Give it the ciphertext and the same key; it gives back the plaintext.

- **"AES"** = the worldwide-standard scrambling method (used by banks, governments).
- **"256"** = the key is 256 bits long — astronomically too many combinations to guess.
- **"GCM"** = it also adds a **tamper seal**. If anyone changes even one byte of the
  ciphertext, unlocking **fails** instead of giving you fake data. So GCM gives you
  *secrecy* **and** *tamper-detection* at once.

*Analogy:* a safe with a tamper-evident sticker across the door.

### Brick 2 — Where keys come from: **scrypt** and **PBKDF2** (key derivation)
People remember **passwords** ("hunter2"), but encryption needs a proper random
**key**. A **key-derivation function (KDF)** converts a password into a strong key.

The clever part: it's **deliberately slow and memory-heavy**. For you, turning your
password into a key once takes a fraction of a second — no problem. For an attacker
trying *billions* of guesses, that slowness makes it hopelessly expensive.

- **scrypt** — the KDF your **server** uses (in Node.js).
- **PBKDF2** — an older KDF used by the **legacy browser** path.

*Analogy:* a hand-crank key-forging machine. One key is easy; a million keys is exhausting.

### Brick 3 — The dice: **CSPRNG** (randomness)
Encryption needs unpredictable secrets — keys, tickets, and the small helpers
below. A **CSPRNG** ("cryptographically secure random number generator") is a
source of randomness an attacker cannot predict or reproduce.

*Analogy:* perfect, unriggable dice. (In code: `randomBytes`, `getRandomValues`.)

### Brick 4 — The fingerprint: **SHA-256** and **keccak-256** (hashing)
A **hash** is a fixed-size **fingerprint** of some data. The same input always
gives the same fingerprint, but you can **never** reverse a fingerprint back to the
data. Tiny change in input → totally different fingerprint.

Why it's useful: to check a secret is correct, you can store its *fingerprint*
instead of the secret. If someone steals your database, they get fingerprints,
not secrets.

- **SHA-256** — the standard fingerprint, used for your link tokens and email codes.
- **keccak-256** — the Ethereum version, used to fingerprint a file for the
  **blockchain** record. (This is fingerprinting, **not** encryption.)

*Analogy:* an ink fingerprint stamp. Matchable, not reversible.

### Brick 5 — The poker face: **constant-time compare** (`timingSafeEqual`)
When the server checks "is this the right token/password?", it must not reveal
hints by *how long* the check takes. A naive comparison can leak the answer
character-by-character through timing. **Constant-time compare** always takes the
same time, giving nothing away.

*Analogy:* a guard who takes exactly the same time to say "no" whether you got
the first letter right or not.

---

## Part 4 — The small helper parts (you'll see these words a lot)

When you use the safe (AES-GCM), three little extras show up:

| Part | What it is | Why it exists |
|---|---|---|
| **IV** (also called a **nonce**) | A small random "starter" added before each encryption | So encrypting the **same** file twice gives **different** ciphertext — no visible patterns for an attacker. |
| **Tag** | A short tamper seal AES-GCM produces | Unlocking checks the tag; a wrong/edited file **fails** to open. |
| **Salt** | Random "grit" mixed in before turning a password into a key | So two people with the same password get **different** keys, and pre-made guessing tables don't work. |

None of these are secret — they're stored next to the ciphertext. Their job is to
make the secrecy *stronger*, not to be hidden.

---

## Part 5 — Bigger ideas, built from the bricks

### Idea 1 — Key wrapping (a key locked inside another safe)
Each share gets its **own** fresh key (called a **DEK** — "data-encryption key").
But where do we keep that key? We **lock the key inside another safe** controlled
by one big **master key** that lives only on the server. This is **key wrapping**.

Why it's powerful: to **destroy** a share forever, you just throw away the wrapped
key. The ciphertext on storage instantly becomes permanent gibberish — *nobody*
can ever open it again, not even the operator. (This is how "expiry" and "revoke"
really work — see Part 7.)

### Idea 2 — The capability token (the ticket in the link)
A share link contains a long random **token** — like a unique concert ticket.
Anyone with the ticket can ask to enter. The server stores only the ticket's
**fingerprint** (SHA-256), never the ticket itself, so a database thief can't
forge tickets. The token is 256 bits of randomness — impossible to guess.

### Idea 3 — The `#` trick (how the most private mode hides the key from us)
A web address can have a part after a `#` symbol, called the **fragment**:

```
   https://yoursite/share/abc123#t=TICKET&k=KEY
   \_______________________/      \____________/
        sent to the server         NEVER sent to the server
```

By a rule every web browser follows, **everything after `#` is never sent to any
server** — it stays in your browser. So if we put the decryption **key** after the
`#`, your server never sees it. That's the foundation of the "zero-knowledge"
mode below.

---

## Part 6 — Your two ways to share (in plain words)

When you create a share, you pick **how protected** it is:

### Option A — "Protected" (the normal mode)
- The document is encrypted, but the **server can open it for a moment** when an
  authorised person views it.
- Because the server can see it briefly, it can add a **watermark** (stamping the
  viewer's name + time on the image so leaks are traceable) and keep it **view-only**.
- Best for **control, watermarking, and audit logs**.
- Trust level: the same as the rest of your site already trusts the server.

### Option B — "Zero-Knowledge" (maximum privacy)
- The document is encrypted **inside your browser**, and the key goes **only in the
  link's `#` part** — so your **server can never read it**, ever.
- Even if someone hacked your server, they'd find only gibberish.
- The cost: because the server never sees the document, it **can't watermark** it.
- Best for the **most sensitive** documents.

Both modes also let you add an extra lock (a "gate") and an expiry.

---

## Part 7 — What actually happens, step by step

### When you create a share (Protected mode)
1. Your browser gets the real document (asking for your passphrase / wallet
   signature if needed).
2. It sends the document to the server over an encrypted connection (HTTPS).
3. The server rolls fresh **dice** (CSPRNG) to make a new key just for this share.
4. It **encrypts** the document with that key (AES-256-GCM) and stores the
   ciphertext on IPFS (a file store) — only gibberish ever leaves the server.
5. It **wraps** (locks) the share's key under the **master key** and saves the
   wrapped key in the database.
6. It makes a random **ticket** (token), saves only its **fingerprint** (SHA-256),
   and gives you a link containing the real ticket.

### When the recipient opens it
1. They open the link; their browser sends the **ticket** to the server.
2. The server checks: not expired? not revoked? ticket fingerprint matches?
   (compared with a **poker face** — constant-time). Any extra gate satisfied?
3. If all good, the server **unwraps** the share key and **decrypts** the document,
   adds a **watermark** (for images), and shows it **view-only**.

### When you set an expiry or click "Revoke"
The server **throws away the wrapped key**. Since that was the only way to unlock
the ciphertext, the document becomes **permanently unreadable** — by anyone,
forever. This is stronger than just "hiding" it; it's mathematically gone.

### The "Zero-Knowledge" version
Same idea, but the **encrypting and decrypting happen in the browsers**, and the
key rides in the link's `#` part. The server only stores and guards the gibberish;
it never holds the key. (See Part 5, Idea 3.)

---

## Part 8 — The extra locks ("gates")

On top of the link, you can require one more proof so a **leaked link alone isn't
enough**:

| Gate | What the recipient must do | Why it helps |
|---|---|---|
| **No extra step** | Just have the link | Simplest; anyone with the link can view. |
| **Email code** | Type a one-time code we email them | Now they need the link **and** access to a specific inbox. |
| **Password** | Type a password you set | You tell them the password separately (call/text). |

You can also set a **maximum number of opens**, and an **expiry time** (1 hour,
24 hours, 7 days, or a custom time up to 90 days).

---

## Part 9 — Encryption vs. fingerprint (don't mix these up)

This is the single most common confusion, so once more, simply:

- **Encryption (AES-GCM):** *hides* the document; can be *unhidden* with the key.
  **Two-way.** Used to protect the document itself.
- **Fingerprint / hash (SHA-256, keccak-256):** makes a *check value*; can **never**
  be turned back. **One-way.** Used for the link ticket, the email code, and the
  blockchain record.

So the "hash on the blockchain" and the "token hash in the database" are **not**
encrypted documents — they're just fingerprints used to verify things.

---

## Part 10 — Glossary (one line each)

| Term | Plain meaning |
|---|---|
| **Plaintext** | The real, readable document. |
| **Ciphertext** | The scrambled, unreadable version. |
| **Encryption** | Scrambling so only a key can unscramble. Two-way. |
| **Decryption** | Unscrambling with the key. |
| **Hashing** | Making a one-way fingerprint of data. |
| **Key** | The secret that locks/unlocks. |
| **AES-256-GCM** | The standard encryption tool (+ tamper seal). |
| **scrypt / PBKDF2** | Turns a password into a strong key, slowly on purpose. |
| **SHA-256 / keccak-256** | Fingerprint makers (one-way). |
| **CSPRNG** | Unpredictable randomness source. |
| **timingSafeEqual** | Comparing secrets without leaking timing hints. |
| **Primitive** | A basic, trusted crypto building block. |
| **IV / nonce** | Random starter so repeats look different. |
| **Tag** | Tamper seal; wrong tag = won't open. |
| **Salt** | Random grit so same passwords differ. |
| **DEK** | A document's own per-share key. |
| **Key wrapping** | Locking a key inside another safe (master key). |
| **Master key** | The one big server key that wraps all share keys. |
| **Capability token** | The secret ticket inside a share link. |
| **Fragment (`#`)** | Part of a URL that browsers never send to a server. |
| **Zero-knowledge** | Mode where even the server can't read the document. |
| **IPFS** | The file store that only ever holds ciphertext. |
| **Gate** | An extra proof (email code / password) to open a share. |
| **Revoke** | Destroy the key so the share can never be opened again. |

---

## If you remember only five things

1. **Encryption = a safe** (AES-256-GCM): scrambles the document; a key unlocks it.
2. **A key per share**, and that key is **locked under one master key** on the server.
3. **Expiry/Revoke = throw the key away** → the document is gone forever, not just hidden.
4. **The `#` part of a link is never sent to the server** — that's how the
   zero-knowledge mode keeps the key away from us.
5. **Hashing is a one-way fingerprint** (for tickets, codes, the blockchain) — it is
   **not** encryption and can't be reversed.

---

*For the precise, code-level details (exact functions, files, and line numbers),
see [`encryption-reference.md`](encryption-reference.md). For the full design and
privacy analysis, see [`sharesecure.md`](sharesecure.md).*
