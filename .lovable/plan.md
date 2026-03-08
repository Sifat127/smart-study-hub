

## Add Counting Animation to Homepage Stats

Add a number count-up animation to the three stat values (15+, 330+, 500+) in the hero section of the homepage.

### Changes

1. **`src/components/CountUpNumber.tsx`** (new)
   - Reusable component that animates a number from 0 to target value
   - Uses `useEffect` + `requestAnimationFrame` for smooth animation
   - Accepts `end`, `duration`, `suffix` (e.g. "+") props
   - Triggers when element enters viewport via `IntersectionObserver`

2. **`src/pages/Index.tsx`**
   - Replace static stat values (`"15+"`, `"330+"`, `"500+"`) with `<CountUpNumber end={15} suffix="+" />` etc.
   - Update `stats` array to use numeric values instead of strings

