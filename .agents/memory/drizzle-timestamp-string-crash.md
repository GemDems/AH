---
name: Drizzle timestamp column crashes on raw JSON string
description: TypeError value.toISOString is not a function when an Express JSON body field lands in a Drizzle pgTable timestamp() column without conversion.
---

## The bug pattern

A `timestamp()` column in a Drizzle `pgTable` schema expects a native JS `Date`
object when passed to `.insert()`/`.update()` `.values()`/`.set()`. If a route
handler forwards a request-body field straight through (e.g.
`scheduledAt: req.body.scheduledAt || null`), it silently "works" as long as
the value is `null`/`undefined` — but the moment a caller sends an actual
date, it crashes at insert time with:

```
TypeError: value.toISOString is not a function
    at PgTimestamp.mapToDriverValue (.../pg-core/columns/timestamp.ts:...)
```

This happens because `JSON.stringify` turns a client-side `Date` into an ISO
**string** before it crosses the network; Express's JSON body parser leaves it
as a string; Drizzle's timestamp mapper assumes it already received a `Date`
and calls `.toISOString()` unconditionally.

**Why this is easy to miss:** the code often has a *correct* sibling route
(e.g. a PUT "update schedule" endpoint) that does
`value ? new Date(value) : null`, while a POST "create" endpoint for the same
table skips the conversion — so the bug only reproduces when a create request
includes that particular optional field, which can look intermittent.

## How to apply

When a Drizzle `timestamp` column can be set from a JSON API body, always
convert at the boundary: `field ? new Date(field) : null`. Grep every
insert/update call site touching that column, not just the one you're fixing
— apply the same conversion consistently rather than patching one route.
