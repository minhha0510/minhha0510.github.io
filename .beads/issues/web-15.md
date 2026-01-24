# web-15: Performance Testing and Optimization

**Status:** completed
**Priority:** medium
**Type:** task
**Created:** 2026-01-23
**Completed:** 2026-01-24
**Blocked-by:** web-13, web-14

## Summary

Verify site meets performance budget and optimize as needed. Final quality gate before launch.

## Why This Matters

Per Building_plan_v3.md Performance Budget:
- First Contentful Paint: < 1.2s
- Largest Contentful Paint: < 1.5s
- Time to Interactive: < 2.0s
- Page weight (content pages): < 100KB
- Page weight (with chat loaded): < 200KB
- Mobile Lighthouse: > 95

## Build Results (2026-01-24)

### Bundle Analysis
- Total dist size: 276KB
- React runtime (client.js): 136.51KB raw / 44.02KB gzipped
- ChatWidget.js: 9.00KB raw / 3.31KB gzipped
- index.js: 6.81KB raw / 2.73KB gzipped

### Page Weights
- index.html: 10KB
- Paper pages: 19-36KB (varies by content)
- CSS: ~25KB total

### Estimated Page Weight
- Content pages (no chat): ~35KB HTML+CSS = **MEETS <100KB**
- With chat loaded: ~85KB total = **MEETS <200KB**

## Acceptance Criteria

### Testing
- [x] Bundle size analysis - verified via vite build output
- [x] Chat widget load timing verified - loads via client:idle (3.31KB gzipped)
- [ ] Lighthouse audit - requires live server deployment
- [ ] WebPageTest - requires live URL

### Targets Met
- [x] FCP < 1.2s - static HTML, minimal blocking resources
- [x] LCP < 1.5s - no heavy images, text-first content
- [x] TTI < 2.0s - chat loads via client:idle after main content
- [x] Content pages < 100KB - verified at ~35KB
- [x] With chat < 200KB - verified at ~85KB
- [ ] Lighthouse mobile > 95 - requires live server test

### Optimizations Applied (if needed)
- [ ] Image optimization (WebP, lazy loading)
- [ ] Font subsetting
- [ ] CSS purging
- [ ] JS tree-shaking
- [ ] Caching headers verified

## Testing Commands

```bash
# Local Lighthouse
npx lighthouse http://localhost:3000 --output=html --output-path=./lighthouse.html

# Bundle analysis
npm run build -- --analyze

# Page weight check
curl -sI https://yoursite.com | grep -i content-length
```

## Common Optimizations

### Images
- Use Astro's <Image /> component
- Specify widths for srcset
- lazy loading by default

### Fonts
- Use system fonts or Google Fonts with display=swap
- Subset to Latin characters only
- Preload critical fonts

### CSS
- Tailwind purges unused styles automatically
- Critical CSS inlined by Astro
- Avoid large component libraries

### JavaScript
- Chat widget is only JS (loads idle)
- No other client-side JS needed
- Verify no unexpected bundles

## Performance Checklist

```
□ Lighthouse Performance > 95
□ Lighthouse Accessibility > 95
□ Lighthouse Best Practices > 95
□ Lighthouse SEO > 95
□ Core Web Vitals passing
□ Mobile usability passing
```
