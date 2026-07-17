---
name: Tailwind before: transition-duration ordering bug
description: before:transition-all overwrites before:duration-* because of CSS generation order; use arbitrary transition value instead.
---

## Rule
Never combine `before:transition-all` + `before:duration-[Xms]` on the same element. Use a single arbitrary property instead: `before:[transition:transform_2000ms_ease]`.

**Why:** Tailwind v3 JIT generates `transitionProperty` utilities (which include a hardcoded `transition-duration: 150ms`) AFTER `transitionDuration` utilities in the stylesheet. So `before:transition-all` always overwrites `before:duration-2000`, making the duration revert to 150ms. The animation appears to snap instantly instead of animating.

**How to apply:** When animating pseudo-element transforms over a custom duration, write the full shorthand as one Tailwind arbitrary value:
- `before:[transition:transform_2000ms_ease]` for 2-second hover
- `group-focus-within:before:[transition-duration:4000ms]` to override just the duration on focus
