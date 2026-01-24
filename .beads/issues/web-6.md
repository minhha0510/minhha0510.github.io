# web-6: Table of Contents with Scroll Spy

**Status:** completed
**Priority:** medium
**Type:** feature
**Created:** 2026-01-23
**Blocked-by:** web-2, web-3, web-5
**Blocks:** web-8

## Summary

Implement sticky table of contents that highlights current section as user scrolls through paper content.

## Why This Matters

Per Building_plan_v3.md goals:
- "Reading enjoyment: TOC navigation" - explicitly listed
- Helps readers navigate long academic papers
- Provides visual progress feedback
- Shows paper structure at a glance

## Acceptance Criteria

- [x] TOC generated from h2/h3 headings in paper content
- [x] Sticky positioning on desktop (in sidebar)
- [x] Static positioning on mobile (above content)
- [x] Active section highlighted with accent color
- [x] Smooth scroll to section on click
- [x] Scroll spy updates active link on scroll
- [x] Uses requestAnimationFrame for performance

## Technical Implementation

From v3 plan:
```astro
<nav class="toc">
  <ol>
    {headings.map(h => (
      <li><a href={`#${h.slug}`} class="toc-link">{h.text}</a></li>
    ))}
  </ol>
</nav>
```

CSS:
```css
.toc {
  position: sticky;
  top: 1rem;
  padding: 1rem;
  background: var(--bg-elevated);
  border-radius: 8px;
}
.toc-link.active { color: var(--accent); font-weight: 600; }

@media (max-width: 1023px) {
  .toc { position: static; margin-bottom: 1rem; }
}
```

Scroll spy script:
```javascript
const links = document.querySelectorAll('.toc-link');
const headings = document.querySelectorAll('h2[id], h3[id]');

let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    let current = null;
    headings.forEach(h => { if (h.offsetTop <= scrollY + 120) current = h; });
    links.forEach(l => l.classList.toggle('active', current && l.hash === '#' + current.id));
    ticking = false;
  });
});
```

## Performance Notes

- requestAnimationFrame prevents scroll jank
- Debounced updates via ticking flag
- Minimal DOM queries (cached selectors)
- CSS transitions for smooth highlight changes
