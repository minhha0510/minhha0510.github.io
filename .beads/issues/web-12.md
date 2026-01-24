# web-12: Netlify Function - RAG Chat Endpoint

**Status:** completed
**Priority:** critical
**Type:** feature
**Created:** 2026-01-23
**Blocked-by:** web-1, web-11
**Blocks:** web-13

## Summary

Create serverless function that handles chat queries: rate limiting, input validation, vector search, and DeepSeek streaming.

## Why This Matters

Per Building_plan_v3.md:
- Core RAG functionality - the "chat" in the chat widget
- "Server-side API proxy" - keeps API keys secure
- "Rate limiting" - prevents abuse
- "Vector search (~5ms)" - fast context retrieval

## Acceptance Criteria

### Security
- [x] POST method only (405 for others)
- [x] Origin validation (configurable domain)
- [x] Rate limiting: 10 requests/minute per IP
- [x] Input sanitization (strip HTML, limit length)
- [x] API key in environment variable (never exposed)

### Search
- [x] Load static vector index on cold start
- [x] Generate query embedding via OpenAI
- [x] Cosine similarity search, top 5 results
- [x] Return relevant context chunks

### LLM
- [x] Construct prompt with RAG context
- [x] Stream response from DeepSeek
- [x] Return streaming response to client

## Technical Implementation

From v3 plan:
```javascript
// netlify/functions/chat.js
import indexData from './data/index.json' assert { type: 'json' };

const rateLimit = new Map();

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

  // Vector search
  const queryVec = await getEmbedding(query);
  const results = search(queryVec, 5);

  // Build prompt with context
  const context = results.map(r => r.text).join('\n\n---\n\n');
  const prompt = `Based on the following research context, answer the question.

Context:
${context}

Question: ${query}

Provide a helpful, accurate answer based on the research. If the context doesn't contain relevant information, say so.`;

  // Stream DeepSeek response
  return streamDeepSeekResponse(prompt);
}

// Vector search functions (from v3 plan)
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

## Environment Variables

- `OPENAI_API_KEY` - For query embeddings
- `DEEPSEEK_API_KEY` - For LLM responses
- `ALLOWED_ORIGIN` - Domain for CORS (optional)

## Performance Notes

- Cold start: ~100ms to parse JSON index
- Search: ~5ms for cosine similarity
- Total latency dominated by LLM response time
