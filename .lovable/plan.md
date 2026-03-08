

## Typing Animation on Homepage Hero

Add a typewriter effect to the main heading text on the homepage hero section.

### Approach
- Create a reusable `TypewriterText` component that types out text character by character
- Apply it to the hero heading in `src/pages/Index.tsx` — specifically the "Your Complete Academic" and "Knowledge Hub" text
- Use a cycling typewriter effect on the accent line ("Knowledge Hub") that could rotate through related phrases like "Knowledge Hub", "Resource Center", "Study Platform"
- Pure React + CSS implementation using `useState` + `useEffect` with a blinking cursor

### Changes

1. **`src/components/TypewriterText.tsx`** (new)
   - Component that accepts an array of words/phrases and cycles through them with typing/deleting animation
   - Blinking cursor via CSS animation

2. **`src/pages/Index.tsx`**
   - Replace the static accent `<span>` ("Knowledge Hub") with the `TypewriterText` component
   - Cycle through phrases: "Knowledge Hub", "Resource Center", "Study Platform"

3. **`src/index.css`**
   - Add `@keyframes blink` for cursor animation

