## 2026-08-14 — Security Fixes (Post-Pentest)
Pentest conducted across all three sandboxes. Three code fixes applied to ALL six repos
(production + sandbox) simultaneously.

### Fixes applied
**Finding #7 — XSS via apostrophe in student names (all three apps)**
- `esc()` now encodes single quotes: added `.replace(/'/g,"&#39;")` to prevent onclick handler breakout
- Affects: student attendance buttons, agent deal cards, portal pending list

**Finding #1 — Plaintext Principal password in publicly-readable Firestore doc (portal)**
- `confirmApproval()`: password is now SHA-256 hashed via `_sha256()` before writing to `schools/{id}.staff[0].password`
- `repairSchool()`: same hash applied
- `_sha256()` helper added to portal_app.js (uses Web Crypto API, same as school portal's own hash)
- School-Bloom `_verifyPassword()` already handles 64-char SHA-256 hashes — no school-side change needed
- Admin records in `admin_approved_schools` still store plaintext for WhatsApp sending (Bayo's private use)

**Finding #2 — Commission inflation via localStorage tampering (portal)**
- `confirmApproval()` now re-queries `admin_agents` collection to get the REAL commission rate
- Rate is capped at 30% maximum regardless of what the deal doc claims
- Fallback to deal.agent.commission (min with 30%) if agent lookup fails

### Still open (require non-code changes)
**Finding #3 — `admin_agent_requests` fully public (Firestore rules)**
- Requires manual Firestore rules update — see rules text provided separately
- Until pasted: anyone can read all applicant names/phones and spam the portal with fake requests

**Finding #4 — RBAC client-side only**
- Architecture change deferred — all data is in SD object from login, server rules protect writes
- Real fix = lazy-load fee data from subcollections only for Principal/Bursar roles

**Finding #5 — SQ flat write re-exposes students (bloom-school-v2)**
- Deferred — requires removing all SQ.push('students',...) flat writes; subcollection writes are primary
- Low risk until a Principal has claimed Firebase Auth

**Finding #6 — Fake deal submission**
- Partially mitigated: portal now ignores submitted commission rate (Fix #2)
- Full fix requires agents to use Firebase Auth for deal creation

### Cache-bust
- All six repos: `?v=20260814-security` in index.html, CACHE_NAME updated in sw.js

---
# bloom-agent-v2 — Agent App PENTEST SANDBOX
**Last reset:** 2026-08-14
**Source:** bloom-agent production (agent.edubloom.com.ng)

Clean copy of the current live bloom-agent codebase for security testing.

## Live sandbox URL
https://kobomoba.github.io/bloom-agent-v2/

## What changed
- Wiped legacy sandbox code + docs/ folder
- Replaced with exact bloom-agent production code as of 2026-08-14

## Pentest status
See PENTEST_REPORT.md (tracked separately)

## Standing rules
- Fixes proved here → ported verbatim to bloom-agent
- Cache-bust: bump ?v= in index.html + CACHE_NAME in sw.js every push
- Never commit CNAME to this repo
