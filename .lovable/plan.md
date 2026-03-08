

## Homepage Redesign — Inspired by Reference UI

The reference image shows a premium, dark-themed landing page with floating PDF graphics, a clean centered layout, stats bar, and a polished modern feel. Here's the plan to transform the DIU Slider homepage to match that aesthetic.

### Changes to `src/pages/Index.tsx`

**Hero Section — Major Redesign:**
- Make hero much taller (`min-h-[90vh]`) with a truly dark background
- Add floating/rotating PDF-like decorative elements using framer-motion (animated divs with PDF icons at various angles, scattered around the hero)
- Add a small badge at top: "✦ Over 10,000+ course materials shared" (similar to "Over 10,000+ digital products sold")
- Redesign heading to have the keyword phrase in cyan/accent color: "Your Complete Academic **Knowledge Hub**" with the accent word on a new line, larger
- Subtitle stays similar but more refined
- Two CTA buttons side by side: "Explore Departments" (filled cyan) and "Get Started Free" (ghost/text style)
- Move search bar below CTAs with improved styling
- **Add a stats bar** below the search: 3 stats in a row with icons — e.g., "3 Departments", "150+ Courses", "500+ PDFs" — styled with green/cyan accent icons and bold numbers, similar to the reference's "2,400+ Products / 50K+ Downloads / 300+ Authors"

**Floating Decorative Elements:**
- Add 4-5 absolutely positioned, rotated `FileText` icons or styled divs that look like floating PDF documents around the hero, with subtle animation (float up/down using framer-motion)
- Low opacity, various sizes, positioned at corners/edges

**Departments Section — Subtle Improvements:**
- Add subtle gradient border on hover
- Slightly larger icons

**Features Section — Glass card effect:**
- Use `glass` utility class for feature cards with subtle border glow on hover

**Recent Materials — No major changes**, keep as-is.

**CTA Section — More dramatic:**
- Add floating decorative elements similar to hero

### Changes to `src/index.css`
- Add a `@keyframes float` animation for the floating PDF elements
- Add utility class `.animate-float`

### No backend changes needed.

### Summary of files to edit:
1. **`src/pages/Index.tsx`** — Major hero redesign with floating elements, stats bar, improved sections
2. **`src/index.css`** — Add float animation keyframes

