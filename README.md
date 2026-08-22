# bloom-agent-v2 — Agent App Sandbox

**Sandbox for:** bloom-agent (agent.edubloom.com.ng)
**Sandbox-first rule:** All fixes proved here before production gets them.
**Last updated:** 2026-08-20

---

## Current Versions

| File | Version |
|------|---------|
| app.js | `?v=20260820-security` |
| sw.js CACHE_NAME | `edubloom-bloom-agent-v2-20260820-security` |

---

## Session History

### 2026-08-20 — Backport from production + cache-bust sync

Production bloom-agent received an XSS fix this session (OCR name list was using
`n.replace(/<\/g,'&lt;')` — partial escape — instead of `esc(n)` — full sanitiser).
The esc(n) fix was applied to bloom-agent-v2 earlier in this session (before production
was fixed), so no code change was needed here on backport.

Cache-buster bumped: `?v=20260820-security`
CACHE_NAME bumped: `edubloom-bloom-agent-v2-20260820-security`

---

### 2026-08-19 — Security hardening

Firestore rules published to Firebase Console (shared project). Rules lock down
`admin_settings`, `admin_cac`, `admin_activity`, `admin_approved_schools` to Bayo's UID.
`admin_agents`, `admin_deals`, `admin_ledger`, `public_ocr_keys` remain public-read
for agent login and earnings display.

---

### 2026-08-18 — Groq Rotator + OCR keys from Firestore

OCR keys loaded from `public_ocr_keys/main` (no Base44, no hardcoded keys).
Groq Vision primary, HuggingFace fallback, OCR.space last resort.

---

## Standing Rules (this repo)

- Sandbox-first: prove all features here before Bayo approves production port
- After every push, update this README in the same push (no exceptions)
- node --check app.js before every push (this file passes cleanly)
- Cache-bust: bump ?v= in index.html AND CACHE_NAME in sw.js together, always
- No Base44, no hardcoded API keys, no self-registration bypass

## Commission Structure (reference)

| Type | Rate |
|------|------|
| New school | 20% of term fee |
| Renewal (permanent, original closer) | 10% of term fee |
