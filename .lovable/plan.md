

## Highlight Developer Credit Section in Footer

Make the developer attribution section more visually prominent with better styling:

**File: `src/components/Footer.tsx`** (lines 76-82)

- Increase opacity on all text elements for better visibility
- Make "A.S. Sifat Ahmed" name stand out with accent color and bolder weight
- Add a subtle gradient or glow effect to the name
- Increase "Web Design & Architecture by" label visibility
- Make university line more visible with accent-tinted color

```tsx
<div className="text-xs text-primary-foreground/60 space-y-1">
  <span className="text-primary-foreground/50 uppercase tracking-widest text-[10px]">Web Design & Architecture by</span>
  <br />
  <span className="font-bold text-accent text-sm">A.S. Sifat Ahmed</span>
  <br />
  <span className="text-primary-foreground/60">Student of CSE, Daffodil International University</span>
</div>
```

Key changes: accent color on name, bolder font, uppercase tracking on label, slightly larger name size, increased opacity across all elements.

