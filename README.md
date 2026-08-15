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
