# Project Agent Guide

## Project Overview

This is a **research blog** built with Astro, designed to explain pharmacoepidemiology research in accessible, engaging terms. The site uses a clean, Chalk-inspired design with dark/light mode support.

## Architecture

### Framework
- **Astro 5.x** — Static site generator
- **Tailwind CSS** — Utility-first styling
- **No React** — Pure Astro with vanilla JS for interactions

### Content Management
- **Content Collections** — Posts stored in `src/content/posts/`
- **Frontmatter Schema** — TypeScript-validated metadata
- **Static Generation** — Pre-rendered HTML at build time

### Key Design Decisions
1. **No RAG/Chat** — Removed for performance; replaced with LLM prompt buttons
2. **Blog-First** — Papers are explained as narrative blog posts, not just displayed
3. **Static Only** — No server-side processing, deployable anywhere

## File Organization

```
src/
├── content/
│   ├── config.ts           # Content collection schemas
│   ├── posts/              # Blog posts (markdown)
│   └── papers/             # Legacy paper content
├── layouts/
│   └── Layout.astro        # Main layout with header/footer/theme
├── pages/
│   ├── index.astro         # Blog index listing
│   ├── about.astro         # About page
│   └── posts/
│       └── [slug].astro    # Individual post template
└── styles/
    └── global.css          # CSS variables & global styles

papers/                     # Source .docx files
scripts/
└── extract-paper.js        # Convert .docx → blog template

docs/
└── BLOG_WORKFLOW.md        # Detailed workflow documentation
```

## Content Schema

### Blog Post Frontmatter

```typescript
{
  title: string;        // Display title
  slug: string;         // URL identifier (unique)
  date: string;         // ISO date (YYYY-MM-DD)
  readingTime: number;  // Minutes to read
  excerpt: string;      // 1-2 sentence summary
  category?: string;    // Topic area
  tags?: string[];      // Keywords
  
  // Paper metadata (for LLM prompts)
  paperTitle?: string;
  paperUrl?: string;
  journal?: string;
  authors?: string;
  doi?: string;
}
```

## Adding Content

### Creating a New Post

1. **Extract from paper** (if starting from .docx):
   ```bash
   npm run extract papers/my-paper.docx
   ```

2. **Write the explanation** — Edit the generated template:
   - Hook readers with why the research matters
   - Explain methods in accessible terms
   - Interpret findings, don't just present them
   - Include "For Patients" and "For Clinicians" sections

3. **Preview**:
   ```bash
   npm run dev
   ```

4. **Build & Deploy**:
   ```bash
   npm run build
   # Deploy dist/ folder
   ```

### Post Writing Guidelines

**Structure:**
```markdown
## Introduction
[Personal hook - why did you do this study?]

## The Research Question
[What gap did you address?]

## Background
[What was known? What wasn't?]

## Methods
[How did you study it?]

## Key Findings
[Present results with interpretation]

## What This Means
[Separate sections for patients and clinicians]

## Limitations
[Be transparent]

## Conclusion
[Strong closing]
```

**Style:**
- Use "I" and "we" for personal voice
- Explain technical terms on first use
- Use tables for comparing results
- Include specific numbers with confidence intervals

## LLM Prompt Buttons

Each post has "Explore with AI" buttons that copy prompts to clipboard:

1. **"Discuss this post"** — For discussing the blog explanation
2. **"Analyze original paper"** — For deep paper analysis

Implementation in `[slug].astro`:
```astro
<button 
  class="action-btn" 
  data-prompt={prompt}
  onclick="copyPrompt(this)"
>
  Discuss this post
</button>
```

## Styling

### CSS Variables (in `global.css`)

```css
:root {
  --bg: #ffffff;              /* Background */
  --bg-elevated: #fafafa;     /* Cards/elevated surfaces */
  --text: #333333;            /* Primary text */
  --text-muted: #666666;      /* Secondary text */
  --text-light: #999999;      /* Tertiary text */
  --accent: #d73a49;          /* Links, buttons, highlights */
  --accent-hover: #b92b3a;    /* Hover state */
  --border: #e1e4e8;          /* Borders */
  --border-light: #f0f0f0;    /* Subtle borders */
  --code-bg: #f6f8fa;         /* Code blocks */
}
```

### Typography

- **Body**: System font stack (Inter-like)
- **Code**: SF Mono / JetBrains Mono
- **Base size**: 16px
- **Line height**: 1.6
- **Content width**: 720px max

## Theme Toggle

Theme is persisted in `localStorage` as 'theme' key ('light' or 'dark').

Script in Layout.astro:
```javascript
const theme = localStorage.getItem('theme') || 
  (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', theme);
```

## Build & Deploy

### Local Development
```bash
npm run dev      # http://localhost:4321
```

### Production Build
```bash
npm run build    # Output in dist/
```

### Deployment
- Static HTML output
- Deploy `dist/` to any static host
- Tested on Netlify, Vercel, GitHub Pages

## Dependencies

**Runtime:**
- astro: ^5.0.0

**Development:**
- @astrojs/tailwind: ^5.1.0
- tailwindcss: ^3.4.0
- mammoth: ^1.11.0 (for .docx extraction)

## Troubleshooting

### Post not appearing
- Check slug is unique
- Verify required frontmatter fields
- Check file is in `src/content/posts/`

### Build errors
- Ensure frontmatter is valid YAML
- Check imports in .astro files
- Run `npm install` if dependencies changed

### Styling issues
- Check CSS variable names
- Verify theme attribute on html element
- Clear browser cache

## Notes for AI Assistants

1. **Content First** — This is a content-heavy site, not an app. Focus on clear writing and good typography.

2. **Static Generation** — Everything is pre-rendered. No API routes, no server functions.

3. **Accessibility** — Maintain WCAG compliance: proper headings, alt text, focus states, color contrast.

4. **Performance** — Keep bundle small. Avoid heavy JS libraries. Use native features where possible.

5. **Content Changes** — When editing posts:
   - Preserve frontmatter structure
   - Keep writing style consistent with existing posts
   - Update readingTime if content changes significantly
