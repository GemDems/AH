---
name: Base64 image console logging perf pitfall
description: Why "publishing/saving is taking forever" bugs can be caused by verbose request-body logging when images are stored as base64 data URIs.
---

When an app stores uploaded images as base64 data URIs (inline in DB columns like `imageUrl`/`imageUrls` rather than in object storage), any `console.log(JSON.stringify(req.body))` or `console.log(JSON.stringify(data))` on the create/update path becomes a serious perf bug, not just log noise.

**Why:** `JSON.stringify` + `console.log` on a payload containing a multi-megabyte base64 string is slow (stringify cost + stdout/log-pipe write cost), and if it happens on both the frontend (before fetch) and backend (on request receipt, and again after processing) the delays stack. This can manifest as a request that appears to hang for 30–90+ seconds before erroring out, which reads to users as "publishing/saving is taking forever" with no obvious server-side error — the actual DB write is fast (tens to hundreds of ms).

**How to apply:** When a user reports a slow create/update/publish action in a form that accepts image uploads:
1. Check whether images are stored as base64 data URIs rather than URLs/object storage.
2. Grep the relevant API route(s) and the frontend mutation `mutationFn` for `console.log` calls that stringify the full request body/data object.
3. Replace with a minimal log (e.g. just the title/id) or remove entirely.
4. Verify the fix by timing a direct request with a several-MB base64 payload (e.g. via curl) before/after — should complete in well under a second once fixed.
</content>
