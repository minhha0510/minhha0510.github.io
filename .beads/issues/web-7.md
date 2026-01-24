# web-7: Reading Progress Indicator

**Status:** completed
**Priority:** medium
**Type:** feature
**Created:** 2026-01-23
**Blocked-by:** web-3, web-5
**Blocks:** web-8

## Summary

Add visual progress bar showing how far through the paper the reader has scrolled.

## Why This Matters

Per Building_plan_v3.md goals:
- "Reading enjoyment: reading progress" - explicitly listed
- Gives readers sense of document length
- Provides motivation to continue reading
- Subtle, non-intrusive feedback

## Acceptance Criteria

- [x] Progress bar shows percentage of page scrolled
- [x] Positioned at top of viewport or in TOC
- [x] Uses accent color for filled portion
- [x] Smooth updates on scroll
- [x] Uses CSS custom property for width (no reflow)
- [x] Works on both mobile and desktop

## Technical Implementation

From v3 plan (integrated with TOC):
```astro
<div class="progress-bar" id="progress"></div>

<style>
  .progress-bar { height: 3px; background: var(--border); }
  .progress-bar::after {
    content: '';
    display: block;
    height: 100%;
    width: var(--progress, 0%);
    background: var(--accent);
  }
</style>

<script>
  const progress = document.getElementById('progress');

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const pct = Math.min(100, (scrollY / (document.body.scrollHeight - innerHeight)) * 100);
      progress.style.setProperty('--progress', pct + '%');
      ticking = false;
    });
  });
</script>
```

## Design Notes

- 3px height is visible but not distracting
- Uses --accent color for consistency with theme
- --border color for unfilled portion
- Can be combined with scroll spy listener for efficiency

## Alternative Position

Could also be fixed at very top of viewport:
```css
.progress-bar-fixed {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}
```
