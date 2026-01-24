# web-9: Reading Time Display

**Status:** completed
**Priority:** low
**Type:** feature
**Created:** 2026-01-23
**Blocked-by:** web-1

## Summary

Calculate and display estimated reading time for each paper.

## Why This Matters

Per Building_plan_v3.md:
- Sets reader expectations before starting
- Common pattern on content-heavy sites
- Simple calculation, high value

## Acceptance Criteria

- [ ] Calculate reading time from word count
- [ ] Display in paper header (e.g., "8 min read")
- [ ] Use 220 words/minute as baseline (academic pace)
- [ ] Round up to nearest minute

## Technical Implementation

From v3 plan:
```astro
---
const words = content.split(/\s+/).length;
const minutes = Math.ceil(words / 220);
---
<span class="reading-time">{minutes} min read</span>
```

Can be calculated at build time and stored in frontmatter:
```javascript
// In content config or build script
function calculateReadingTime(content) {
  const words = content.split(/\s+/).length;
  return Math.ceil(words / 220);
}
```

## Design Notes

- Display near title/authors in paper header
- Muted text color (--text-muted)
- Small icon optional (clock/book)
- Format: "X min read" or "X minute read"

## Alternative: Word Count

Could also show word count: "2,500 words · 12 min read"
Useful for academic context where word count matters.
