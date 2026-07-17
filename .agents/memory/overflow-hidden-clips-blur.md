---
name: overflow-hidden clips filter blur in Chrome
description: Any ancestor with overflow:hidden clips filter:blur() glow of descendants — remove it to allow outward glow to show.
---

## Rule
If a component's `filter: blur()` glow appears invisible in default state but appears on hover, check for an `overflow: hidden` ancestor. Chrome clips all `filter` visual effects of descendants at the first `overflow: hidden` ancestor boundary.

**Why:** In Chrome/Blink, `overflow: hidden` on a parent creates a compositing layer boundary that clips filter effects (blur, drop-shadow) of descendants — even when the blurred child is well within the parent's bounds, the outward blur spread gets clipped at the parent edge. The component appeared fine when focused (glow was prominent enough to survive) but invisible in default state (subtle glow was clipped away entirely).

**How to apply:** 
- When a blur-based glow component (like the conic-gradient search bar) is placed inside a layout wrapper with `overflow: hidden`, remove that `overflow: hidden` if content containment isn't critical.
- If containment IS needed, scope it narrowly to only the element that actually overflows (e.g., a horizontal ticker), not the entire section/page wrapper.
- Verified fix: `header.tsx` — changed `className="w-full overflow-hidden"` to `className="w-full"`.
