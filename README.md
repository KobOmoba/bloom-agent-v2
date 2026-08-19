
---

## 2026-08-18 — GroqRotator in school-bloom-v2 (commit 5c696c8)
`_callGroqTeach()` now routes through GroqRotator. See production README for full details.

---

## 2026-08-18 — Teaching Tools Built in school-bloom-v2 (commits 248a040, 24657a0)

Lesson Note Generator + Question Generator built and committed to school-bloom-v2.
See production master README (bloom-agent/README.md) for full details.
Ported verbatim to School-Bloom same session.

# ⚠️ STANDING RULE — READ BEFORE TOUCHING ANYTHING

This file is the **sole README for every Edu-BLOOM sandbox app**.

**Every session that changes, builds, or adjusts any sandbox app MUST update this file
before the session ends. No exceptions. No deferring. Same session, always.**

Information about sandbox apps lives HERE — not in individual repo READMEs.
Individual sandbox repo READMEs must be kept minimal and must point here.
If you are about to write something in a sandbox repo README that belongs in this file, stop and put it here instead.

---

# Edu-BLOOM · Sandbox Master README

**Maintained by:** Bayo (Adebayo Adesanya) · AariNAT Company Limited
**Last updated:** 2026-08-18
**Kept by:** Claude (Anthropic) — updated every session per standing rule above

---

## 📦 Sandbox App Directory

| Sandbox | Repo | URL | Production Target |
|---|---|---|---|
| **Agent Sandbox** | `bloom-agent-v2` | kobomoba.github.io/bloom-agent-v2/ | → `bloom-agent` |
| **Portal Sandbox** | `bloom-portal-v2` | kobomoba.github.io/bloom-portal-v2/ | → `bloom-portal` |
| **School Sandbox** | `school-bloom-v2` | kobomoba.github.io/school-bloom-v2/ | → `School-Bloom` |
| **Agent Sandbox Alt** | `bloom-agent-sandbox` | kobomoba.github.io/bloom-agent-sandbox/ | → `bloom-agent` |
| **Portal Sandbox Alt** | `bloom-portal-sandbox` | kobomoba.github.io/bloom-portal-sandbox/ | → `bloom-portal` |
| **School Sandbox Alt** | `school-bloom-sandbox` | kobomoba.github.io/school-bloom-sandbox/ | → `School-Bloom` |

---

## ⚙️ Port Protocol — Sandbox → Production

All new features are built and field-tested in sandbox before going to production. This is non-negotiable.

1. **Build in sandbox.** No new feature goes directly into production. Use the relevant sandbox repo.
2. **Field-test on a real device.** Do not mark something done until it has been tested on an actual phone with real data (real ledger photos, real school sign, real register).
3. **Port verbatim.** Copy the exact working code from sandbox to production. No edits, no "while I'm here" changes, no deviations. If something needs to change, do it in sandbox first, re-test, then re-port.
4. **Bump cache in production immediately.** When a port is pushed to production, bump `?v=YYYYMMDD-descriptor` on the relevant file in `index.html` AND bump `CACHE_NAME` in `sw.js` in the same commit.
5. **Update both READMEs.** The production README (in `bloom-agent`) AND this sandbox README must both be updated in the same session when a feature is completed and ported.

---

## 🔧 Shared Sandbox Infrastructure

All sandbox apps connect to the **same Firebase project** as production: `educationbloom-699ed`.

This means:
- Sandbox Firestore reads/writes hit the SAME database as production
- Test with care — do not spam `admin_deals` or `admin_agents` with fake test data
- Use clearly labelled test entries (e.g. name them "TEST SCHOOL — IGNORE" or use a school ID starting with TEST-)
- Delete test entries from Firestore Console after testing

---

## 🤖 bloom-agent-v2 (Agent App Sandbox)

**Repo:** github.com/KobOmoba/bloom-agent-v2
**URL:** kobomoba.github.io/bloom-agent-v2/
**Source of truth for:** Advanced OCR architecture, multi-page ledger pipeline, experimental signboard scan improvements

### Purpose
Prove new agent features here before porting to `bloom-agent`. This repo is always ahead of production.

### What it has that production has adopted
- Multi-page Financial Ledger Scan (Section 3) — ported 2026-07-24
- Signboard Scan (Section 1) — ported 2026-07-19
- Smart Register Counter improvements — ported various dates
- `groqRateState` + adaptive cooldown — ported 2026-07-24
- `ledgerPageOrderMap` (page counter fix) — ported 2026-07-25
- HuggingFace cascade fallback — ported 2026-07-24
- `max_tokens: 4096` + `reasoning_effort:'none'` for ledger — confirmed aligned 2026-07-25

### Key OCR Architecture (v2 is the reference)
- `callGroqVision(prompt, imageBase64, max_tokens)` — primary provider
- `callHFVision()` — HuggingFace Qwen2.5-VL-7B fallback
- `callPaddleOCR()` — Oracle VPS PaddleOCR (dormant until `ocrServiceUrl` set in Firestore)
- `buildLedgerCascade()` — PaddleOCR → Groq → HuggingFace cascade builder
- `groqRateState` — tracks token budget live from response headers
- `ledgerCooldown()` — adaptive wait: short pause if healthy, exact Retry-After if budget low

### Production Alignment Checklist (run before any v2 → v1 port)
When porting any function from v2 to v1, verify these match EXACTLY in the ported code:
- [ ] `max_tokens` value
- [ ] `reasoning_effort` or `reasoning_format` field
- [ ] Image resize dimensions (`maxPx` param)
- [ ] JPEG quality value
- [ ] Deskew Hough-line thresholds
- [ ] `LEDGER_FINANCIAL_PROMPT` text (byte-for-byte)
- [ ] `LEDGER_FINANCIAL_READING_DISCIPLINE` text
- [ ] Blur variance threshold (`BLUR_VARIANCE_THRESHOLD_LEDGER`)
- [ ] Perspective correction thresholds

### Current State
- Feature-complete relative to bloom-agent production
- Pre-existing `pageNum = parseInt(idxKey) + 1` page counter bug also present here — was fixed in production 2026-07-25 but NOT yet back-ported to v2. Fix v2 before using it as the port source for any new ledger feature.

---

## 🖥️ bloom-portal-v2 (Portal Sandbox)

**Repo:** github.com/KobOmoba/bloom-portal-v2
**URL:** kobomoba.github.io/bloom-portal-v2/
**Source of truth for:** New portal features before they go to Bayo's live portal

### Purpose
Build and test new portal features here. Bayo can review them at the v2 URL before they go live at portal.edubloom.com.ng.

### Current State (2026-08-18)
- Minimal. The repo's README currently points to bloom-portal's MASTER_README.md (which does not exist). This sandbox README replaces that.
- No active development — changes have been going directly to `bloom-portal` production.
- If Bayo needs to test a portal change before it goes live, use this repo.

---

## 🎓 school-bloom-v2 (School App Sandbox)

**Repo:** github.com/KobOmoba/school-bloom-v2
**URL:** kobomoba.github.io/school-bloom-v2/
**Source of truth for:** New school app features before porting to School-Bloom

### Purpose
All new school app features are built here. When stable and field-tested, ported verbatim to `School-Bloom` (production).

### Current State (2026-08-18)
- Score OCR fix (2026-08-10) applied here AND to production simultaneously
- Score table panel display bug fixed simultaneously with production
- Finance AI, Navigation rebuild, BloomCollect — all built here first, then ported to School-Bloom (Step 4, 2026-08-09)
- Now aligned with production after Step 4 port

### What Remains Deferred (not yet in sandbox or production)
- HuggingFace cascade for School App — dormant until HF connectivity confirmed
- New OCR schemas (subjects, staff, alumni, expenses, sports_roster) — UI buttons only, no backend
- OCR Service (PaddleOCR VPS) — Bayo provisions Oracle Cloud VM, runs deploy.sh
- `v2_schools` orphaned Firestore collection — delete from Firebase Console
- Second Firebase web app (`appId: 0f9d338f`) — delete from Firebase Console → Project Settings → Your Apps

---

## 📜 Sandbox Change History (newest first)

### 2026-08-18 — Sandbox Master README established (this file)
Sole README for all sandbox/v2 apps created and committed to `bloom-agent-v2`. Standing rule written in. All sandbox repo READMEs updated to point here.

### 2026-08-10 — Score OCR Fixes Applied to school-bloom-v2
Same fixes as production: `reasoning_format:'hidden'` added to `_groqScoreOCR`, `max_tokens` raised to 8192, image resolution raised to 1800px for score sheets. Score panel display bug (all three term panels showing simultaneously) fixed to match production. Applied simultaneously with School-Bloom.

### 2026-08-09 — school-bloom-v2 ported verbatim to School-Bloom (Step 4)
Full codebase (`app.js`, `index.html`, `style.css`) copied exactly to School-Bloom production. This completed the v2 → v1 port for the school app. Firestore rules error introduced in this session (corrected in production 2026-08-10).

### 2026-07-25 — Page Counter Bug Found in bloom-agent-v2
`pageNum = parseInt(idxKey) + 1` bug confirmed present in v2 (identical to the production bug fixed 2026-07-25). NOT yet fixed in v2 — must be fixed before v2 is used as a port source for any new ledger feature.

### 2026-07-24 — Multi-Page Ledger Pipeline (bloom-agent-v2 → bloom-agent)
Multi-page ledger pipeline ported from v2 to production bloom-agent. V2 was the source of truth for: `processOnePage`, `processAllLedgers`, `retryFailedPages`, cascade builder, `groqRateState`, `callHFVision`, `callPaddleOCR`, `ledgerCooldown`, `mergePageIntoResults`, live feed, class-grouped results.

### 2026-07-19 — Signboard Scan + Financial Ledger Scan (bloom-agent-v2 → bloom-agent)
Signboard Scan pipeline (Groq Vision, `qwen/qwen3.6-27b`, auto-fills school details) ported from v2. Financial Ledger Scan (LEDGER_FINANCIAL_PROMPT, 62% crop, UNCLEAR discipline) proved in v2 and ported to production.

