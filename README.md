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

### 2026-07-18 — CRITICAL FIX: ledger OCR silently truncating large pages
- **5-page real field test (Future Promise Comprehensive College):** ground
  truth manually counted from the actual ledger photos was ~62-65 students
  across 5 pages (Basic 4&5: 7, Basic 3: 7, Basic 1&2: 11, Nursery+Creche:
  ~15, K-G: ~25). The app returned only 32 total.
- **The pattern was the giveaway:** both 7-row pages (Basic 4&5, Basic 3)
  came back 100% correct. The two pages with far more rows (Nursery: 8 of
  ~15, K-G: 10 of ~25) both came back roughly cut in half. That is not a
  reading-quality signature — that is a **cutoff** signature.
- **Root cause:** `callGroqVision()` had `max_tokens:600` hardcoded and
  shared between signboard (needs ~4 short fields, 600 is fine) and ledger
  (needs one JSON object per student — 25-30 students blows past 600 tokens
  and the response gets cut off mid-array). Every row after the cutoff
  point was silently lost with no error shown.
- **Fix:** `callGroqVision()` now takes a `maxTokens` parameter. Signboard
  passes `500` (unchanged behavior). Ledger passes `4096` (enough headroom
  for 100+ students per page — no realistic photographed page should hit
  this ceiling).
- **Also added:** a partial-recovery fallback in `parseLedgerJSON()` — if a
  future truncation still happens (freak huge page), the app now salvages
  whatever complete student objects exist in the raw text instead of
  returning zero students for the whole page.
- **Deployed:** cache bumped to `?v=12`.
- **Not yet re-tested on device** — next test should re-scan the same
  5-page ledger and confirm totals land at ~62-65 instead of 32.
- **Found and fixed by:** Claude (Anthropic), via GitHub API push.

### 2026-07-18 — First real field test (Future Promise Comprehensive College) — 2 bugs found + fixed
- **First live test result:** signboard OCR, ledger scan (8 students, Basic 1 & 2),
  auto-tier selection, and deal submission all worked end-to-end on a real
  device in ~2 minutes onboarding time. First confirmation the crop fix +
  qwen3.6-27b direct call actually works on a real handwritten ledger.
- **Bug found — student count varied between runs (10 vs 8) on the same page:**
  `callGroqVision` had `temperature:0.2`, allowing small non-determinism.
  For financial ledger reading we want zero creativity — same photo should
  always produce the same result. Changed to `temperature:0`.
- **Bug found — "Show Principal" fullscreen pitch screen looked blank:**
  Not actually blank — `body.presenting` sets the background to solid black,
  but `#sec-step3`'s content (hero card + one class bar) only fills the top
  portion of the screen with no height/centering rule, leaving a large empty
  black area below it that read as a crash to whoever's holding the phone.
  Fixed: `#sec-step3` now gets `min-height:100vh` + flex-centered content
  while presenting.
- **Deployed:** cache bumped to `?v=11`.
- **Found and fixed by:** Claude (Anthropic), via GitHub API push.

### 2026-07-18 — Base44 proxy removed, 227 lines of dead code deleted, ledger prompt hardened
- **Base44 proxy eliminated:** `callGroqVisionProxy()`, `GROQ_PROXY_URL`, and
  `CLAUDE_PROXY_URL` removed entirely. Ledger OCR now calls Groq directly via
  the same `callGroqVision()` used by signboard (`qwen/qwen3.6-27b`, proven
  config, 45s timeout + retry). The proxy was a black box on Base44's platform
  (not in this GitHub repo) — its actual server-side model config couldn't be
  verified or fixed, and per this same changelog it was likely running the
  same dead Llama-4-Scout/Maverick models that broke signboard. Direct calls
  put full control back in this repo.
- **Ledger crop fix restored:** `compressLedger()` was cropping the full page
  again despite a comment claiming otherwise (see 2026-07-18 entry below —
  this was the actual root cause of "why can't qwen read a ledger"). Left-50%
  crop restored; `LEDGER_PROMPT` simplified back to 6 core columns +
  `fully_paid` boolean, matching what survives the crop.
- **Ledger prompt hardened:** added digit-by-digit reading instruction and a
  self-consistency check (`total == balance_bf + termFees`) per a code-review
  suggestion — misread digits (7 vs 1, 0 vs 6) were silently producing wrong
  totals with no visible error.
- **Dead code removed (227 lines):** `callGeminiVision`, `callMistralVision`,
  `callClaudeVision`, `callTogetherVision`, `uploadToStorageTemp`,
  `callGroqText`, `fallbackExtract` — none were reachable from any cascade.
  Also removed an orphaned DeepSeek-manual-key-entry subsystem
  (`showDeepSeekKeyPrompt`, `saveDeepSeekKey`, `clearDsKeyAndRetry`,
  `retryLedger`, `_dsKey`) that had no HTML hooks left after the debug panel
  was removed — 100% unreachable. `_getApiKeys()` simplified to only fetch
  `groq`/`hf`/`ocrServiceUrl` since Mistral/Together/Anthropic keys are no
  longer used anywhere.
- **Model note:** confirmed via Groq's own deprecation page — Llama 4 Scout
  was deprecated **2026-07-17** (one day before this fix), Llama 4 Maverick
  03/09/26. `qwen/qwen3.6-27b` is Groq's official recommended replacement and
  is currently the best vision model available on free/developer tier.
  `qwen/qwen3-vl-32b-instruct` (32B, newer) exists but is Enterprise-only —
  not reachable on this account.
- **Deployed:** cache bumped to `?v=10`.
- **Found and fixed by:** Claude (Anthropic), via GitHub API push.

### 2026-07-18 — Signboard OCR fixed (was using dead models) + per-field scan removed
- **Problem:** `callGroqVision()` (used by the signboard step) tried three
  deprecated models — `llama-4-scout-17b`, `llama-4-maverick-17b`,
  `llama-3.2-90b-vision-preview`. All three are decommissioned as of
  June 17, 2026 and return 400s. Result: signboard OCR always failed,
  agent always saw "AI could not read signboard — fill manually."
- **Fix:** Replaced the model cascade with `qwen/qwen3.6-27b` — the exact
  model + call pattern (`reasoning_effort:"none"`, `response_format:
  json_object`, 45s timeout, retry on 429/503/529) already proven working
  in **v1 production's** ledger OCR (`bloom-agent/app.js`). Signboard now
  calls Groq directly (not the Base44 proxy) with this working config.
- **Also removed:** the per-field 📷 scan buttons on every manual field
  (school name, address, state, LGA, principal, phone, email) added in
  the 2026-07-18 "OCR on all manual fields" change. Bayo wants the
  signboard step to fill everything in one shot — no per-field scanning
  clutter. `scanField()` function removed from `app.js`; camera buttons
  and hidden file inputs removed from `index.html`.
- **Note:** `callGroqVisionProxy()` (Base44 proxy) is UNCHANGED — ledger
  OCR still uses it and is unaffected by this fix.
- **Deployed:** cache bumped to `?v=9`.
- **Found and fixed by:** Claude (Anthropic), via GitHub API push.

### 2026-07-18 — CRITICAL FIX: app.js syntax error blocked ALL logins
- **Problem:** The "remove debug panels" edit left a stray `].join('');` inside
  `showDeepSeekKeyPrompt()` (line 344) with no matching array — a hard
  JavaScript syntax error. This broke parsing of the ENTIRE `app.js` file,
  so no function (including `doLogin`) was ever defined. Every button in
  the app, including Login, silently did nothing.
- **Fix:** Removed the orphaned `].join('');` line. Verified with `node -c`
  that the file now parses cleanly.
- **Deployed:** `app.js` fixed + `index.html` cache-bust bumped to `?v=8`
  so cached broken copies on agents' phones get replaced.
- **Found and fixed by:** Claude (Anthropic), via GitHub API push — not Koda.
- **Lesson:** Any edit that removes a block of code must be checked for
  matching braces/brackets before commit. A `node -c app.js` syntax check
  should run before every deploy going forward.

### 2026-07-18 — OCR on all manual fields + remove debug panels
- **Requirement:** Agent should ONLY see success results — no error dumps, no debug text
- **Fix 1:** Remove `ocr-debug` panel entirely from app
- **Fix 2:** Add 📷 scan button beside every manual text field (school name, address, state, LGA, principal name, phone, email)
- **Fix 3:** Each field scan uses Groq vision to read the photo and fill that specific field
- **Ledger 0 students:** Silent retry — no error message shown to agent

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
1. ✅ Ledger OCR routed through proxy — Bayo to test
2. ⏳ Remove ALL debug/error panels — agent only sees success results
3. ⏳ Add OCR scan button to every manual text field (school name, address, state, LGA, principal name, phone, email)
4. Build commission tracker UI
5. Build deal status + push notifications
6. Build agent leaderboard

---

*This document is maintained by Koda (Base44 Superagent). Updated before every build.*





