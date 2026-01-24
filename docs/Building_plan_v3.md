# Academic Website with RAG Chat - Implementation Plan (v3)

**Stack:** Astro + Netlify + Static Vector Index + DeepSeek

**Goals this plan serves:**
- Reading enjoyment: Dark/light theme, TOC navigation, reading progress, adjustable text
- Lightweight/responsive: Zero JS by default, mobile-first, <200KB pages
- Blazing fast: Static HTML, CDN delivery, in-memory vector search
- Secure: Server-side API proxy, rate limiting, CSP headers

**External dependencies:** 1 (DeepSeek API only)

---

## 1. Core Architecture

```
Static Site (Netlify CDN)          Serverless Function (/api/chat)
+---------------------------+      +--------------------------------+
| Markdown -> HTML          |      | 1. Rate limit (in-memory)      |
| Zero JS on content pages  |  ->  | 2. Input sanitization          |
| Chat loads via client:idle|      | 3. Vector search (~5ms)        |
+---------------------------+      | 4. Stream DeepSeek response    |
                                   +--------------------------------+
                                              |
                                              v
                                        DeepSeek API
                                        (only external call)
```

**Why Astro:** Ships zero JavaScript by default. Chat widget loads only after page renders via `client:idle`. Content pages are pure HTML.

**Why Netlify:** Free tier covers 500 visitors. Serverless functions hide API keys. Built-in DDoS protection and CDN.

---

## 2. Security

### netlify.toml

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.deepseek.com"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### API Function Protection

```javascript
// netlify/functions/chat.js
const rateLimit = new Map(); // Simple in-memory store

export async function handler(event) {
  // Method check
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // Origin check
  const origin = event.headers.origin;
  if (!origin?.includes('yourdomain.com')) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  // Rate limit: 10 requests per minute per IP
  const ip = event.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  const now = Date.now();
  const windowMs = 60000;
  const limit = rateLimit.get(ip);

  if (limit && now - limit.start < windowMs) {
    if (limit.count >= 10) {
      return { statusCode: 429, body: 'Rate limit exceeded' };
    }
    limit.count++;
  } else {
    rateLimit.set(ip, { start: now, count: 1 });
  }

  // Input validation
  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const query = typeof body.query === 'string'
    ? body.query.trim().slice(0, 2000).replace(/[<>]/g, '')
    : '';

  if (!query) {
    return { statusCode: 400, body: 'Invalid query' };
  }

  // Process RAG query...
}
```

---

## 3. Vector Search (Self-Contained)

For 50 papers (~30K chunks), a static JSON index is fastest and simplest.

### Build-time: Generate Index

```javascript
// scripts/build-index.js
import { readdir, readFile, writeFile } from 'fs/promises';

const OPENAI_KEY = process.env.OPENAI_API_KEY;

async function buildIndex() {
  const chunks = JSON.parse(await readFile('./content/chunks.json', 'utf-8'));

  const embeddings = await Promise.all(
    chunks.map(chunk => getEmbedding(chunk.text))
  );

  const index = {
    dimensions: 384,
    vectors: embeddings.flat(),
    metadata: chunks.map(c => ({ id: c.id, paper: c.paper, text: c.text.slice(0, 500) }))
  };

  await writeFile('./netlify/functions/data/index.json', JSON.stringify(index));
}

async function getEmbedding(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text, dimensions: 384 })
  });
  return (await res.json()).data[0].embedding;
}

buildIndex();
```

**One-time cost:** ~$0.10 for 50 papers via OpenAI embeddings.

### Runtime: Search Index

```javascript
// In netlify/functions/chat.js
import indexData from './data/index.json' assert { type: 'json' };

let vectors = null;

function initVectors() {
  if (vectors) return vectors;
  const { dimensions, vectors: flat, metadata } = indexData;
  vectors = metadata.map((m, i) => ({
    ...m,
    vec: flat.slice(i * dimensions, (i + 1) * dimensions)
  }));
  return vectors;
}

function search(queryVec, topK = 5) {
  const data = initVectors();
  return data
    .map(d => ({ ...d, score: cosine(queryVec, d.vec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

function cosine(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

**Performance:** ~5ms query time. Cold start adds ~100ms to parse JSON.

---

## 4. Mobile-First Responsive Design

### Base Layout

```css
/* Mobile-first: no media query = mobile styles */
.content {
  max-width: 65ch;  /* Optimal reading width */
  margin: 0 auto;
  padding: 1rem;
  font-size: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
  line-height: 1.6;
}

/* Touch targets */
button, a { min-height: 44px; min-width: 44px; }

/* Tablet+ */
@media (min-width: 768px) {
  .content { padding: 2rem; }
}

/* Desktop: show sidebar TOC */
@media (min-width: 1024px) {
  .layout { display: grid; grid-template-columns: 250px 1fr; gap: 2rem; }
}
```

### Images

```astro
<Image
  src={figure}
  alt="Description"
  loading="lazy"
  widths={[400, 800]}
  sizes="(max-width: 768px) 100vw, 800px"
/>
```

---

## 5. Dark/Light Theme

### CSS Variables

```css
:root {
  --bg: #F5F0E8;
  --bg-elevated: #FFFFFF;
  --text: #1A1A1A;
  --text-muted: #6B6B6B;
  --accent: #007AFF;
  --border: rgba(0,0,0,0.1);
}

[data-theme="dark"] {
  --bg: #1C1B1A;
  --bg-elevated: #2D2B28;
  --text: #F0EDE8;
  --text-muted: #8A867F;
  --accent: #0A84FF;
  --border: rgba(255,255,255,0.1);
}

body {
  background: var(--bg);
  color: var(--text);
}
```

### Prevent Flash (in `<head>`)

```html
<script>
  const theme = localStorage.getItem('theme') ||
    (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
</script>
```

### Toggle Button

```astro
<button id="theme-toggle" aria-label="Toggle theme">
  <svg class="sun">...</svg>
  <svg class="moon">...</svg>
</button>

<style>
  .sun { display: block; }
  .moon { display: none; }
  [data-theme="dark"] .sun { display: none; }
  [data-theme="dark"] .moon { display: block; }
</style>

<script>
  document.getElementById('theme-toggle').onclick = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
  };
</script>
```

---

## 6. Reading Experience

### Table of Contents with Scroll Spy

```astro
<nav class="toc">
  <ol>
    {headings.map(h => (
      <li><a href={`#${h.slug}`} class="toc-link">{h.text}</a></li>
    ))}
  </ol>
  <div class="progress-bar" id="progress"></div>
</nav>

<style>
  .toc {
    position: sticky;
    top: 1rem;
    padding: 1rem;
    background: var(--bg-elevated);
    border-radius: 8px;
  }
  .toc-link.active { color: var(--accent); font-weight: 600; }
  .progress-bar { height: 3px; background: var(--border); }
  .progress-bar::after {
    content: '';
    display: block;
    height: 100%;
    width: var(--progress, 0%);
    background: var(--accent);
  }

  @media (max-width: 1023px) {
    .toc { position: static; margin-bottom: 1rem; }
  }
</style>

<script>
  const links = document.querySelectorAll('.toc-link');
  const headings = document.querySelectorAll('h2[id], h3[id]');
  const progress = document.getElementById('progress');

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      // Scroll spy
      let current = null;
      headings.forEach(h => { if (h.offsetTop <= scrollY + 120) current = h; });
      links.forEach(l => l.classList.toggle('active', current && l.hash === '#' + current.id));

      // Progress
      const pct = Math.min(100, (scrollY / (document.body.scrollHeight - innerHeight)) * 100);
      progress.style.setProperty('--progress', pct + '%');

      ticking = false;
    });
  });
</script>
```

### Reading Time

```astro
---
const words = content.split(/\s+/).length;
const minutes = Math.ceil(words / 220);
---
<span class="reading-time">{minutes} min read</span>
```

### Text Size Control (Minimal)

```astro
<button id="text-smaller" aria-label="Smaller text">A-</button>
<button id="text-larger" aria-label="Larger text">A+</button>

<script>
  const root = document.documentElement;
  const sizes = [90, 100, 110, 120];
  let idx = 1;

  document.getElementById('text-smaller').onclick = () => {
    idx = Math.max(0, idx - 1);
    root.style.setProperty('--text-scale', sizes[idx] / 100);
  };
  document.getElementById('text-larger').onclick = () => {
    idx = Math.min(sizes.length - 1, idx + 1);
    root.style.setProperty('--text-scale', sizes[idx] / 100);
  };
</script>

<style>
  .content { font-size: calc(1rem * var(--text-scale, 1)); }
</style>
```

### Scroll to Top

```astro
<button id="scroll-top" aria-label="Back to top">↑</button>

<style>
  #scroll-top {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    opacity: 0;
    transition: opacity 0.2s;
  }
  #scroll-top.visible { opacity: 1; }
</style>

<script>
  const btn = document.getElementById('scroll-top');
  window.addEventListener('scroll', () => btn.classList.toggle('visible', scrollY > 400));
  btn.onclick = () => scrollTo({ top: 0, behavior: 'smooth' });
</script>
```

---

## 7. Performance Budget

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.2s |
| Largest Contentful Paint | < 1.5s |
| Time to Interactive | < 2.0s |
| Page weight (content pages) | < 100KB |
| Page weight (with chat loaded) | < 200KB |
| Mobile Lighthouse | > 95 |

---

## 8. Implementation Phases

**Phase 1 - Static Site**
- Astro project with Tailwind
- Netlify deployment + security headers
- Dark/light theme
- Mobile-first layout
- Basic page templates

**Phase 2 - Reading Experience**
- Convert papers to markdown
- Table of contents with scroll spy
- Reading progress indicator
- Reading time display
- Text size controls
- Scroll to top

**Phase 3 - RAG Chat**
- Chunk papers (800-1200 tokens per chunk)
- Generate embeddings (one-time, ~$0.10)
- Build static index
- Netlify function with rate limiting
- Vector search integration
- DeepSeek streaming
- Chat widget (React, loads via client:idle)

---

## 9. File Structure

```
src/
  pages/           # Astro pages
  components/      # UI components
  layouts/         # Page layouts
  styles/          # Global CSS
content/
  papers/          # Markdown papers
  chunks.json      # Pre-chunked content
netlify/
  functions/
    chat.js        # RAG endpoint
    data/
      index.json   # Vector index (~12MB)
scripts/
  build-index.js   # Embedding generation
netlify.toml       # Headers + redirects
```

---

## 10. Costs

| Item | Cost |
|------|------|
| Hosting | $0 (Netlify free tier) |
| Embeddings | ~$0.10 one-time |
| DeepSeek API | $0.10-1.50/month |
| Domain | ~$12/year optional |
| **Total** | **< $2/month** |

---

## What Was Cut From v2

- Hosting/framework comparison tables (decisions made)
- LanceDB alternative (over-engineering)
- Multiple embedding options (picked OpenAI)
- API key rotation strategy (premature)
- hCaptcha/bot protection (premature)
- Upstash Redis (adds dependency)
- Detailed cost projections (condensed)
- Container queries (over-engineering)
- Skeuomorphic aesthetic details (doesn't serve reading/speed/security)
- 60+ lines of Tailwind config (implementation detail)

**Result:** Plan reduced from ~1,700 lines to ~400 lines. Every remaining feature directly serves reading enjoyment, performance, or security.
