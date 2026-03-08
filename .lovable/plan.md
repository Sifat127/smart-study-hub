

## Add Hover Effects to Homepage Cards

Apply the same hover effects from the Departments page to the homepage department cards and feature cards.

### Changes in `src/pages/Index.tsx`

**1. Department cards (lines 245-267)** — Add `whileHover` lift, gradient glow overlay, spring-animated icon, title color transition, and arrow translate:
- Add `whileHover={{ y: -6 }}` to `motion.div`
- Add hover glow overlay div inside the Link
- Wrap icon in `motion.div` with `whileHover={{ scale: 1.15, rotate: 5 }}` spring animation
- Add `group-hover:text-accent` to title
- Add accent shadow on hover: `hover:shadow-[0_8px_30px_-8px_hsl(var(--accent)/0.25)]`
- Increase arrow translate to `group-hover:translate-x-2`

**2. Feature cards (lines 288-302)** — Add lift animation, glow overlay, icon spring animation, and title color transition:
- Wrap in `motion.div` with `whileHover={{ y: -6 }}`
- Add gradient glow overlay
- Wrap icon in `motion.div` with `whileHover={{ scale: 1.15, rotate: 5 }}`
- Add hover accent color to title

