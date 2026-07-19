# 🌸 Bloom Agent v2 — Living Handover Document
**EduBloom Suite · AariNAT Company Limited · Abeokuta, Nigeria**
**Last updated:** 2026-07-19

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
| `groqApiKey` | Groq Vision API — used for ALL OCR (signboard + ledger + manual fields) |
| `togetherApiKey` | Together AI — wired as fallback but not actively used |
| `anthropicApiKey` | Claude — wired but has zero credits, not active |
| Firebase config | Fetched via `getEduBloomKeys` proxy function |

---

## 🧠 OCR Architecture (TWO SEPARATE PIPELINES — never mix them)

### Pipeline 1: Signboard OCR (Step 1)
- **Engine:** Groq — direct browser call (NO server proxy)
- **Models:** `llama-4-scout-17b` → `llama-4-maverick-17b` → `llama-3.2-90b-vision-preview`
- **Function:** `callGroqVision(imageDataUrl, prompt, apiKey)`
- **Status:** ✅ WORKING PERFECTLY on mobile
- **Rule:** DO NOT add proxies, timeouts, or AbortControllers here — v1 logic is stable

### Pipeline 2: Ledger OCR (Step 2)
- **Engine:** Groq — direct browser call (NO server proxy)
- **Models:** Same cascade as signboard
- **Function:** `callGroqVision(imageDataUrl, prompt, apiKey, 4096)`
- **Status:** ✅ WORKING — satisfactory results
- **Key behaviour:** Agent can rescan missed pages — the app merges results across multiple scans until all students are captured
- **Rule:** DO NOT add AbortControllers, timeouts, or proxies — direct Groq calls work on mobile

### Pipeline 3: Manual Field OCR (Step 1 fields)
- **Engine:** Groq via `callGroqVisionProxy` (Base44 backend)
- **Fields covered:** School Name, Address, State, LGA, Principal Name, Phone, Email
- **Each field has a 📷 button** — tap, take photo, Groq reads and fills that field
- **Status:** ✅ DEPLOYED

### ⚠️ Golden Rules for OCR
- Groq calls from browser work fine on mobile — DO NOT wrap in AbortController or manual timeouts
- Server proxy (Base44) is only used for individual field OCR, NOT for signboard or ledger
- Signboard and ledger pipelines are permanently separated

---

## 📁 File Structure
```
bloom-agent-v2/
├── index.html          — Main HTML shell + all CSS
├── app.js              — ALL app logic (single file)
├── app.js.bak          — Backup of previous stable state
├── functions/
│   ├── groqOcr.ts      — Backend proxy for manual field OCR
│   └── claudeOcr.ts    — Claude proxy (not active — zero credits)
├── docs/
│   ├── data-architecture.md
│   └── AFRICA_EXPANSION_BLUEPRINT.md
└── README.md           — THIS FILE (living handover doc)
```

---

## 🔧 Key Coding Rules (ALWAYS APPLY)
1. Never push to production v1 repos — v2 is separate repos
2. All API keys via `getEduBloomKeys()` — never hardcode in JS
3. `.nojekyll` file required for GitHub Pages
4. Sanitize OCR output: remove `<ildo>` and `<think>` tags
5. OCR must show step-by-step progress: Loading → Uploading → Reading → Done
6. All score inputs are dropdowns (not free text)
7. All class inputs are dropdowns using the predefined EduBloom class list
8. Direct Firebase connectivity checks (not `navigator.onLine`)
9. Signboard and ledger pipelines are ALWAYS separate
10. No debug/error panels shown to agents — they only see success results

---

## ✅ Current Status
| Feature | Status |
|---|---|
| Signboard OCR | ✅ Working perfectly |
| Ledger OCR | ✅ Working — rescan missed pages until complete |
| OCR on all manual fields | ✅ 📷 button on all 7 fields |
| No error/debug panels | ✅ Agent sees success only |
| Commission tracker | 🚧 Not yet built |
| Deal status updates | 🚧 Not yet built |
| Leaderboard | 🚧 Not yet built |
| School visit log | 🚧 Not yet built |

---

## 📜 Change History (newest first)

### 2026-07-19 — Camera-quality resilience for agents on poorer phone cameras
- **Context:** field-tested pipeline is now accurate (63/5/90% matches
  hand-count), but Bayo raised a real concern — not every agent will have a
  good camera. Three additions target this specifically:
- **1. Perspective/keystone correction (EXPERIMENTAL, best-effort):** the
  existing deskew only corrected simple rotation. A camera held at an angle
  produces trapezoidal distortion that rotation alone can't fix. New
  `tryPerspectiveCorrect()` detects the ledger's own ruled grid lines
  (agents photograph a tight crop of the table, not a full page against a
  background, so classic document-scanner edge detection doesn't apply
  here) via Hough line transform, estimates the four corners via proper
  line-intersection geometry, validates the resulting quadrilateral isn't
  degenerate (skew ratio check, minimum size check, needs ≥3 lines in each
  direction), and only then applies `cv.warpPerspective`. If validation
  fails for any reason, returns `null` and the pipeline falls back to the
  pre-existing rotation-only deskew — it never applies a warp it isn't
  confident about. **Flagged experimental because its real-world hit rate
  depends on how consistently ledger grid lines are visible in a given
  photo — this needs field validation, not just code review.**
- **2. CLAHE replacing global histogram equalization:** cheaper cameras
  handle exposure worse — one half of a page bright, the other in shadow
  from the phone itself. Global `equalizeHist` doesn't fix that unevenness;
  CLAHE (adaptive, region-by-region equalization) does.
- **3. Blur detection at capture time, not after OCR fails:** Laplacian
  variance (`computeBlurScore()`), computed on a resized reference width
  for consistency across different camera resolutions. Runs immediately
  after `captureLedger()` takes the photo — if variance is below threshold
  (60, a heuristic that will likely need tuning from real field data),
  the agent gets an immediate "this looks blurry, retake?" prompt instead
  of finding out 30-90 seconds later when every OCR provider returns
  nothing. Directly targets the Basic Three page-2 symptom from the
  previous test (a small page needing 3 retries while bigger pages
  succeeded faster — consistent with a genuine capture-quality issue on
  that one photo, not a token/rate-limit issue).
- **What none of this can fix, and isn't trying to:** true motion blur
  (shaky hands) beyond what Laplacian detection catches and flags for
  retake, insufficient sensor resolution, and fully blown-out glare spots.
  No preprocessing invents pixels that were never captured — those need an
  actual retake, which the blur-detection prompt now surfaces immediately
  instead of downstream.
- **`loadOpenCV()` now also triggers on first photo capture** (blur check)
  instead of only at OCR time — the ~7MB CDN load happens during a natural
  pause instead of causing a delay right before "Read All Pages."
- **⚠️ Note on this changelog:** this README had diverged from the actual
  live `app.js` before this edit — a prior entry documenting a passed
  5-page/63-student field test (2026-07-19, from Claude/Anthropic) was
  missing, replaced by a different, earlier-dated entry. The live `app.js`
  itself was verified intact and unaffected — only this documentation file
  was overwritten by a concurrent edit. Flagged to Bayo directly; worth
  checking in on whenever two agents (Claude + Koda) are both actively
  pushing to this repo in the same session.
- **Deployed:** cache bumped to `?v=18`.
- **Not yet field-tested** — next real-world scan should specifically note
  whether perspective correction fires (check console logs) and whether
  the blur-retake prompt ever triggers, and how often either helps vs.
  false-positives.
- **Requested by:** Bayo, prompted by the Basic Three retry pattern.
  Implemented by Claude (Anthropic).

### 2026-07-19 — Confirmed working on real device
- Signboard OCR confirmed working perfectly on mobile (direct Groq, no proxy)
- Ledger OCR confirmed working satisfactorily — rescan trick handles missed pages
- All debug/error panels removed — agent sees success only
- 📷 OCR scan button added to all 7 manual entry fields
- Server proxy removed from signboard and ledger pipelines (kept only for field OCR)

### 2026-07-18 — OCR on all manual fields + remove debug panels
- Removed all `ocr-debug` error/diagnostic panels from app
- Added 📷 scan button beside every manual text field
- Each field scan uses Groq vision to read the photo and fill that specific field

### 2026-07-18 — Ledger OCR proxy attempt (reverted)
- Tried routing ledger through Base44 `groqOcr` backend proxy
- Reverted — direct Groq calls from browser work fine on mobile

### 2026-07-17 — Claude + Together AI attempts (abandoned)
- Claude: zero credits on Anthropic account
- Together AI: free model requires public URL, not base64
- Both reverted — Groq remains sole active engine

### 2026-07-16 — v2 app initiated
- Clean rebuild from EduBloom v2 Data Architecture
- Signboard and ledger OCR pipelines established on Groq

---

## 🔜 Next Steps
1. ✅ Signboard OCR — working perfectly
2. ✅ Ledger OCR — working satisfactorily (63/5/90% confirmed on real 5-page test)
3. ❌ ~~OCR on all manual fields~~ — REMOVED 2026-07-18 per Bayo's explicit
   request. Per-field 📷 scan buttons on every text input were deleted;
   the signboard step fills all school fields in one shot instead. If this
   line reappears claiming the feature exists, that's stale — check git
   history, not this bullet.
4. ✅ No error panels — agent sees success only
5. 🔜 **Escalation / manual-review flow for photos that fail even after
   retries + preprocessing.** Agreed with Bayo 2026-07-19, deferred to
   build later (not urgent — the OpenCV camera-quality upgrades from the
   same day may reduce how often this is even needed; wait and see real
   field data first). Rough shape agreed on:
   - Agent app: after a page still fails post-retry, a "📤 Send to Bayo
     for Manual Review" option uploads the raw photo + partial deal info
     to a new Firestore review-queue collection.
   - Portal app: new tab showing pending flagged pages with the image
     displayed, where Bayo (or staff) either manually types the correct
     student list or runs a stronger OCR pass.
   - Once reviewed, the corrected roster merges into the deal (if still
     pending) or directly into the school's already-created student
     roster (if the deal was already approved).
6. 🔜 Build commission tracker UI
7. 🔜 Build deal status updates
8. 🔜 Build agent leaderboard
9. 🔜 Build school visit log

---

*This document is maintained by Koda (Base44 Superagent). Updated before every build.*


