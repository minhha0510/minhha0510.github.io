# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Research blog for a pharmacoepidemiologist, built with **Astro 5.x** (static site generator), **Tailwind CSS**, and vanilla JS. Deployed to **GitHub Pages** at `mh-nguyen.cv`.

No JavaScript frameworks - pure Astro components with vanilla JS for interactions (theme toggle, reading progress bar, clipboard copy).

## Commands

```bash
npm run dev        # Dev server at http://localhost:4321
npm run build      # Production build to dist/
npm run preview    # Preview production build
npm run extract papers/my-paper.docx  # Convert .docx to blog post template
```

Deployment is automated via GitHub Actions on push to `main` (Node 20, `npm ci && npm run build`).

## Architecture

- **Static-only output** - no server-side processing, no API routes
- **Content Collections** (Astro v3) with TypeScript schema validation in `src/content/config.ts`
- **File-based routing** in `src/pages/` - dynamic post routes via `posts/[slug].astro`
- **Single layout** (`src/layouts/Layout.astro`) wraps all pages with header, footer, and theme system
- **Two content collections**: `posts` (active blog posts) and `papers` (legacy)

### Theme System

CSS variables defined in `src/styles/global.css` with `[data-theme="dark"]` overrides. Theme persisted in `localStorage`. Script in `Layout.astro` sets `data-theme` attribute on `<html>` before render to prevent flash.

### LLM Integration

Posts have "Explore with AI" buttons that copy prompts to clipboard. Dedicated `/llm` page provides AI-readable site content. Prompt generation logic lives in `posts/[slug].astro`.

### Paper-to-Post Pipeline

`scripts/extract-paper.js` uses `mammoth` to convert `.docx` files to markdown blog post templates with pre-filled frontmatter.

## Content Schema (Posts)

Required frontmatter: `title`, `slug` (unique), `date` (YYYY-MM-DD), `readingTime`, `excerpt`. Optional: `category`, `tags[]`, `paperTitle`, `paperUrl`, `journal`, `authors`, `doi`.

## Styling

- CSS variables in `global.css` - accent color is `#d73a49` (light) / `#ff7b72` (dark)
- Content max-width: 720px
- System font stack for body, SF Mono/JetBrains Mono for code
- Dark mode via class-based Tailwind + `[data-theme="dark"]` CSS attribute selector

## Key Conventions

- Content-first site: prioritize clear writing, good typography, and accessibility (WCAG)
- Posts use personal voice ("I"/"we"), explain technical terms, include "For Patients" and "For Clinicians" sections
- Keep JS bundle minimal - use native browser features over libraries
- `Reflection_blog/` directory documents development lessons and design decisions
- `AGENTS.md` contains detailed project guide (excluded from git via `.gitignore`)
