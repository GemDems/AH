---
name: Express error handler that crashes the process
description: An Express 4-arg error middleware that re-throws after responding will crash the whole Node process on any unhandled error, causing requests to appear to "hang forever".
---

Express error-handling middleware (the `(err, req, res, next)` signature) runs synchronously in the request dispatch call stack. If it calls `res.status(...).json(...)` and then `throw err` (or otherwise re-throws), that throw is NOT caught by Express — it propagates as an uncaught exception and can crash the entire Node process.

**Why:** Any route that can produce an unhandled error (a thrown exception, a rejected promise reaching Express's default handling, or a body-parser error like `PayloadTooLargeError` from an oversized JSON body) will hit this middleware. The response may already be sent, but the process then dies. The in-flight request's client sees a hung/reset connection (not a clean error), and every subsequent request fails until the workflow/process supervisor restarts the server. This reads to users as "the request just hangs forever" or "it randomly stops working," not as an obvious crash.

**How to apply:** When requests intermittently hang, time out, or the app "randomly stops responding" (especially after a specific trigger like a large upload), check the final error-handling middleware in the Express entrypoint (commonly `server/index.ts`) for any re-throw after sending a response. Fix: log the error, guard with `if (!res.headersSent)` before responding, and do NOT re-throw. Also check body size limits (`express.json({ limit })`) — payloads exceeding the limit throw `PayloadTooLargeError`, which is a common trigger for hitting this exact bug when uploads include large base64 data (e.g., images).
