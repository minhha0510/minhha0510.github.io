# Building a RAG-powered academic website for under $5/month

Your stack should be **Astro + Netlify + Supabase pgvector + DeepSeek**—delivering blazing-fast static content with an interactive chat widget at near-zero cost. This combination handles 500 monthly visitors with projected costs of **$0.10–$1.50/month** in API fees, with hosting completely free. The early iPhone aesthetic you want is achievable through CSS gradients, shadows, and texture techniques without sacrificing performance.

The key architectural insight: use Astro's "islands" pattern to load your chat widget only when the browser is idle, keeping initial page loads under 200KB while enabling full RAG functionality through Netlify serverless functions that proxy DeepSeek API calls securely.

---

## Netlify wins the hosting comparison decisively

For a RAG chat widget, **GitHub Pages is eliminated immediately**—it has no serverless function support, making secure API calls impossible. Your choice is between Netlify and Vercel, and Netlify edges ahead for this use case.

| Platform | Serverless Functions | Free Tier Bandwidth | Chat Widget Support | Commercial Use |
|----------|---------------------|---------------------|---------------------|----------------|
| **Netlify** | ✅ 125K invocations | 10GB equivalent | Full support | ✅ Allowed |
| **Vercel** | ✅ 1M invocations | 100GB | Full support | ❌ Hobby plan prohibits |
| **GitHub Pages** | ❌ None | 100GB | Requires external service | ❌ Prohibited |

Netlify's credit-based pricing covers your needs comfortably. For **400 monthly page views and 50 chat sessions**, you'd consume roughly **65 credits** of your free 300 monthly allocation—bandwidth (2 credits), compute (2.5 credits), and deploys (60 credits). That leaves substantial headroom for growth.

The critical requirement driving this choice: your chat widget **must** call DeepSeek's API through a server-side proxy. Client-side API calls would expose your API key in the browser's network tab, allowing anyone to steal it and rack up charges. Netlify Functions store your key in encrypted environment variables, add rate limiting, and enable response caching—all impossible with purely static hosting.

Latency impact is negligible. Serverless functions add **50–150ms** on cold starts and 10–30ms when warm. Given that LLM responses take 1–10 seconds regardless, this overhead disappears in practice.

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
|-----------|---------------|-------------|------------------|------------------|--------------------------|
| **Astro** | ~0KB (static pages) | Fast (Vite) | Native, excellent | Perfect (islands) | Excellent |
| Hugo | 0KB | Fastest | Excellent | Poor (manual JS) | Moderate |
| Next.js | 40–80KB (React) | Slower | Good (with plugins) | Excellent | Excellent |
| Eleventy | 0KB | Very fast | Excellent | Requires plugins | Good |
| SvelteKit | Small | Fast | Good | Excellent | Good |

Astro's component-based structure maps well to Claude Code's reasoning patterns. The clear separation between frontmatter (logic) and template (markup) in `.astro` files provides explicit context boundaries. You can write the chat widget in React, Preact, or Svelte—whichever you're most comfortable with—and Astro handles the rest.

**Expected performance metrics** with this setup: Lighthouse scores of 95–100, Largest Contentful Paint under 1.5 seconds, Time to Interactive under 2 seconds, and total page weight under 200KB (excluding lazy-loaded chat).

---

## Vector database selection favors Supabase pgvector or ChromaDB

For **10–50 academic papers generating approximately 30,000 vectors**, multiple free options work well. The choice depends on whether you prefer managed simplicity or embedded flexibility.

| Database | Free Tier | Your Use Case Fit | Hosting Complexity |
|----------|-----------|-------------------|-------------------|
| **Supabase pgvector** | 500MB, 2 projects | ✅ Excellent | Zero (managed) |
| **Qdrant Cloud** | 1GB forever-free | ✅ Excellent | Zero (managed) |
| **ChromaDB** | Unlimited (local) | ✅ Excellent | Embedded in function |
| Pinecone | 2GB, 5 indexes | ✅ Sufficient | Zero (managed) |
| LanceDB | Unlimited (local) | ✅ Excellent | File-based |

**Recommended primary choice: Supabase pgvector.** The free tier includes 500MB of database storage, which comfortably holds 30K vectors with 1536 dimensions. You also get authentication, row-level security, and a SQL interface for metadata queries—useful if you later want user accounts or paper categorization. The Supabase SDK integrates cleanly with serverless functions.

**Alternative for maximum simplicity: ChromaDB embedded.** ChromaDB runs directly inside your Netlify function with `pip install chromadb`, requiring zero infrastructure. Persist vectors to disk and back up to S3 or Cloudflare R2. This approach has slightly higher cold-start latency (the database loads into memory) but eliminates all external dependencies.

### Embedding strategy for medical academic content

DeepSeek **does not offer a dedicated embedding API**, so you need an external embedding provider. Two paths:

**Budget path ($0):** Use open-source BGE-base-en-v1.5 via Sentence Transformers, running inside your serverless function. Cold starts add 100–200ms, but you pay nothing. Research shows generalist models like BGE often outperform specialized medical embeddings for short-context retrieval.

**Quality path (~$0.10 one-time):** OpenAI's text-embedding-3-small at $0.02 per million tokens. Embedding 50 papers (~5M tokens) costs about ten cents total—a one-time expense at indexing time, not per-query.

For academic papers converted from PDF to markdown, chunk at **800–1,200 tokens** with 100-token overlap, splitting on markdown headers (`## `, `### `) to preserve section boundaries. Keep abstracts, methodology, and results as logical units rather than arbitrary splits.

---

## DeepSeek costs are remarkably low

DeepSeek's pricing structure makes it **10–50x cheaper** than GPT-4o or Claude Sonnet for your use case. The cache-hit pricing is particularly advantageous for RAG, where system prompts and document context repeat across queries.

| Cost Component | Price per 1M Tokens |
|----------------|---------------------|
| Input (cache hit) | $0.028 |
| Input (cache miss) | $0.28 |
| Output | $0.42 |

**Projected monthly costs by usage scenario:**

| Scenario | Chat Sessions | Total Queries | Monthly Cost |
|----------|---------------|---------------|--------------|
| Low (50 visitors) | 50 | 200 | **$0.10–$0.15** |
| Medium (200 visitors) | 200 | 800 | **$0.38–$0.58** |
| Higher (500 visitors) | 500 | 2,000 | **$0.95–$1.46** |

These calculations assume 2,000 input tokens per query (system prompt + RAG context + question) and 400 output tokens. With 50% cache hits—achievable since your RAG system prompt and paper contexts repeat—costs drop further.

New DeepSeek accounts receive **5 million free tokens** (~$1.40–$4.20 value), covering 6–25 months of expected usage depending on traffic. The API has no traditional rate limits; during high traffic, requests slow rather than fail, which suits a low-traffic academic site perfectly.

**Quality-cost tradeoff:** DeepSeek-V3.2 handles academic medical content capably. For pure factual Q&A about your papers, quality differences from GPT-4o or Claude are unlikely to matter. If you later need higher quality, switching APIs requires only changing the endpoint URL—DeepSeek's API is OpenAI-compatible.

---

## Total cost breakdown for your complete stack

| Component | Monthly Cost | Notes |
|-----------|-------------|-------|
| Hosting (Netlify) | **$0** | Free tier sufficient for 500 visitors |
| Vector DB (Supabase) | **$0** | Free tier: 500MB database |
| Embeddings (OpenAI) | **~$0.10** | One-time indexing cost |
| LLM (DeepSeek) | **$0.10–$1.50** | Based on chat usage |
| Domain (optional) | **$10–15/year** | Custom domain registration |
| **Total** | **$0.10–$1.50/month** | Plus ~$1/month amortized domain cost |

Annual cost projection: **under $30/year** for the higher usage scenario, compared to $100+ with OpenAI or Anthropic APIs.

---

## Implementing the early iPhone aesthetic with impressionist touches

The 2007–2012 iOS design language featured **realistic textures, 3D depth illusions, and glossy tactile buttons**—elements you can recreate with pure CSS while maintaining modern performance.

### Core visual techniques

**Skeuomorphic button with proper depth:**

```css
.retro-btn {
  background: linear-gradient(
    180deg,
    rgba(255,255,255,0.15) 0%,
    rgba(0,0,0,0.1) 100%
  ), #007aff;
  border-radius: 8px;
  box-shadow:
    0 4px 12px rgba(0,0,0,0.25),
    inset 0 1px 2px rgba(255,255,255,0.4),
    inset 0 -1px 2px rgba(0,0,0,0.15);
  padding: 10px 20px;
  color: white;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
}
```

**Impressionist-inspired background with subtle texture:**

```css
.paper-texture {
  background: 
    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E"),
    linear-gradient(135deg, #F5F0E8 0%, #E8E3D9 100%);
  background-blend-mode: soft-light;
}
```

### Typography matching the era

Early iOS used **Helvetica Neue**. The best free alternatives on Google Fonts:

- **Inter** — Optimized for screens, excellent legibility, 9 weights
- **Roboto** — Closest geometric match to Helvetica Neue
- **Open Sans** — 85% similar, excellent for body text

```css
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 400;
  letter-spacing: -0.01em;
}
```

### Impressionist color integration

Blend iOS functionality colors with a Monet-inspired base palette:

```css
:root {
  /* Impressionist background tones */
  --cream: #F5F0E8;
  --warm-gray: #E8E3D9;
  --monet-blue: #4A6FA5;
  --monet-lavender: #9B8AA6;
  
  /* iOS functional accents */
  --action-blue: #007AFF;
  --success-green: #4CD964;
  --warning-orange: #FF9500;
}
```

The combination creates a warm, atmospheric feel (impressionist) while maintaining clear interactive affordances (iOS blue for clickable elements). Avoid placing text on complex gradients—early iOS maintained high contrast for readability, which also ensures accessibility compliance.

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
┌─────────────────────────────────────────────────┐
│           Astro Static Site (Netlify CDN)       │
│  ┌───────────────────────────────────────────┐  │
│  │  Papers & Blog (Markdown → HTML)          │  │
│  │  - Zero JS, instant load                  │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  Chat Widget (React/Preact Island)        │  │
│  │  - Loads via client:idle                  │  │
│  │  - Streaming response display             │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────┘
                      │ (user sends message)
                      ▼
┌─────────────────────────────────────────────────┐
│         Netlify Function (/api/chat)            │
│  1. Rate limit check (10 req/min per IP)        │
│  2. Generate query embedding                    │
│  3. Search Supabase pgvector for context        │
│  4. Construct prompt with RAG context           │
│  5. Stream DeepSeek response back               │
└─────────────────────┬───────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌───────────────┐           ┌───────────────┐
│ Supabase      │           │ DeepSeek API  │
│ pgvector      │           │ (streaming)   │
│ - 30K vectors │           │ - $0.028/1M   │
└───────────────┘           └───────────────┘
```

### Recommended implementation order

**Week 1:** Set up Astro project with Tailwind, configure Netlify deployment, create basic page structure and skeuomorphic styling.

**Week 2:** Convert papers from PDF to markdown, implement Supabase pgvector schema, write embedding ingestion script, index all papers.

**Week 3:** Build Netlify function for RAG queries—embedding generation, vector search, prompt construction, DeepSeek API call with streaming.

**Week 4:** Create React chat widget component, implement facade pattern (static button that loads full widget on click/idle), add streaming response display, integrate with Netlify function.

### Claude Code optimization tips

Create a `CLAUDE.md` file documenting your conventions:

```markdown
# Project Conventions

## Stack
- Astro 5.x with static output
- Tailwind CSS with custom skeuomorphic utilities
- React components for interactive islands
- Netlify Functions (Node.js) for API

## File Structure
- src/pages/ - Astro pages and markdown content
- src/components/ - React/Astro components
- src/styles/ - Global CSS and Tailwind config
- netlify/functions/ - Serverless functions

## Design System
- Use iOS-inspired shadows: shadow-ios class
- Buttons: rounded-lg with gradient overlays
- Colors: cream backgrounds, ios-blue accents
```

This gives Claude Code explicit context for generating code that matches your aesthetic and architecture.

---

## Conclusion

The **Astro + Netlify + Supabase pgvector + DeepSeek** stack delivers on all your priorities: cost efficiency (under $2/month), fast page loads (sub-1.5s LCP), simple deployment (git push to Netlify), and minimal maintenance (managed services handle infrastructure). 

DeepSeek's aggressive pricing makes the RAG chat widget economically viable at any traffic level—your 5 million free tokens alone could power the chat for over a year. The islands architecture ensures the chat widget never compromises your academic content's performance, while Netlify Functions keep API keys secure without requiring you to manage servers.

For the aesthetic, lean into CSS gradients and shadows rather than image textures to maintain performance. The combination of Monet-inspired warm creams with iOS blue accents creates visual distinction while the skeuomorphic depth cues make interactive elements immediately recognizable. Inter or Roboto fonts complete the early-iOS feel without requiring expensive font licenses.