

## Footer Redesign: Minimalist & Modern UI

Based on the screenshot and current code, the footer will be redesigned with a cleaner, minimalist approach while keeping all existing content.

### Changes to `src/components/Footer.tsx`:

1. **Simplify layout** — Remove decorative blur elements, reduce visual noise
2. **Modern typography** — Use lighter font weights, more whitespace, subtle text hierarchy
3. **Cleaner grid** — 2-column on mobile, 4-column on desktop with balanced spacing
4. **Refined social icons** — Keep framer-motion hover animations but with simpler, borderless design
5. **Minimal divider** — Simple thin line instead of the heart icon divider
6. **Developer credit** — Streamlined, less boxy — inline text with subtle social links
7. **Add CIVIL** to departments list (currently missing from footer)
8. **Remove excessive glassmorphism** — Use flat, clean backgrounds with minimal borders

### Design Principles:
- More breathing room (generous padding/margins)
- Muted, low-contrast text for secondary info
- No background blur/glow decorations
- Clean icon + text alignment in contact section
- Subtle hover states (color shift only, no heavy transforms)

