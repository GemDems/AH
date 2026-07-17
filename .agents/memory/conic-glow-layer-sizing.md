---
name: Conic glow layer h-full sizing issue
description: Glow layer divs with h-full w-full inherit parent height — if parent is sized by a smaller child, glow layers shrink to match and the glow disappears.
---

## Rule
When placing conic-gradient glow layers (absolute positioned, h-full w-full with max-h) inside a flex container whose height is determined by a smaller non-absolute child, always give the flex container an explicit height equal to the intended max-h of the outermost glow layer.

**Why:** Absolute elements with `h-full` resolve their height to the containing block's height. The containing block (`#poda`, a `relative` flex container) gets its height from its flex items (only `#main`, the actual input). If the input is 56px tall but the glow layers are supposed to be 70px, `h-full` gives them 56px — exactly the same size as the input. The input's solid background then covers the glow layers completely, making the glow invisible.

**How to apply:**
- Component: `animated-glowing-search-bar.tsx`
- Add `h-[70px]` to `#poda` (`relative flex items-center justify-center group h-[70px]`)
- This makes `h-full` on all glow layer divs resolve to 70px, giving them the correct 7px extension above and below the 56px input
- The flex container's `items-center` keeps the input centered vertically within the 70px
- The original component paste relied on the standalone demo page providing more height to the container via page-level CSS
