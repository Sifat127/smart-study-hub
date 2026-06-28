## Goal
Apply the same animation kills and heavy-effect removals to tablet-sized screens so tablets feel as fast as mobile.

## Change
In `src/index.css`, raise the breakpoint of the existing mobile perf block from `max-width: 767px` to `max-width: 1023px`. That single change extends every current mobile optimization to all tablets (iPad portrait + landscape, up to just before desktop):

- Zero `animation-duration` / `transition-duration` site-wide (typewriter cursor blink kept as the only exception).
- Aurora orbs, noise overlay, float / drift / shimmer / glow-pulse layers hidden.
- Backdrop-blur on `.glass` / `.glass-strong` replaced with a solid surface (no per-frame GPU filter pass).
- Hover transforms on `.tilt-3d` / `.card-lift` disabled.
- `content-visibility: auto` on `main section` so off-screen content isn't painted.
- `scroll-behavior: auto`, iOS momentum scrolling, and `overscroll-behavior-y: none`.

Desktop (≥1024px) keeps the full aurora/animation experience.

## Why a media-query change is enough
All animated/heavy elements already use the same class names targeted in the existing mobile block (`aurora-orb`, `noise`, `animate-*`, `glass`, `card-lift`, `tilt-3d`). No component edits are needed — widening the breakpoint propagates the rules automatically.

## Files
- `src/index.css` — change `@media (max-width: 767px)` → `@media (max-width: 1023px)` and update the surrounding comment.

## Verification
- Resize preview to 768px and 1024px viewports: confirm tablet shows the flat/solid look with no orbs or transitions, and desktop still shows aurora + animations.
- Typecheck (no TS changes expected).