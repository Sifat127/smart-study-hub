

## Add Large Transparent Watermark Logo to Background

Add the DIU StudyBank logo as a large, centered, semi-transparent watermark in the global background of the Layout component. This will create a subtle branded look across all pages.

### Changes

**File: `src/components/Layout.tsx`**

- Import the logo from `@/assets/logo.png`
- Add a large centered `<img>` element inside the existing fixed background `div`, positioned at the center of the viewport
- Style it with very low opacity (~0.04-0.06), large size (~500-600px), and `object-contain` to keep it subtle and decorative
- The image will sit behind all content (z-0) and be non-interactive (`pointer-events-none`)

```tsx
import logo from "@/assets/logo.png";

// Inside the fixed background div, add:
<img 
  src={logo} 
  alt="" 
  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] object-contain opacity-[0.05] pointer-events-none select-none"
/>
```

Only one file needs editing. The watermark will appear on every page since Layout wraps all routes.

