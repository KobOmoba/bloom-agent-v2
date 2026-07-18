# 🌸 Bloom Agent v2 — Living Handover Document
**EduBloom Suite · AariNAT Company Limited · Abeokuta, Nigeria**
**Last updated:** 2026-07-18

> This README is the single source of truth for the state of this app.
> Koda (the AI agent) updates it before and after every major change.
> Bayo can read this at any time to understand exactly where things stand and continue from here.

---

## 📌 What This App Does
Bloom Agent v2 is the **field sales app** for EduBloom commission agents.
Agents use it on mobile to:
1. Photograph a school signboard → AI reads school name & address
2. Photograph the school's fee ledger → AI reads all student records
3. Review extracted data, confirm, and submit the school lead
4. Track their commission earnings and deal statuses

---

## 🌐 URLs
| Environment | URL |
|---|---|
| Production (v1 — DO NOT TOUCH) | https://agent.edubloom.com.ng |
| v2 GitHub Pages (current dev) | https://kobomoba.github.io/bloom-agent-v2/ |
| v2 GitHub Repo | https://github.com/KobOmoba/bloom-agent-v2 |

---

## 🔑 API Keys (all stored in Firebase — NOT in code)
All keys are fetched from Firestore `admin_settings/main` via `getEduBloomKeys()`.

| Key Name in Firestore | Purpose |
|---|---|
| `groqApiKey` | Groq Vision API (signboard OCR + ledger OCR primary) |
| `togetherApiKey` | Together AI (ledger fallback — not currently active) |
| `anthropicApiKey` | Claude API (ledger fallback — currently has zero credits) |
| Firebase config | Fetched via `getEduBloomKeys` proxy function |

---

## 🧠 OCR Architecture (TWO SEPARATE PIPELINES — never mix them)

### Pipeline 1: Signboard OCR (Step 1 of the form)
- **What it does:** Reads school name, address, state from a signboard photo
- **Engine:** Groq ONLY (calls Groq API directly from browser)
- **Models tried in order:** `llama-4-scout-17b` → `llama-4-maverick-17b` → `llama-3.2-90b-vision-preview`
- **Function:** `callGroqVision(imageDataUrl, prompt, apiKey)`
- **Status:** ✅ WORKING — proven stable, matches v1 performance
- **Rule:** DO NOT modify this pipeline unless Bayo explicitly asks

### Pipeline 2: Ledger OCR (Step 2 of the form)
- **What it does:** Reads every student row from a handwritten fee ledger photo
- **Engine:** Groq via **server-side proxy** (calls Base44 backend function, not Groq directly)
- **Why proxy?** Mobile networks cause timeouts/hangs when calling Groq directly for large ledger images. Server-side proxy has stable, fast connection.
- **Proxy URL:** `https://api.base44.com/api/apps/6a57168a8c411237376a1bf9/functions/groqOcr`
- **Backend function:** `groqOcr` (deployed on Base44, file: `functions/groqOcr.ts`)
- **Models tried in order inside proxy:** `llama-4-scout-17b` → `llama-4-maverick-17b` → `llama-3.2-90b-vision-preview`
- **Function:** `callGroqVisionProxy(imageDataUrl, prompt, apiKey)`
- **Status:** ✅ DEPLOYED — awaiting Bayo's real-device test in incognito
- **Cascade line in app.js:** ~line 472

### What happens if Groq fails on ledger?
The cascade falls through to Together AI → Mistral → HuggingFace (these are wired but Together AI's free model needs a public URL, not base64 — may not work).

### On-Screen Debug Panel
If the ledger scan completes but finds **0 students**, a diagnostic panel appears automatically on screen (no DevTools needed). It shows:
- Which provider was tried
- What error came back (if any)
- The raw AI response text
- Image size after compression

---

## 📁 File Structure
```
bloom-agent-v2/
├── index.html          — Main HTML shell
├── app.js              — ALL app logic (single file)
├── app.js.bak          — Backup of previous working state
├── functions/
│   ├── groqOcr.ts      — Backend proxy for ledger Groq calls
│   └── claudeOcr.ts    — Backend proxy for Claude (not active — zero credits)
├── docs/
│   ├── data-architecture.md
│   └── AFRICA_EXPANSION_BLUEPRINT.md
└── README.md           — THIS FILE (living handover doc)
```

---

## 🔧 Key Coding Rules (ALWAYS APPLY)
1. Never push to production v1 repos — v2 is separate
2. All API keys via `getEduBloomKeys()` — never hardcode in JS
3. `.nojekyll` file required for GitHub Pages
4. Sanitize OCR output: remove `<ildo>` and `<think>` tags
5. OCR must show step-by-step progress: Loading → Uploading → Reading → Done
6. All score inputs are dropdowns (not free text)
7. All class inputs are dropdowns using the predefined EduBloom class list
8. Direct Firebase connectivity checks (not `navigator.onLine`)
9. Signboard and ledger OCR pipelines are ALWAYS kept separate

---

## 📜 Change History (newest first)

### 2026-07-18 — Ledger OCR routed through server-side proxy
- **Problem:** Ledger scan hung forever on mobile — direct Groq calls from browser timed out
- **Fix:** Added `callGroqVisionProxy()` function that POSTs to Base44 `groqOcr` backend function
- **Deployed:** `groqOcr.ts` backend function on Base44
- **Signboard:** Unchanged — still calls Groq directly (proven stable)
- **Commit:** `0795b3e`

### 2026-07-17 — Claude API integration attempted, abandoned (zero credits)
- Added `callClaudeVision()` and deployed `claudeOcr.ts` proxy
- Anthropic account has zero credits — cannot be used currently
- Code remains wired but Claude is not in the active cascade

### 2026-07-17 — Together AI attempted as primary ledger engine
- `meta-llama/Llama-Vision-Free` requires a public HTTPS URL — cannot accept base64
- Firebase Storage upload workaround was too slow / timed out
- Reverted — Groq remains primary

### 2026-07-16 — Signboard OCR restored to v1 config
- Reverted all AbortController/timeout changes that broke signboard
- Groq restored as sole signboard engine matching original v1 performance
- Separated ledger and signboard pipelines permanently

### 2026-07-16 — v2 app initiated
- Clean rebuild started from EduBloom v2 Data Architecture
- OCR cascade established: Groq → Together AI → Mistral → HuggingFace

---

## ✅ Current Status
| Feature | Status |
|---|---|
| Signboard OCR | ✅ Working |
| Ledger OCR (proxy) | 🧪 Deployed — needs real-device test |
| Commission tracker | 🚧 Not yet built |
| Deal status updates | 🚧 Not yet built |
| Leaderboard | 🚧 Not yet built |
| School visit log | 🚧 Not yet built |

---

## 🔜 Next Steps
1. Bayo tests ledger OCR in incognito on phone → confirm students are extracted
2. If debug panel shows 0 results → share what it says → Koda fixes
3. Build commission tracker UI
4. Build deal status + push notifications
5. Build agent leaderboard

---

*This document is maintained by Koda (Base44 Superagent). Updated before every build.*
