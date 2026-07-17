---
name: LiquidBadge dark-mode border artifact
description: The original GitHubButton border classes create a visible white rectangle in dark mode on dark backgrounds; remove them for badge use.
---

## Rule
When adapting the LiquidBadge (originally a GitHubButton) for use on a dark header background, remove `dark:border-white border-black border-2`. Also remove any hardcoded width classes (`sm:w-36 w-14`) from the component so the `className` prop fully controls sizing.

**Why:** `dark:border-white border-black border-2` adds a bright white 2px border in dark mode. Against the `#0d0f1a` header background this renders as a hard white rectangle that the user sees as a "glowing rectangle box" artifact on top of the badge. The original component was designed for a standalone button on a white/black background, not as a text badge on a dark gradient.

**How to apply:** LiquidBadge wrapper class should be: `relative inline-block h-[2.7em] mx-auto group rounded-lg ${className}`. Let the caller set width via className.
