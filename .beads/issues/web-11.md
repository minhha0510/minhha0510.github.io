# web-11: Generate Embeddings and Build Vector Index

**Status:** open
**Priority:** high
**Type:** task
**Created:** 2026-01-23
**Blocked-by:** web-10
**Blocks:** web-12

## Summary

Generate embeddings for all chunks using OpenAI's text-embedding-3-small and build static JSON index for runtime search.

## Why This Matters

Per Building_plan_v3.md:
- "Generate embeddings (one-time, ~$0.10)" - Phase 3 requirement
- Static JSON index enables ~5ms query time
- No external vector DB dependency
- Index bundled with Netlify function

## Acceptance Criteria

- [ ] Script to generate embeddings via OpenAI API
- [ ] Use text-embedding-3-small model
- [ ] Dimension: 384 (reduced from 1536 for size/speed)
- [ ] Output to netlify/functions/data/index.json
- [ ] Include metadata for each vector
- [ ] Handle API rate limits gracefully
- [ ] Progress logging during generation

## Index Format

From v3 plan:
```json
{
  "dimensions": 384,
  "vectors": [0.1, 0.2, ...], // Flat array of all vectors
  "metadata": [
    { "id": "chunk-id", "paper": "paper-slug", "text": "first 500 chars..." },
    ...
  ]
}
```

## Script Implementation

From v3 plan:
```javascript
// scripts/build-index.js
import { readFile, writeFile } from 'fs/promises';

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

## Cost Estimate

- ~30K chunks estimated (3 papers)
- Actually more like 30-100 chunks for 3 papers
- text-embedding-3-small: $0.02/1M tokens
- Estimated cost: < $0.10 one-time

## Script Location

```
scripts/
  build-index.js
```

## Environment Variables

Requires: `OPENAI_API_KEY` (for embedding generation only)
