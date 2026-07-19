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

### 2026-07-19 — Full 5-page field test PASSED (63 students, 5 classes) + speed fix for retry count
- **Result:** the same 5-page ledger from the earlier field tests came back
  at **63 students across 5 classes, 90% confidence** — matches the hand
  count from the original photos almost exactly (~62-65 estimated). Crop
  width, reading-discipline prompt, and payment-status fixes are confirmed
  working on real data.
- **Remaining complaint:** it took 5-6 manual "retry failed page" taps to
  get there, both in incognito and normal browser. Bayo's first instinct
  was "tighter prompt or better cropping" — worth stating clearly: **that
  was not the problem.** The 63/5/90% result proves the prompt and crop
  are already working. The retry count was a rate-limit efficiency problem,
  not an accuracy problem.
- **Root cause:** the app only found out it was rate-limited *after* a 429,
  then reactively backed off. It never looked at the budget it actually
  had left before making the next request.
- **Fix:** Groq sends `x-ratelimit-remaining-tokens` and
  `x-ratelimit-reset-tokens` on every response, success or not. The app now
  reads these after every call and uses them for an **adaptive** cooldown:
  if there's comfortably enough token budget left for another page, barely
  pause at all (~3s courtesy buffer). If the budget is genuinely low, wait
  exactly what Groq reports is left in the window — not a blind 20s guess,
  and not a reactive scramble after already getting a 429. This should
  collapse most runs down to needing zero or one retry instead of 5-6.
- **Deployed:** cache bumped to `?v=17`.
- **Not yet re-tested** — next test should time how long the same 5-page
  scan takes end-to-end and how many manual retries (if any) it needs now.
- **Found by:** Bayo. Root cause and fix by Claude (Anthropic).

### 2026-07-18 — Targeted retry: failed pages only, not the whole scan
- **Bayo's point:** retrying a failed page shouldn't force re-scanning all 5
  pages again — that wastes time and burns Groq quota re-reading pages that
  already succeeded.
- **Fix:** refactored the per-page OCR logic into two reusable pieces —
  `processOnePage()` (compress + cascade + parse for one page) and
  `mergePageIntoResults()` (dedup + status derivation + push into
  `allStudents`/`classGroups`) — shared by both the full "Read All Pages"
  scan and a new `retryFailedPages()` function.
- **The failed-page warning banner now has a "🔁 Retry just page(s) X, Y"
  button** that loops ONLY over the page numbers in `failedPages`, using
  the same 20s cooldown + Retry-After-aware backoff as a full scan, but
  touches nothing that already succeeded. Already-found students are
  untouched; only the missing pages get re-sent to Groq.
- **Retake still works with this:** if an agent hits "Retake" on a specific
  page's thumbnail first, `ledgerImages[idx]` gets overwritten with the new
  photo, so the targeted retry automatically picks up the fresh capture.
- **Deployed:** cache bumped to `?v=16`.
- **Found by:** Bayo. Fixed by Claude (Anthropic).

### 2026-07-18 — FIX: random page failures across repeated runs on identical photos
- **Bayo's report:** same 5 ledger photos, run 3 separate times (2x
  incognito, 1x normal browser) — 3 different total student counts, and a
  *different, seemingly random* page failed each time. Not the same page
  twice. This ruled out an image-quality problem (that would fail the same
  page consistently) and pointed straight at rate limiting.
- **Good news first:** payment status detection now clearly working —
  this run showed a real mix of PART PAID / FULLY PAID / NEEDS REVIEW
  instead of everyone defaulting to OWING, and the failed-page warning
  banner (yesterday's fix) correctly named pages 3 and 5.
- **Root cause:** `callGroqVision()`'s 429/503/529 retry only waited a
  fixed 3 seconds before retrying, for a maximum of 2 retries (~6 seconds
  total). Groq's free-tier rate limit is a rolling **per-minute** token
  budget — 6 seconds is nowhere near long enough for that window to clear.
  Whichever page happened to land right as the budget ran out got a 429,
  retried too briefly, gave up, and fell through to HuggingFace (which
  likely also failed or wasn't configured). Because the exact page that
  crosses the token threshold depends on cumulative usage and timing, a
  different page "randomly" failed on each run — that's the signature of
  a race against a shared rate-limit window, not a code bug tied to a
  specific image.
- **Fix:** `callGroqVision()` now reads the `Retry-After` response header
  and waits exactly that long (clamped 3s-65s) instead of guessing 3s.
  Falls back to a 20s assumption only if the header is missing. Retry
  budget for rate-limit responses raised to 4 attempts (was 2), since this
  is a fully recoverable, expected condition — not a real error. Inter-page
  cooldown bumped 15s -> 20s as extra headroom.
- **Deployed:** cache bumped to `?v=15`.
- **Not yet re-tested** — next test should run the same 5 pages 2-3 times
  in a row and confirm the SAME total comes back every time, not just a
  higher one.
- **Found by:** Bayo, from running the same test 3 times and comparing
  results. Root cause and fix by Claude (Anthropic).

### 2026-07-18 — FIX: payment status defaulting to OWING for everyone (₦928,000 false-owing bug)
- **Bug report (external code review, cross-checked against the actual
  32-student test run):** every student was tagged OWING regardless of
  what the ledger actually said — including rows explicitly marked
  "FULLY PAID" in the handwriting. Summary showed 0% Fees Paid and
  ₦928,000 outstanding for Future Promise Comprehensive College, a
  confidently wrong financial figure that was about to be submitted.
- **Root cause — deeper than the suggested fix assumed:** the previous
  **50%** crop cut almost exactly through the column region where
  "FULLY PAID"/"PAID" is physically handwritten (around the 1st Part
  Payment / Teller No columns). The status evidence wasn't being ignored
  by the prompt — it usually wasn't even in the image the model received.
  Confirmed by re-examining the original ledger photos: paid annotations
  consistently sit right at that boundary. Widened crop from 50% -> **62%**
  to reliably include that region while still cropping out the 2nd/3rd
  payment columns that don't matter.
- **Also applied the suggested prompt-discipline fix** (from an external
  prompt-engineering review): replaced the fragile `fully_paid` boolean
  with a `payment_status` enum (`PAID`/`PARTIAL`/`OWING`/`UNCLEAR`), added
  a shared `READING_DISCIPLINE` block (digit-by-digit numbers, active
  keyword scanning instead of defaulting, "when in doubt say UNCLEAR not
  OWING"), and added per-row `ocr_confidence` (HIGH/MEDIUM/LOW) from the
  model itself, folded into the existing numeric confidence score.
- **New "NEEDS REVIEW" status:** when the model genuinely can't tell,
  the student is now flagged NEEDS REVIEW — a distinct state, never
  silently folded into OWING. Shown with its own badge (purple, `?`) in
  both the agent results screen and critically **the principal-facing
  pitch screen**, where the outstanding-fees total now explicitly
  excludes NEEDS REVIEW students' fees from the confident total instead
  of counting them as owed by default (same bug, one layer up — fixed in
  both places).
- **PaddleOCR (VPS fallback)** mapping updated to match: its boolean now
  maps to PAID/UNCLEAR (never OWING) for the same reason.
- **Deployed:** cache bumped to `?v=14`.
- **Not yet re-tested on device.**
- **Found by:** external code review + bug report cross-referenced
  against real ledger photos. Root cause and fix by Claude (Anthropic).

### 2026-07-18 — SECOND critical fix: whole-page OCR failures were completely silent
- **Bayo caught this one directly:** the 5-page field test photographed
  5 pages, but the results only showed **4 classes** — "BASIC 1 & BASIC 2"
  (11 students, confirmed present in the photo thumbnails) vanished
  entirely with zero error, zero warning, nothing in the UI.
- **Root cause:** in `processAllLedgers()`, when every provider in the
  cascade returns 0 students or throws for a given page, the code already
  had a comment saying *"diagnostic screen removed — agent only sees
  results"* — meaning a fully failed page was silently skipped. No banner,
  no log visible to the agent, no record that anything went wrong. An
  agent could submit a deal missing an entire class of students and never
  know it.
- **Fix:** added a `failedPages` array that records the page number
  whenever a page's cascade fully fails. `showLedgerResults()` now renders
  a red warning card at the top of the results listing the exact page
  number(s) that returned 0 students, telling the agent those students are
  NOT included and to retake the photo(s) or add them manually.
- **This is a different bug from the max_tokens truncation fixed earlier
  today** — that one caused partial data loss on large pages; this one
  caused total data loss on a page with a normal row count (11), most
  likely a transient provider failure (network blip / rate limit) that
  the retry logic didn't recover from before falling through.
- **Deployed:** cache bumped to `?v=13`.
- **Found by:** Bayo, from the field test screenshots. Fixed by Claude
  (Anthropic), via GitHub API push.

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










