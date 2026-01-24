# web-8: Reading Utilities - Text Size & Scroll to Top

**Status:** completed
**Priority:** low
**Type:** feature
**Created:** 2026-01-23
**Blocked-by:** web-6, web-7

## Summary

Add text size controls (A-/A+) and scroll-to-top button for improved reading experience.

## Why This Matters

Per Building_plan_v3.md goals:
- "Reading enjoyment: adjustable text" - explicitly listed
- Accessibility for users with vision preferences
- Long papers benefit from quick return-to-top
- Minimal, non-intrusive controls

## Acceptance Criteria

### Text Size Controls
- [x] A- button decreases text size
- [x] A+ button increases text size
- [x] 4 size steps: 90%, 100%, 110%, 120%
- [x] Uses CSS custom property (--text-scale)
- [x] Persists choice in localStorage (optional)
- [x] Accessible: proper aria-labels

### Scroll to Top
- [x] Fixed button in bottom-right corner
- [x] Hidden when near top of page
- [x] Appears after scrolling 400px
- [x] Smooth scroll behavior
- [x] Clear visual affordance (↑ arrow)

## Technical Implementation

Text size controls (from v3 plan):
```astro
<button id="text-smaller" aria-label="Smaller text">A-</button>
<button id="text-larger" aria-label="Larger text">A+</button>

<script>
  const root = document.documentElement;
  const sizes = [90, 100, 110, 120];
  let idx = 1;

  document.getElementById('text-smaller').onclick = () => {
    idx = Math.max(0, idx - 1);
    root.style.setProperty('--text-scale', sizes[idx] / 100);
  };
  document.getElementById('text-larger').onclick = () => {
    idx = Math.min(sizes.length - 1, idx + 1);
    root.style.setProperty('--text-scale', sizes[idx] / 100);
  };
</script>

<style>
  .content { font-size: calc(1rem * var(--text-scale, 1)); }
</style>
```

Scroll to top (from v3 plan):
```astro
<button id="scroll-top" aria-label="Back to top">↑</button>

<style>
  #scroll-top {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    opacity: 0;
    transition: opacity 0.2s;
  }
  #scroll-top.visible { opacity: 1; }
</style>

<script>
  const btn = document.getElementById('scroll-top');
  window.addEventListener('scroll', () => btn.classList.toggle('visible', scrollY > 400));
  btn.onclick = () => scrollTo({ top: 0, behavior: 'smooth' });
</script>
```

## Design Notes

- Button styling should match theme (bg-elevated, borders)
- 44px minimum touch target for mobile
- Scroll-top fades in/out for polish
- Text controls can be in header or floating
