# web-5: Paper Page Template

**Status:** completed
**Priority:** high
**Type:** feature
**Created:** 2026-01-23
**Completed:** 2026-01-23
**Blocked-by:** web-4
**Blocks:** web-6, web-7

## Summary

Create Astro page template for rendering academic papers with proper typography, metadata display, and content structure.

## Why This Matters

Per Building_plan_v3.md goals:
- "Reading enjoyment" - papers need comfortable, scannable layout
- "Blazing fast" - static HTML generation, no client-side rendering
- Papers are the core content - they need excellent presentation

## Acceptance Criteria

- [x] Dynamic route for papers: `src/pages/papers/[slug].astro`
- [x] Frontmatter extraction working (title, authors, date, abstract, readingTime)
- [x] Paper header with title, authors, date, reading time
- [x] Abstract displayed prominently before main content
- [x] Proper spacing between sections
- [x] Academic styling (serif fonts for body optional, sans for UI)
- [x] Works with theme system (dark/light)

## Implementation Notes

Created the following files:
- `src/content/config.ts` - Astro content collection configuration with schema for papers
- `src/content/papers/*.md` - Copied paper markdown files from content/papers
- `src/layouts/PaperLayout.astro` - Full page layout with header, abstract section, and prose styling
- `src/pages/papers/[slug].astro` - Dynamic route using getStaticPaths and content collection

Updated `src/pages/index.astro` to use the content collection API instead of hardcoded data.

## Technical Implementation

```astro
---
// src/pages/papers/[slug].astro
import { getCollection } from 'astro:content';
import PaperLayout from '../../layouts/PaperLayout.astro';

export async function getStaticPaths() {
  const papers = await getCollection('papers');
  return papers.map(paper => ({
    params: { slug: paper.slug },
    props: { paper },
  }));
}

const { paper } = Astro.props;
const { Content } = await paper.render();
---

<PaperLayout frontmatter={paper.data}>
  <Content />
</PaperLayout>
```

## Layout Components

- `PaperLayout.astro` - Full page layout with header, content area, footer
- Paper header component with metadata display
- Abstract callout box styling
- Section heading styles with proper spacing

## Typography Notes

- Body text: 1rem base, 1.6 line-height
- Headings: clear hierarchy with spacing
- Tables: clean borders, alternating row colors optional
- Code/stats: monospace where appropriate
