# web-14: Home Page and Navigation

**Status:** completed
**Priority:** medium
**Type:** feature
**Created:** 2026-01-23
**Blocked-by:** web-1, web-2, web-3

## Summary

Create home page with paper listing and site navigation structure.

## Why This Matters

- Entry point for visitors
- Showcases available papers
- Provides site structure
- First impression of design aesthetic

## Acceptance Criteria

### Home Page
- [ ] Hero section with brief intro
- [ ] List of papers with titles and abstracts
- [ ] Links to individual paper pages
- [ ] Clean, minimal design
- [ ] Works with theme system

### Navigation
- [ ] Site header with logo/title
- [ ] Theme toggle button in header
- [ ] Navigation to papers section
- [ ] Mobile hamburger menu (if needed)
- [ ] Skip link for accessibility

## Technical Implementation

```astro
---
// src/pages/index.astro
import { getCollection } from 'astro:content';
import Layout from '../layouts/Layout.astro';

const papers = await getCollection('papers');
---

<Layout title="Research Papers">
  <section class="hero">
    <h1>Research by [Name]</h1>
    <p>Academic papers on [topic]</p>
  </section>

  <section class="papers">
    <h2>Papers</h2>
    <ul class="paper-list">
      {papers.map(paper => (
        <li class="paper-card">
          <a href={`/papers/${paper.slug}`}>
            <h3>{paper.data.title}</h3>
            <p class="abstract">{paper.data.abstract.slice(0, 200)}...</p>
            <span class="reading-time">{paper.data.readingTime} min read</span>
          </a>
        </li>
      ))}
    </ul>
  </section>
</Layout>
```

## Navigation Component

```astro
<!-- src/components/Header.astro -->
<header class="site-header">
  <a href="/" class="logo">Site Name</a>
  <nav>
    <a href="/#papers">Papers</a>
    <button id="theme-toggle" aria-label="Toggle theme">
      <span class="sun">☀️</span>
      <span class="moon">🌙</span>
    </button>
  </nav>
</header>
```

## Design Notes

- Minimal header that doesn't compete with content
- Paper cards with subtle hover effects
- Consistent with reading-focused aesthetic
- Mobile: stack cards vertically, full-width nav
