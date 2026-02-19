# Research Blog

A clean, fast, static blog for explaining your pharmacoepidemiology research. Built with [Astro](https://astro.build) and inspired by the [Chalk](https://github.com/nielsenramon/chalk) Jekyll theme.

**🚀 Live Demo**: [View the site](https://your-site-url.com)

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## Deploy to GitHub Pages (FREE)

Your site will be hosted at: `https://<username>.github.io/<repo-name>`

### 1. Create Repository
- Go to https://github.com/new
- Name: `HaNguyen-blog`
- Make it **Public**
- Click **Create**

### 2. Push Code
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/HaNguyen-blog.git
git branch -M main
git push -u origin main
```

### 3. Enable Pages
- Go to repo **Settings** → **Pages**
- Select **GitHub Actions** as source
- Done! Site will be live in 2-3 minutes

See [GITHUB_SETUP.md](GITHUB_SETUP.md) for detailed instructions.

---

## Alternative Hosting Options

The built site (`dist/` folder) can be hosted anywhere:

| Platform | URL Format | Setup |
|----------|-----------|-------|
| **GitHub Pages** | `username.github.io/repo` | See above |
| **Netlify** | `site-name.netlify.app` | Drag & drop `dist/` folder |
| **Vercel** | `project.vercel.app` | Connect GitHub repo |
| **Cloudflare Pages** | `project.pages.dev` | Connect GitHub repo |
| **Any web server** | Your domain | Upload `dist/` files |

---

## Features

- **Clean Typography** — Easy-to-read, Chalk-inspired design
- **Dark/Light Mode** — Automatic theme switching
- **LLM Integration** — "Explore with AI" buttons for ChatGPT/Claude
- **Fast & Static** — Pre-rendered HTML for optimal performance
- **Paper-to-Blog Workflow** — Convert papers to engaging posts
- **Reading Progress** — Visual scroll indicator
- **Responsive** — Works on all devices

---

## Adding a New Paper

### 1. Extract Paper to Template
```bash
npm run extract papers/your-new-paper.docx
```

### 2. Write Your Explanation
Edit `src/content/posts/your-paper-explained.md`:
- Hook readers with why the research matters
- Explain methods in accessible terms
- Interpret findings for patients and clinicians

### 3. Preview & Deploy
```bash
npm run dev      # Preview locally
git add .        # Stage changes
git commit -m "Add new post"
git push         # Auto-deploys to GitHub Pages
```

---

## Project Structure

```
src/
├── content/
│   ├── posts/          # Blog posts (markdown)
│   └── papers/         # Legacy paper content
├── layouts/
│   └── Layout.astro    # Main page layout
├── pages/
│   ├── index.astro     # Blog index
│   ├── about.astro     # About page
│   └── posts/
│       └── [slug].astro  # Post template
└── styles/
    └── global.css      # Global styles

papers/                 # Source .docx files
scripts/
└── extract-paper.js    # Paper → blog converter
docs/
└── BLOG_WORKFLOW.md    # Detailed workflow
```

---

## Content Guidelines

### Post Structure
```markdown
## Introduction
[Why this research matters]

## The Research Question
[What you investigated]

## Key Findings
[Present results with interpretation]

## What This Means
[For patients and clinicians]

## Conclusion
[Key takeaways]
```

### Frontmatter
```yaml
---
title: "Your Title"
slug: "your-title-explained"
date: "2026-01-24"
readingTime: 12
excerpt: "Compelling summary"
category: "Pharmacoepidemiology"
tags: ["5-ARIs", "depression"]
paperTitle: "Full Academic Title"
authors: "Your Name, Co-author"
journal: "[Forthcoming]"
---
```

---

## Customization

### Update Your Info
- `src/layouts/Layout.astro` — Site header, navigation
- `src/pages/about.astro` — Your bio
- `src/styles/global.css` — Colors, fonts

### Change Colors
Edit CSS variables in `src/styles/global.css`:
```css
:root {
  --accent: #d73a49;  /* Your brand color */
}
```

---

## Documentation

- [GITHUB_SETUP.md](GITHUB_SETUP.md) — GitHub Pages deployment
- [docs/BLOG_WORKFLOW.md](docs/BLOG_WORKFLOW.md) — Paper-to-blog workflow
- [Astro Docs](https://docs.astro.build) — Framework reference

---

## License

MIT — Use this template for your research blog.

Built with ♥ for sharing research with the world.
