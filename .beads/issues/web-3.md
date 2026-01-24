# web-3: Mobile-First Responsive Layout

**Status:** completed
**Priority:** high
**Type:** feature
**Created:** 2026-01-23
**Blocked-by:** web-1
**Blocks:** web-6, web-7

## Summary

Implement mobile-first CSS with responsive breakpoints. Base styles target mobile, media queries add desktop enhancements.

## Why This Matters

Per Building_plan_v3.md goals:
- "Lightweight/responsive: Zero JS by default, mobile-first, <200KB pages"
- "majority of traffic might come from just mobile reading" (user requirement)
- Touch targets must be 44px minimum for accessibility

## Acceptance Criteria

- [ ] Base styles work on mobile (no media query = mobile styles)
- [ ] Content max-width: 65ch for optimal reading
- [ ] Touch targets: min 44px height/width for buttons and links
- [ ] Tablet breakpoint (768px): Increased padding
- [ ] Desktop breakpoint (1024px): Sidebar TOC layout
- [ ] Fluid typography with clamp()
- [ ] Responsive images with lazy loading

## Technical Implementation

From v3 plan:
```css
/* Mobile-first: no media query = mobile styles */
.content {
  max-width: 65ch;  /* Optimal reading width */
  margin: 0 auto;
  padding: 1rem;
  font-size: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
  line-height: 1.6;
}

/* Touch targets */
button, a { min-height: 44px; min-width: 44px; }

/* Tablet+ */
@media (min-width: 768px) {
  .content { padding: 2rem; }
}

/* Desktop: show sidebar TOC */
@media (min-width: 1024px) {
  .layout { display: grid; grid-template-columns: 250px 1fr; gap: 2rem; }
}
```

## Performance Notes

- 65ch width = ~45-75 characters per line, optimal for reading
- clamp() for font-size eliminates need for font-size media queries
- Mobile padding: 1rem (16px) for full-width content feel
