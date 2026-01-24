# Building a RAG-powered academic website for under $5/month (v2)

Your stack should be **Astro + Netlify + embedded vector search + DeepSeek** - delivering blazing-fast static content with an interactive chat widget at near-zero cost and minimal external dependencies. This combination handles 500 monthly visitors with projected costs of **$0.10-$1.50/month** in API fees, with hosting completely free. The early iPhone aesthetic you want is achievable through CSS gradients, shadows, and texture techniques without sacrificing performance.

The key architectural insight: use Astro's "islands" pattern to load your chat widget only when the browser is idle, keeping initial page loads under 200KB while enabling full RAG functionality through Netlify serverless functions that proxy DeepSeek API calls securely. Vector search runs entirely within your serverless function using a pre-built index bundled with deployment - no external database calls, no cold-start latency from external services.

---

## Netlify wins the hosting comparison decisively

For a RAG chat widget, **GitHub Pages is eliminated immediately** - it has no serverless function support, making secure API calls impossible. Your choice is between Netlify and Vercel, and Netlify edges ahead for this use case.

| Platform | Serverless Functions | Free Tier Bandwidth | Chat Widget Support | Commercial Use |
|----------|---------------------|---------------------|---------------------|----------------|
| **Netlify** | 125K invocations | 10GB equivalent | Full support | Allowed |
| **Vercel** | 1M invocations | 100GB | Full support | Hobby plan prohibits |
| **GitHub Pages** | None | 100GB | Requires external service | Prohibited |

Netlify's credit-based pricing covers your needs comfortably. For **400 monthly page views and 50 chat sessions**, you'd consume roughly **65 credits** of your free 300 monthly allocation - bandwidth (2 credits), compute (2.5 credits), and deploys (60 credits). That leaves substantial headroom for growth.

The critical requirement driving this choice: your chat widget **must** call DeepSeek's API through a server-side proxy. Client-side API calls would expose your API key in the browser's network tab, allowing anyone to steal it and rack up charges. Netlify Functions store your key in encrypted environment variables, add rate limiting, and enable response caching - all impossible with purely static hosting.

Latency impact is negligible. Serverless functions add **50-150ms** on cold starts and 10-30ms when warm. Given that LLM responses take 1-10 seconds regardless, this overhead disappears in practice.

### Netlify security headers configuration

Create `netlify.toml` with security headers:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.deepseek.com"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

---

## Security hardening (expanded)

### API endpoint protection

```javascript
// netlify/functions/chat.js
import { rateLimit } from './utils/rate-limit.js';

export async function handler(event, context) {
  // 1. Method validation
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // 2. Origin validation (CORS)
  const allowedOrigins = [
    'https://yourdomain.com',
    'https://www.yourdomain.com'
  ];
  const origin = event.headers.origin;
  if (!allowedOrigins.includes(origin)) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  // 3. Rate limiting (10 requests per minute per IP)
  const clientIP = event.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  const rateLimitResult = await rateLimit(clientIP, 10, 60);
  if (!rateLimitResult.allowed) {
    return {
      statusCode: 429,
      headers: { 'Retry-After': rateLimitResult.retryAfter },
      body: JSON.stringify({ error: 'Rate limit exceeded' })
    };
  }

  // 4. Input sanitization
  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const query = sanitizeInput(body.query);
  if (!query || query.length > 2000) {
    return { statusCode: 400, body: 'Invalid query' };
  }

  // 5. Process request...
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .slice(0, 2000)
    .replace(/[<>]/g, ''); // Basic XSS prevention
}
```

### Rate limiting (in-memory with LRU cache)

For low-traffic sites, in-memory rate limiting is sufficient. The cache resets on cold starts, but this is acceptable - it means occasional users get a fresh quota, while sustained abuse is still blocked during warm instances.

```javascript
// utils/rate-limit.js
import crypto from 'crypto';

// Simple LRU cache - keeps last 1000 entries
class LRUCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    const value = this.cache.get(key);
    // Refresh position (move to end)
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Delete oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}

const rateLimitCache = new LRUCache(1000);

export function rateLimit(ip, maxRequests, windowSeconds) {
  // Hash IP for privacy
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  const entry = rateLimitCache.get(ipHash);

  if (!entry || entry.windowStart < windowStart) {
    // New window
    rateLimitCache.set(ipHash, {
      count: 1,
      windowStart: now
    });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.windowStart + windowSeconds * 1000 - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment count
  entry.count++;
  rateLimitCache.set(ipHash, entry);
  return { allowed: true, remaining: maxRequests - entry.count };
}
```

**Why in-memory works for your use case:**
- Cold starts reset the cache, but for 50-500 monthly visitors this is a feature, not a bug
- No external dependencies or network calls
- Sub-millisecond response time
- 1000 entries use ~50KB memory - negligible

**Alternative for stricter persistence:** Use Upstash Redis (free tier: 10K requests/day). Single API call, ~5ms latency, but adds an external dependency.

### API key rotation strategy

1. Store keys in Netlify environment variables with version suffix: `DEEPSEEK_API_KEY_V1`, `DEEPSEEK_API_KEY_V2`
2. Use `DEEPSEEK_API_KEY_ACTIVE` to point to current version
3. Rotate quarterly or immediately if suspected compromise
4. Netlify redeploys automatically pick up new environment variables

### Additional security measures

- **Netlify's built-in DDoS protection**: Included free, no configuration needed
- **Bot protection**: Consider adding hCaptcha (free tier) for chat widget if abuse occurs
- **Logging**: Netlify Functions logs are retained 7 days - sufficient for debugging without storing PII
- **Secrets scanning**: Enable GitHub's secret scanning to prevent accidental key commits

---

## Astro emerges as the optimal frontend framework

For a content-heavy academic site with one interactive component (the chat), Astro's architecture is nearly ideal. It ships **zero JavaScript by default**, hydrating only the components you explicitly mark as interactive.

The islands architecture solves your chat widget problem elegantly:

```astro
---
import ChatWidget from "../components/ChatWidget.jsx";
---
<ChatWidget client:idle />
```

That `client:idle` directive tells Astro to load and hydrate the chat component only after the browser finishes rendering the page and enters an idle state. Your papers and blog posts load instantly as static HTML, while the chat widget arrives without blocking anything.

**Framework performance comparison for your use case:**

| Framework | Initial Bundle | Build Speed | Markdown Support | Chat Integration | Claude Code Compatibility |
|-----------|---------------|-------------|------------------|------------------|--------------------------
| **Astro** | ~0KB (static pages) | Fast (Vite) | Native, excellent | Perfect (islands) | Excellent |
| Hugo | 0KB | Fastest | Excellent | Poor (manual JS) | Moderate |
| Next.js | 40-80KB (React) | Slower | Good (with plugins) | Excellent | Excellent |
| Eleventy | 0KB | Very fast | Excellent | Requires plugins | Good |
| SvelteKit | Small | Fast | Good | Excellent | Good |

Astro's component-based structure maps well to Claude Code's reasoning patterns. The clear separation between frontmatter (logic) and template (markup) in `.astro` files provides explicit context boundaries. You can write the chat widget in React, Preact, or Svelte - whichever you're most comfortable with - and Astro handles the rest.

**Expected performance metrics** with this setup: Lighthouse scores of 95-100, Largest Contentful Paint under 1.5 seconds, Time to Interactive under 2 seconds, and total page weight under 200KB (excluding lazy-loaded chat).

---

## Self-contained vector search (no external database)

For **10-50 academic papers generating approximately 30,000 vectors**, you don't need an external database. A pre-built index bundled with your deployment delivers the fastest possible queries with zero external dependencies.

| Approach | Query Speed | Cold Start | Control | Complexity |
|----------|-------------|------------|---------|------------|
| **Static JSON index** | ~2-5ms | 50-100ms | Full | Minimal |
| **LanceDB (file-based)** | ~5-10ms | 100-200ms | Full | Low |
| SQLite + sqlite-vss | ~5-15ms | 150-300ms | Full | Medium |
| Qdrant Cloud | ~10-30ms | 0ms (managed) | Partial | Zero |

**Recommended: Static pre-computed index.** For 30K vectors, a JSON file with pre-computed embeddings is fast enough and maximally simple. The entire index loads into memory on function init (~12MB for 30K x 384-dim vectors), and similarity search runs in JavaScript with no external calls.

**Alternative: LanceDB for larger scale.** If you anticipate growing beyond 100K vectors or need advanced filtering, LanceDB provides a proper columnar format with HNSW indexing while remaining file-based and self-contained.

### Option A: Static JSON index (recommended for your scale)

**Build-time indexing script:**

```javascript
// scripts/build-index.js
import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

// Use a small, fast embedding model
// Option 1: Local with transformers.js (~50ms per chunk)
// Option 2: OpenAI text-embedding-3-small (~$0.10 total for 50 papers)

async function buildIndex() {
  const chunksDir = './content/chunks';
  const files = await readdir(chunksDir);

  const index = {
    vectors: [],      // Float32 arrays flattened
    metadata: [],     // { chunkId, paperId, section, text }
    dimensions: 384,  // BGE-small or similar
    version: 1
  };

  for (const file of files) {
    const chunk = JSON.parse(await readFile(join(chunksDir, file), 'utf-8'));
    const embedding = await generateEmbedding(chunk.text);

    index.vectors.push(...embedding);
    index.metadata.push({
      chunkId: chunk.id,
      paperId: chunk.paperId,
      section: chunk.section,
      text: chunk.text.slice(0, 500) // Store truncated for context
    });
  }

  // Write as binary for smaller size
  await writeFile(
    './netlify/functions/data/index.json',
    JSON.stringify(index)
  );

  console.log(`Indexed ${index.metadata.length} chunks`);
}

async function generateEmbedding(text) {
  // Using OpenAI (one-time cost ~$0.10)
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 384  // Reduce from 1536 for faster search
    })
  });

  const data = await response.json();
  return data.data[0].embedding;
}

buildIndex();
```

**Runtime search in Netlify function:**

```javascript
// netlify/functions/chat.js
import indexData from './data/index.json';

// Parse index once on cold start
let index = null;

function initIndex() {
  if (index) return index;

  const { vectors, metadata, dimensions } = indexData;
  const numVectors = metadata.length;

  // Reshape flat array into matrix
  const matrix = [];
  for (let i = 0; i < numVectors; i++) {
    matrix.push(vectors.slice(i * dimensions, (i + 1) * dimensions));
  }

  index = { matrix, metadata, dimensions };
  return index;
}

function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function searchIndex(queryEmbedding, topK = 5) {
  const { matrix, metadata } = initIndex();

  // Calculate similarities
  const scores = matrix.map((vec, i) => ({
    score: cosineSimilarity(queryEmbedding, vec),
    ...metadata[i]
  }));

  // Sort and return top K
  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
```

**Performance characteristics:**
- 30K vectors x 384 dimensions = ~46MB raw, ~12MB gzipped
- Cold start: ~100ms to parse JSON and init
- Query time: ~3-5ms for brute-force cosine similarity
- For 30K vectors, brute-force is faster than approximate methods due to overhead

### Option B: LanceDB for larger scale

If you grow beyond 50 papers or need filtering by metadata:

```javascript
// scripts/build-lance-index.js
import { connect } from '@lancedb/lancedb';
import { readdir, readFile } from 'fs/promises';

async function buildIndex() {
  const db = await connect('./netlify/functions/data/vectors.lance');

  const chunks = await loadChunks();
  const data = await Promise.all(chunks.map(async (chunk) => ({
    vector: await generateEmbedding(chunk.text),
    text: chunk.text,
    paperId: chunk.paperId,
    section: chunk.section,
    year: chunk.year  // Can filter by year, author, etc.
  })));

  await db.createTable('papers', data, { mode: 'overwrite' });
  console.log(`Indexed ${data.length} chunks`);
}

// Runtime search
import { connect } from '@lancedb/lancedb';

let db = null;

async function searchLance(queryEmbedding, topK = 5, filters = {}) {
  if (!db) {
    db = await connect('./data/vectors.lance');
  }

  const table = await db.openTable('papers');
  let query = table.search(queryEmbedding).limit(topK);

  // Optional: filter by metadata
  if (filters.year) {
    query = query.where(`year = ${filters.year}`);
  }

  return await query.toArray();
}
```

**LanceDB advantages:**
- HNSW indexing for O(log n) queries at scale
- SQL-like filtering on metadata
- Incremental updates without full rebuild
- Still file-based, no external service

### Query-time embedding generation

For query embeddings at runtime, you need a fast option that runs in the serverless function:

**Option 1: Transformers.js (zero cost, ~100ms latency)**

```javascript
import { pipeline } from '@xenova/transformers';

let embedder = null;

async function getQueryEmbedding(text) {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5');
  }

  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}
```

**Option 2: OpenAI API (~$0.00001 per query)**

```javascript
async function getQueryEmbedding(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 384
    })
  });

  const data = await response.json();
  return data.data[0].embedding;
}
```

For 2,000 monthly queries, OpenAI embeddings cost ~$0.02/month - negligible. But Transformers.js eliminates the dependency entirely if you prefer zero external calls for vector operations.

### Embedding strategy for medical academic content

DeepSeek **does not offer a dedicated embedding API**, so you need an external embedding provider. Two paths:

**Budget path ($0):** Use open-source BGE-base-en-v1.5 via Sentence Transformers, running inside your serverless function. Cold starts add 100-200ms, but you pay nothing. Research shows generalist models like BGE often outperform specialized medical embeddings for short-context retrieval.

**Quality path (~$0.10 one-time):** OpenAI's text-embedding-3-small at $0.02 per million tokens. Embedding 50 papers (~5M tokens) costs about ten cents total - a one-time expense at indexing time, not per-query.

For academic papers converted from PDF to markdown, chunk at **800-1,200 tokens** with 100-token overlap, splitting on markdown headers (`## `, `### `) to preserve section boundaries. Keep abstracts, methodology, and results as logical units rather than arbitrary splits.

---

## DeepSeek costs are remarkably low

DeepSeek's pricing structure makes it **10-50x cheaper** than GPT-4o or Claude Sonnet for your use case. The cache-hit pricing is particularly advantageous for RAG, where system prompts and document context repeat across queries.

| Cost Component | Price per 1M Tokens |
|----------------|---------------------|
| Input (cache hit) | $0.028 |
| Input (cache miss) | $0.28 |
| Output | $0.42 |

**Projected monthly costs by usage scenario:**

| Scenario | Chat Sessions | Total Queries | Monthly Cost |
|----------|---------------|---------------|--------------|
| Low (50 visitors) | 50 | 200 | **$0.10-$0.15** |
| Medium (200 visitors) | 200 | 800 | **$0.38-$0.58** |
| Higher (500 visitors) | 500 | 2,000 | **$0.95-$1.46** |

These calculations assume 2,000 input tokens per query (system prompt + RAG context + question) and 400 output tokens. With 50% cache hits - achievable since your RAG system prompt and paper contexts repeat - costs drop further.

New DeepSeek accounts receive **5 million free tokens** (~$1.40-$4.20 value), covering 6-25 months of expected usage depending on traffic. The API has no traditional rate limits; during high traffic, requests slow rather than fail, which suits a low-traffic academic site perfectly.

**Quality-cost tradeoff:** DeepSeek-V3.2 handles academic medical content capably. For pure factual Q&A about your papers, quality differences from GPT-4o or Claude are unlikely to matter. If you later need higher quality, switching APIs requires only changing the endpoint URL - DeepSeek's API is OpenAI-compatible.

---

## Total cost breakdown for your complete stack

| Component | Monthly Cost | Notes |
|-----------|-------------|-------|
| Hosting (Netlify) | **$0** | Free tier sufficient for 500 visitors |
| Vector search | **$0** | Self-contained, bundled with deployment |
| Embeddings (indexing) | **~$0.10** | One-time cost for 50 papers |
| Embeddings (queries) | **$0-0.02** | $0 with Transformers.js, ~$0.02 with OpenAI |
| LLM (DeepSeek) | **$0.10-$1.50** | Based on chat usage |
| Domain (optional) | **$10-15/year** | Custom domain registration |
| **Total** | **$0.10-$1.52/month** | Plus ~$1/month amortized domain cost |

**External dependencies: 1** (DeepSeek API for chat responses only)

Annual cost projection: **under $30/year** for the higher usage scenario, compared to $100+ with OpenAI or Anthropic APIs. With Transformers.js for query embeddings, you can run the entire vector search pipeline with zero external API calls.

---

## Mobile-first responsive design

Since majority of traffic will come from mobile devices, adopt a mobile-first approach where base styles target phones and media queries progressively enhance for larger screens.

### Core responsive principles

**Touch targets:** Minimum 44x44px for all interactive elements (Apple HIG standard).

**Viewport configuration:**

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

**Fluid typography with clamp():**

```css
:root {
  /* Base: 16px on mobile, scales to 18px on desktop */
  --font-size-base: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);

  /* Headings scale more dramatically */
  --font-size-h1: clamp(1.75rem, 1.5rem + 1.25vw, 2.5rem);
  --font-size-h2: clamp(1.5rem, 1.25rem + 1vw, 2rem);
  --font-size-h3: clamp(1.25rem, 1.1rem + 0.5vw, 1.5rem);
}

body {
  font-size: var(--font-size-base);
  line-height: 1.6;
}
```

**Container queries for component-level responsiveness:**

```css
.article-card {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .article-card-content {
    display: grid;
    grid-template-columns: 1fr 2fr;
  }
}
```

### Mobile-optimized layout

```css
/* Mobile-first base styles */
.content-wrapper {
  padding: 1rem;
  max-width: 100%;
}

.reading-content {
  /* Optimal reading width: 45-75 characters */
  max-width: 65ch;
  margin: 0 auto;
  padding: 0 1rem;
}

/* Tablet and up */
@media (min-width: 768px) {
  .content-wrapper {
    padding: 2rem;
  }

  .reading-content {
    padding: 0 2rem;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .layout-with-sidebar {
    display: grid;
    grid-template-columns: 250px 1fr;
    gap: 2rem;
  }
}
```

### Performance optimizations for mobile

**Lazy loading images:**

```astro
---
import { Image } from 'astro:assets';
import figure from '../assets/figure1.png';
---

<Image
  src={figure}
  alt="Research figure"
  loading="lazy"
  decoding="async"
  widths={[400, 800, 1200]}
  sizes="(max-width: 768px) 100vw, 800px"
/>
```

**Preconnect to external resources:**

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://api.deepseek.com">
```

**Critical CSS inlining:** Astro handles this automatically with `astro build`.

---

## Dark/light theme system

### Theme architecture

Use CSS custom properties with a data attribute toggle for instant, flicker-free theme switching.

```css
/* src/styles/theme.css */

:root {
  /* Light theme (default) - Impressionist warmth */
  --color-bg-primary: #F5F0E8;
  --color-bg-secondary: #E8E3D9;
  --color-bg-elevated: #FFFFFF;
  --color-text-primary: #1A1A1A;
  --color-text-secondary: #4A4A4A;
  --color-text-muted: #6B6B6B;
  --color-border: rgba(0, 0, 0, 0.1);
  --color-border-strong: rgba(0, 0, 0, 0.2);

  /* Functional colors (consistent across themes) */
  --color-action: #007AFF;
  --color-action-hover: #0056B3;
  --color-success: #4CD964;
  --color-warning: #FF9500;
  --color-error: #FF3B30;

  /* Impressionist accents */
  --color-monet-blue: #4A6FA5;
  --color-monet-lavender: #9B8AA6;

  /* Shadows - light theme has more pronounced shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.12);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.16);
  --shadow-ios: 0 4px 12px rgba(0, 0, 0, 0.15),
                inset 0 1px 2px rgba(255, 255, 255, 0.4);

  /* Transitions */
  --transition-theme: background-color 0.3s ease, color 0.3s ease,
                      border-color 0.3s ease, box-shadow 0.3s ease;
}

[data-theme="dark"] {
  /* Dark theme - maintains warmth with muted tones */
  --color-bg-primary: #1C1B1A;
  --color-bg-secondary: #252422;
  --color-bg-elevated: #2D2B28;
  --color-text-primary: #F0EDE8;
  --color-text-secondary: #B8B4AD;
  --color-text-muted: #8A867F;
  --color-border: rgba(255, 255, 255, 0.1);
  --color-border-strong: rgba(255, 255, 255, 0.2);

  /* Adjusted accents for dark mode */
  --color-action: #0A84FF;
  --color-action-hover: #409CFF;
  --color-monet-blue: #6B8FC5;
  --color-monet-lavender: #B8A8C6;

  /* Subtler shadows in dark mode */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
  --shadow-ios: 0 4px 12px rgba(0, 0, 0, 0.4),
                inset 0 1px 2px rgba(255, 255, 255, 0.1);
}

/* Apply transitions only after initial load to prevent flash */
.theme-ready * {
  transition: var(--transition-theme);
}
```

### Theme toggle component

```astro
---
// src/components/ThemeToggle.astro
---

<button
  id="theme-toggle"
  class="theme-toggle"
  aria-label="Toggle dark mode"
  title="Toggle dark mode"
>
  <svg class="icon-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="5"/>
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
  <svg class="icon-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
</button>

<style>
  .theme-toggle {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-sm);
    color: var(--color-text-primary);
    min-width: 44px;
    min-height: 44px;
  }

  .theme-toggle:hover {
    background: var(--color-bg-secondary);
  }

  .icon-sun { display: block; }
  .icon-moon { display: none; }

  [data-theme="dark"] .icon-sun { display: none; }
  [data-theme="dark"] .icon-moon { display: block; }
</style>

<script>
  // Inline script to prevent flash of wrong theme
  const theme = (() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) {
      return localStorage.getItem('theme');
    }
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  })();

  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // Enable transitions after initial paint
  window.addEventListener('load', () => {
    document.body.classList.add('theme-ready');
  });

  // Toggle functionality
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  });

  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
  });
</script>
```

### Prevent theme flash on page load

Add this inline script to the `<head>` before any stylesheets:

```html
<!-- src/layouts/BaseLayout.astro -->
<head>
  <script is:inline>
    (function() {
      const theme = localStorage.getItem('theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
    })();
  </script>
  <!-- Rest of head content -->
</head>
```

---

## Reading utilities and navigation

### Table of contents with scroll spy

```astro
---
// src/components/TableOfContents.astro
const { headings } = Astro.props;
---

<nav class="toc" aria-label="Table of contents">
  <div class="toc-header">
    <span class="toc-title">Contents</span>
    <button class="toc-toggle" aria-expanded="true" aria-controls="toc-list">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>
  </div>

  <ol id="toc-list" class="toc-list">
    {headings.map((heading) => (
      <li class={`toc-item toc-level-${heading.depth}`}>
        <a href={`#${heading.slug}`} class="toc-link">
          {heading.text}
        </a>
      </li>
    ))}
  </ol>

  <div class="reading-progress-container">
    <div class="reading-progress-bar" id="reading-progress"></div>
  </div>
</nav>

<style>
  .toc {
    position: sticky;
    top: 1rem;
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
    padding: 1rem;
    background: var(--color-bg-elevated);
    border-radius: 12px;
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-sm);
  }

  .toc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-border);
  }

  .toc-title {
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .toc-toggle {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: var(--color-text-muted);
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .toc-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .toc-item {
    margin: 0.25rem 0;
  }

  .toc-level-3 { padding-left: 1rem; }
  .toc-level-4 { padding-left: 2rem; }

  .toc-link {
    display: block;
    padding: 0.375rem 0.5rem;
    color: var(--color-text-secondary);
    text-decoration: none;
    border-radius: 6px;
    font-size: 0.875rem;
    line-height: 1.4;
    transition: background-color 0.15s, color 0.15s;
  }

  .toc-link:hover {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
  }

  .toc-link.active {
    background: var(--color-action);
    color: white;
  }

  .reading-progress-container {
    margin-top: 1rem;
    height: 3px;
    background: var(--color-bg-secondary);
    border-radius: 2px;
    overflow: hidden;
  }

  .reading-progress-bar {
    height: 100%;
    width: 0%;
    background: var(--color-action);
    transition: width 0.1s ease-out;
  }

  /* Mobile: collapsible TOC */
  @media (max-width: 1023px) {
    .toc {
      position: relative;
      top: 0;
      margin-bottom: 1.5rem;
    }

    .toc-list[aria-hidden="true"] {
      display: none;
    }
  }
</style>

<script>
  // Scroll spy for active heading
  const tocLinks = document.querySelectorAll('.toc-link');
  const headings = document.querySelectorAll('h2[id], h3[id], h4[id]');

  function updateActiveHeading() {
    const scrollPosition = window.scrollY + 100;

    let currentHeading = null;
    headings.forEach((heading) => {
      if (heading.offsetTop <= scrollPosition) {
        currentHeading = heading;
      }
    });

    tocLinks.forEach((link) => {
      link.classList.remove('active');
      if (currentHeading && link.getAttribute('href') === `#${currentHeading.id}`) {
        link.classList.add('active');
      }
    });
  }

  // Reading progress
  function updateReadingProgress() {
    const article = document.querySelector('article') || document.body;
    const articleTop = article.offsetTop;
    const articleHeight = article.offsetHeight;
    const windowHeight = window.innerHeight;
    const scrollPosition = window.scrollY;

    const progress = Math.min(100, Math.max(0,
      ((scrollPosition - articleTop + windowHeight) / (articleHeight + windowHeight)) * 100
    ));

    document.getElementById('reading-progress').style.width = `${progress}%`;
  }

  // Throttled scroll handler
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateActiveHeading();
        updateReadingProgress();
        ticking = false;
      });
      ticking = true;
    }
  });

  // Mobile TOC toggle
  document.querySelector('.toc-toggle')?.addEventListener('click', (e) => {
    const button = e.currentTarget;
    const list = document.getElementById('toc-list');
    const isExpanded = button.getAttribute('aria-expanded') === 'true';

    button.setAttribute('aria-expanded', !isExpanded);
    list.setAttribute('aria-hidden', isExpanded);
  });
</script>
```

### Reading time estimation

```astro
---
// src/components/ReadingTime.astro
const { content } = Astro.props;

// Average reading speed: 200-250 words per minute
const words = content.split(/\s+/).length;
const readingTime = Math.ceil(words / 220);
---

<span class="reading-time">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
  {readingTime} min read
</span>

<style>
  .reading-time {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    color: var(--color-text-muted);
    font-size: 0.875rem;
  }

  .reading-time svg {
    flex-shrink: 0;
  }
</style>
```

### Scroll to top button

```astro
---
// src/components/ScrollToTop.astro
---

<button
  id="scroll-to-top"
  class="scroll-to-top"
  aria-label="Scroll to top"
  title="Back to top"
>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="18 15 12 9 6 15"/>
  </svg>
</button>

<style>
  .scroll-to-top {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    width: 48px;
    height: 48px;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-md);
    color: var(--color-text-primary);
    opacity: 0;
    visibility: hidden;
    transform: translateY(10px);
    transition: opacity 0.2s, visibility 0.2s, transform 0.2s, background-color 0.15s;
    z-index: 100;
  }

  .scroll-to-top:hover {
    background: var(--color-bg-secondary);
  }

  .scroll-to-top.visible {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  /* Position above chat widget on mobile */
  @media (max-width: 768px) {
    .scroll-to-top {
      bottom: 5rem;
      right: 1rem;
      width: 44px;
      height: 44px;
    }
  }
</style>

<script>
  const button = document.getElementById('scroll-to-top');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      button?.classList.add('visible');
    } else {
      button?.classList.remove('visible');
    }
  });

  button?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
</script>
```

### Reading settings panel (font size, line height)

```astro
---
// src/components/ReadingSettings.astro
---

<div class="reading-settings">
  <button
    class="reading-settings-toggle"
    aria-label="Reading settings"
    aria-expanded="false"
    aria-controls="reading-settings-panel"
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 7h16M4 12h16M4 17h10"/>
    </svg>
  </button>

  <div id="reading-settings-panel" class="reading-settings-panel" aria-hidden="true">
    <div class="setting-group">
      <label class="setting-label">Text size</label>
      <div class="setting-controls">
        <button class="setting-btn" data-action="font-decrease" aria-label="Decrease font size">A-</button>
        <span class="setting-value" id="font-size-value">100%</span>
        <button class="setting-btn" data-action="font-increase" aria-label="Increase font size">A+</button>
      </div>
    </div>

    <div class="setting-group">
      <label class="setting-label">Line spacing</label>
      <div class="setting-controls">
        <button class="setting-btn" data-action="line-compact" aria-label="Compact spacing">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
          </svg>
        </button>
        <button class="setting-btn" data-action="line-normal" aria-label="Normal spacing">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="5" x2="20" y2="5"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="19" x2="20" y2="19"/>
          </svg>
        </button>
        <button class="setting-btn" data-action="line-relaxed" aria-label="Relaxed spacing">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="4" x2="20" y2="4"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="20" x2="20" y2="20"/>
          </svg>
        </button>
      </div>
    </div>

    <button class="setting-reset" data-action="reset">Reset to defaults</button>
  </div>
</div>

<style>
  .reading-settings {
    position: relative;
  }

  .reading-settings-toggle {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-sm);
    color: var(--color-text-primary);
    min-width: 44px;
    min-height: 44px;
  }

  .reading-settings-toggle:hover {
    background: var(--color-bg-secondary);
  }

  .reading-settings-panel {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 220px;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1rem;
    box-shadow: var(--shadow-lg);
    z-index: 200;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-8px);
    transition: opacity 0.2s, visibility 0.2s, transform 0.2s;
  }

  .reading-settings-panel[aria-hidden="false"] {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  .setting-group {
    margin-bottom: 1rem;
  }

  .setting-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .setting-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .setting-btn {
    flex: 1;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-primary);
    min-height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.15s;
  }

  .setting-btn:hover {
    background: var(--color-border);
  }

  .setting-btn.active {
    background: var(--color-action);
    border-color: var(--color-action);
    color: white;
  }

  .setting-value {
    min-width: 48px;
    text-align: center;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .setting-reset {
    width: 100%;
    background: none;
    border: none;
    padding: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--color-action);
    text-align: center;
  }

  .setting-reset:hover {
    text-decoration: underline;
  }
</style>

<script>
  const DEFAULTS = {
    fontSize: 100,
    lineHeight: 'normal'
  };

  // Load saved settings
  function loadSettings() {
    const saved = localStorage.getItem('readingSettings');
    return saved ? JSON.parse(saved) : { ...DEFAULTS };
  }

  // Apply settings to document
  function applySettings(settings) {
    document.documentElement.style.setProperty('--reading-font-scale', settings.fontSize / 100);
    document.documentElement.setAttribute('data-line-height', settings.lineHeight);
    document.getElementById('font-size-value').textContent = `${settings.fontSize}%`;

    // Update active states
    document.querySelectorAll('[data-action^="line-"]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.action === `line-${settings.lineHeight}`);
    });
  }

  // Save settings
  function saveSettings(settings) {
    localStorage.setItem('readingSettings', JSON.stringify(settings));
  }

  // Initialize
  const settings = loadSettings();
  applySettings(settings);

  // Toggle panel
  document.querySelector('.reading-settings-toggle')?.addEventListener('click', (e) => {
    const panel = document.getElementById('reading-settings-panel');
    const isHidden = panel.getAttribute('aria-hidden') === 'true';
    panel.setAttribute('aria-hidden', !isHidden);
    e.currentTarget.setAttribute('aria-expanded', isHidden);
  });

  // Close on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.reading-settings')) {
      document.getElementById('reading-settings-panel')?.setAttribute('aria-hidden', 'true');
    }
  });

  // Handle setting changes
  document.querySelector('.reading-settings-panel')?.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;

    const settings = loadSettings();

    switch (action) {
      case 'font-increase':
        settings.fontSize = Math.min(150, settings.fontSize + 10);
        break;
      case 'font-decrease':
        settings.fontSize = Math.max(80, settings.fontSize - 10);
        break;
      case 'line-compact':
        settings.lineHeight = 'compact';
        break;
      case 'line-normal':
        settings.lineHeight = 'normal';
        break;
      case 'line-relaxed':
        settings.lineHeight = 'relaxed';
        break;
      case 'reset':
        Object.assign(settings, DEFAULTS);
        break;
    }

    applySettings(settings);
    saveSettings(settings);
  });
</script>
```

**Reading settings CSS (add to global styles):**

```css
/* Reading adjustments */
:root {
  --reading-font-scale: 1;
}

[data-line-height="compact"] .reading-content { line-height: 1.4; }
[data-line-height="normal"] .reading-content { line-height: 1.6; }
[data-line-height="relaxed"] .reading-content { line-height: 1.9; }

.reading-content {
  font-size: calc(var(--font-size-base) * var(--reading-font-scale));
}
```

---

## Implementing the early iPhone aesthetic with impressionist touches

The 2007-2012 iOS design language featured **realistic textures, 3D depth illusions, and glossy tactile buttons** - elements you can recreate with pure CSS while maintaining modern performance.

### Core visual techniques

**Skeuomorphic button with proper depth:**

```css
.retro-btn {
  background: linear-gradient(
    180deg,
    rgba(255,255,255,0.15) 0%,
    rgba(0,0,0,0.1) 100%
  ), var(--color-action);
  border: none;
  border-radius: 8px;
  box-shadow:
    0 4px 12px rgba(0,0,0,0.25),
    inset 0 1px 2px rgba(255,255,255,0.4),
    inset 0 -1px 2px rgba(0,0,0,0.15);
  padding: 10px 20px;
  color: white;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
}

.retro-btn:active {
  box-shadow:
    0 2px 6px rgba(0,0,0,0.2),
    inset 0 2px 4px rgba(0,0,0,0.2);
  transform: translateY(1px);
}
```

**Impressionist-inspired background with subtle texture:**

```css
.paper-texture {
  background:
    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E"),
    linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%);
  background-blend-mode: soft-light;
}
```

### Typography matching the era

Early iOS used **Helvetica Neue**. The best free alternatives on Google Fonts:

- **Inter** - Optimized for screens, excellent legibility, 9 weights
- **Roboto** - Closest geometric match to Helvetica Neue
- **Open Sans** - 85% similar, excellent for body text

```css
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 400;
  letter-spacing: -0.01em;
}
```

### Tailwind configuration for this aesthetic

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      boxShadow: {
        'ios': '0 4px 12px rgba(0,0,0,0.15), inset 0 1px 2px rgba(255,255,255,0.4)',
        'ios-pressed': 'inset 0 2px 4px rgba(0,0,0,0.2)',
      },
      colors: {
        'cream': '#F5F0E8',
        'ios-blue': '#007AFF',
        'monet-blue': '#4A6FA5',
      }
    }
  }
}
```

---

## Implementation architecture and Claude Code workflow

The complete system architecture:

```
+--------------------------------------------------+
|           Astro Static Site (Netlify CDN)        |
|  +--------------------------------------------+  |
|  |  Papers & Blog (Markdown -> HTML)          |  |
|  |  - Zero JS, instant load                   |  |
|  |  - Dark/light theme (CSS variables)        |  |
|  |  - Reading utilities (lazy-loaded)         |  |
|  +--------------------------------------------+  |
|  +--------------------------------------------+  |
|  |  Chat Widget (React/Preact Island)         |  |
|  |  - Loads via client:idle                   |  |
|  |  - Streaming response display              |  |
|  +--------------------------------------------+  |
+-------------------------+------------------------+
                          | (user sends message)
                          v
+--------------------------------------------------+
|         Netlify Function (/api/chat)             |
|  1. Rate limit check (in-memory LRU)             |
|  2. Input validation & sanitization              |
|  3. Generate query embedding (Transformers.js)   |
|  4. Search bundled vector index (~3-5ms)         |
|  5. Construct prompt with RAG context            |
|  6. Stream DeepSeek response back                |
+--------------------------------------------------+
|  Bundled Data (deployed with function):          |
|  +--------------------------------------------+  |
|  |  vectors.json - 30K embeddings (~12MB gz)  |  |
|  |  No external database calls                |  |
|  +--------------------------------------------+  |
+-------------------------+------------------------+
                          |
                          v
                  +---------------+
                  | DeepSeek API  |
                  | (streaming)   |
                  | - $0.028/1M   |
                  | ONLY external |
                  | dependency    |
                  +---------------+
```

**Key architectural change:** Vector search now runs entirely within the serverless function. The pre-built index deploys alongside your code. Query latency drops from 10-30ms (external DB call) to 3-5ms (in-memory search). Cold starts include ~100ms to parse the index, but warm requests see no network overhead for vector operations.

### Recommended implementation order

**Phase 1 - Foundation:**
- Set up Astro project with Tailwind
- Configure Netlify deployment with security headers
- Implement dark/light theme system
- Create basic page structure and skeuomorphic styling
- Mobile-first responsive layout

**Phase 2 - Content & Reading Experience:**
- Convert papers from PDF to markdown
- Implement table of contents with scroll spy
- Add reading time estimation
- Create reading settings panel (font size, line spacing)
- Add scroll-to-top button
- Test on mobile devices

**Phase 3 - Vector Index (no external setup required):**
- Write chunking script for markdown papers (800-1200 tokens, split on headers)
- Create build-time embedding script using OpenAI text-embedding-3-small
- Generate static index.json with all vectors and metadata
- Add index to netlify/functions/data/ directory
- Test index size and cold start performance

**Phase 4 - RAG Chat:**
- Build Netlify function with in-memory rate limiting
- Implement query embedding with Transformers.js (or OpenAI for consistency)
- Add vector search using bundled index
- Integrate DeepSeek API with streaming
- Create React chat widget component
- Mobile-optimized chat interface
- Test end-to-end latency (target: <2s for first token)

### Claude Code optimization tips

Create a `CLAUDE.md` file documenting your conventions:

```markdown
# Project Conventions

## Stack
- Astro 5.x with static output
- Tailwind CSS with custom skeuomorphic utilities
- React components for interactive islands
- Netlify Functions (Node.js) for API
- Self-contained vector search (no external DB)

## File Structure
- src/pages/ - Astro pages and markdown content
- src/components/ - React/Astro components
- src/styles/ - Global CSS and Tailwind config
- netlify/functions/ - Serverless functions
- netlify/functions/data/ - Vector index (index.json)
- scripts/ - Build-time scripts (embedding generation)
- content/papers/ - Source markdown for papers

## Vector Search
- Index built at deploy time, bundled with function
- Query embeddings via Transformers.js (zero external calls)
- Brute-force cosine similarity (fast enough for 30K vectors)
- Rate limiting via in-memory LRU cache

## Design System
- Mobile-first: base styles for phones, media queries for larger screens
- Touch targets: minimum 44x44px
- Use iOS-inspired shadows: shadow-ios class
- Buttons: rounded-lg with gradient overlays
- Colors: cream backgrounds, ios-blue accents
- Theme: CSS variables with data-theme attribute

## Accessibility
- All interactive elements keyboard accessible
- ARIA labels on icon-only buttons
- Proper heading hierarchy
- Color contrast ratio minimum 4.5:1
```

---

## Performance budget

| Metric | Target | Achieved by |
|--------|--------|-------------|
| First Contentful Paint | < 1.2s | Static HTML, inlined critical CSS |
| Largest Contentful Paint | < 1.5s | Lazy-loaded images, no blocking JS |
| Time to Interactive | < 2.0s | Islands architecture, client:idle |
| Total page weight | < 200KB | No JS by default, optimized images |
| Mobile Lighthouse score | > 95 | All of the above |

### Testing checklist

- [ ] Test on actual mobile devices (not just browser DevTools)
- [ ] Test on slow 3G connection
- [ ] Verify theme toggle works without flash
- [ ] Check touch targets with finger (not mouse)
- [ ] Test reading settings persistence across sessions
- [ ] Verify TOC scroll spy on long articles

---

## Conclusion

The **Astro + Netlify + embedded vector search + DeepSeek** stack delivers on all your priorities: cost efficiency (under $2/month), fast page loads (sub-1.5s LCP), simple deployment (git push to Netlify), minimal external dependencies (DeepSeek API only), and full control over your data.

**Version 2 additions:**
- Self-contained vector search with pre-built index bundled in deployment
- In-memory rate limiting (no external database required)
- Comprehensive security hardening with CSP headers and input sanitization
- Dark/light theme with system preference detection and smooth transitions
- Reading utilities: TOC with scroll spy, reading progress, font/line-height controls
- Mobile-first responsive design with proper touch targets and fluid typography
- Performance budget with concrete metrics

**Why this architecture maximizes control:**
- Vector index is a JSON file you own and can back up anywhere
- No database vendor lock-in - switch to LanceDB or any format if needs change
- Rate limiting resets gracefully on cold starts (acceptable for low traffic)
- Only external dependency is DeepSeek for chat responses (easily swappable via OpenAI-compatible API)

DeepSeek's aggressive pricing makes the RAG chat widget economically viable at any traffic level - your 5 million free tokens alone could power the chat for over a year. The islands architecture ensures the chat widget never compromises your academic content's performance, while Netlify Functions keep API keys secure without requiring you to manage servers.

For the aesthetic, lean into CSS gradients and shadows rather than image textures to maintain performance. The combination of Monet-inspired warm creams with iOS blue accents creates visual distinction while the skeuomorphic depth cues make interactive elements immediately recognizable. Inter or Roboto fonts complete the early-iOS feel without requiring expensive font licenses.
