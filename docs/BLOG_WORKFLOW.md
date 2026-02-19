# Blog Workflow Documentation

This document explains how to manage your research blog, from paper extraction to publication.

## Overview

Your website is now a **clean, Chalk-inspired blog** that explains your research in accessible terms. Each post:
- Explains one of your papers in clear, engaging language
- Includes an "Explore with AI" section with prompts for LLM discussion
- Maintains rigorous accuracy while being readable by non-experts

## Directory Structure

```
src/content/
├── posts/          # Blog posts (your explanations)
│   ├── 5-aris-depression-explained.md
│   ├── hira-diabetes-study-explained.md
│   └── nz-glycemic-control-explained.md
└── papers/         # Original paper content (legacy)
    ├── 5-aris-depression.md
    ├── hira-study.md
    └── nz-study.md

papers/             # Source .docx files
├── 5_ARIs_depression.docx
├── Hira_study.docx
└── NZ_study.docx

scripts/
└── extract-paper.js  # Tool to convert papers to blog templates
```

## Workflow: From Paper to Blog Post

### Step 1: Extract Paper to Template

When you have a new paper (in .docx format):

```bash
# Process a single paper
node scripts/extract-paper.js papers/your-new-paper.docx

# Or process all papers at once
node scripts/extract-paper.js --all
```

This creates a template in `src/content/posts/` with:
- Auto-generated frontmatter (title, slug, date, reading time)
- Placeholder sections for your explanation
- A comment with the raw paper content for reference

### Step 2: Write Your Explanation

Open the generated file and transform the template into an engaging blog post:

**Frontmatter to update:**
```yaml
---
title: "Your Engaging Title"
slug: "auto-generated-explained"
date: "2026-01-24"
readingTime: 12  # Auto-generated
excerpt: "Write a compelling 1-2 sentence summary"
category: "Pharmacoepidemiology"
tags: ["5-ARIs", "depression", "meta-analysis"]  # Add relevant tags
paperTitle: "Full Academic Title"
authors: "Your Name, Co-author Name"
journal: "Journal Name"  # Or "[Forthcoming]"
---
```

**Content sections to write:**

1. **Introduction** — Hook the reader. Why should they care?
2. **The Research Question** — What did you investigate?
3. **Background** — What was already known? What's the gap?
4. **Methods** — How did you study it? (accessible explanation)
5. **Key Findings** — What did you find? Use tables, lists
6. **What This Means** — Interpret for patients/clinicians
7. **Strengths and Limitations** — Be transparent
8. **Conclusion** — Sum up

**Writing tips:**
- Use "I" and "we" to make it personal
- Explain technical terms when first introduced
- Use analogies for complex concepts
- Include "For Patients" and "For Clinicians" sections
- Add tables for comparing results

### Step 3: Test Locally

```bash
npm run dev
```

Visit:
- `http://localhost:4321/` — Blog index
- `http://localhost:4321/posts/your-slug` — Your new post

### Step 4: Build and Deploy

```bash
npm run build
```

Deploy the `dist/` folder to your hosting platform (Netlify, Vercel, etc.)

## The "Explore with AI" Feature

Each post automatically includes AI prompt buttons that let readers:

1. **"Discuss this post"** — Copy a prompt to chat about your blog explanation
2. **"Analyze original paper"** — Copy a prompt to analyze the academic paper
3. **"View paper"** — Link to the paper (if URL provided)

### How It Works

When a reader clicks a button:
1. A pre-written prompt is copied to their clipboard
2. They paste it into ChatGPT, Claude, or their preferred LLM
3. The LLM engages in a nuanced discussion of your research

### Customizing Prompts

The prompts are generated automatically from your frontmatter. To customize, edit the `[slug].astro` file:

```astro
const blogPrompt = `Your custom prompt here...`;
const paperPrompt = `Your custom paper analysis prompt...`;
```

## Content Guidelines

### Writing Style

**Do:**
- Start with why the research matters
- Use plain language (aim for high school reading level)
- Include specific numbers and confidence intervals
- Acknowledge uncertainty and limitations
- Use headings and bullet points for scannability

**Don't:**
- Oversimplify to the point of being misleading
- Hide important limitations
- Use excessive jargon without explanation
- Make claims not supported by your data

### Post Structure Template

```markdown
## The Question That Started It All
[Personal hook - why did you do this study?]

## Why This Matters
[Broader context and significance]

## The Proposed Mechanism
[Biological or theoretical background]

## My Approach
[Study design - emphasize why you chose this method]

## What I Found
[Results with interpretation]

## What This Means
[Clinical implications - separate patient/clinician sections]

## Methodological Lessons
[What other researchers can learn from your approach]

## Limitations and Future Directions
[Be transparent about what we don't know]

## Conclusion
[Strong closing that ties back to the introduction]
```

## Managing Existing Papers

Your three existing papers have been converted to blog posts:

| Paper | Blog Post | Status |
|-------|-----------|--------|
| 5-ARIs Depression Meta-Analysis | `5-aris-depression-explained.md` | ✓ Published |
| HIRA Diabetes Study | `hira-diabetes-study-explained.md` | ✓ Published |
| NZ Glycemic Control Study | `nz-glycemic-control-explained.md` | ✓ Published |

The original papers remain in:
- `papers/*.docx` — Source Word documents
- `src/content/papers/*.md` — Markdown versions (legacy)

## Updating Content

### To edit a post:
1. Edit `src/content/posts/[slug].md`
2. Test with `npm run dev`
3. Rebuild and redeploy

### To unpublish a post:
Remove or rename the .md file. The post will disappear from the index.

### To update the About page:
Edit `src/pages/about.astro`

## Technical Details

### Frontmatter Schema

```typescript
{
  title: string;        // Blog post title
  slug: string;         // URL-friendly identifier
  date: string;         // Publication date (YYYY-MM-DD)
  readingTime: number;  // Estimated minutes to read
  excerpt: string;      // 1-2 sentence summary
  category?: string;    // Topic area
  tags?: string[];      // Relevant keywords
  
  // Paper-specific fields (for LLM prompts)
  paperTitle?: string;  // Full academic title
  paperUrl?: string;    // Link to published paper
  journal?: string;     // Journal name
  authors?: string;     // Author list
  doi?: string;         // DOI if available
}
```

### URL Structure

- Blog index: `/`
- Individual post: `/posts/[slug]`
- About page: `/about`

### Adding New Static Pages

Create new `.astro` files in `src/pages/`:

```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout title="Page Title" description="Page description">
  <h1>Your Content</h1>
</Layout>
```

## Troubleshooting

### Post not appearing
- Check that the file is in `src/content/posts/`
- Verify frontmatter has required fields (title, slug, date, readingTime, excerpt)
- Check the slug is unique
- Restart the dev server

### Build errors
- Ensure all imports are correct
- Check for YAML syntax errors in frontmatter
- Run `npm run build` to see specific error messages

### Styling issues
- Global styles are in `src/styles/global.css`
- Component-specific styles use `<style>` tags
- CSS variables for theming: `--bg`, `--text`, `--accent`, etc.

## Future Enhancements

Consider adding:
- [ ] RSS feed (`/rss.xml`)
- [ ] Tag/filter pages
- [ ] Search functionality (client-side)
- [ ] Related posts
- [ ] Comments (Giscus, Utterances)
- [ ] Reading progress indicator
- [ ] Social sharing buttons

## Questions?

This workflow is designed to be simple and sustainable. The key principles:
1. **One paper = One blog post** explaining the research
2. **LLM prompts** help readers engage deeply with your work
3. **Clean, fast, static** — no databases or complex infrastructure

For technical issues, check the Astro documentation: https://docs.astro.build
