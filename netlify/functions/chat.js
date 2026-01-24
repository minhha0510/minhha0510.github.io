/**
 * RAG Chat Endpoint - Netlify Serverless Function
 *
 * Handles chat queries with vector search and LLM streaming.
 *
 * Environment Variables:
 * - OPENAI_API_KEY: For generating query embeddings (text-embedding-3-small)
 * - DEEPSEEK_API_KEY: For LLM response streaming
 * - ALLOWED_ORIGIN: Optional domain for CORS validation (e.g., "yourdomain.com")
 *
 * Features:
 * - Rate limiting: 10 requests/minute per IP
 * - Input sanitization: HTML stripped, max 2000 chars
 * - Vector search with cosine similarity
 * - Streaming LLM responses
 * - Graceful fallbacks when API keys are not set
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Lazy-load index data to avoid cold start penalty on every import
let indexData = null;
function loadIndexData() {
  if (!indexData) {
    indexData = require('./data/index.json');
  }
  return indexData;
}

// Rate limiting: Map<IP, { start: number, count: number }>
const rateLimit = new Map();

// Clean up old rate limit entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const RATE_WINDOW_MS = 60000;
const RATE_LIMIT_MAX = 10;

let lastCleanup = Date.now();

function cleanupRateLimits() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [ip, data] of rateLimit.entries()) {
    if (now - data.start >= RATE_WINDOW_MS) {
      rateLimit.delete(ip);
    }
  }
}

/**
 * Cosine similarity between two vectors
 */
function cosine(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// Cached reshaped vectors
let vectors = null;

/**
 * Lazy load and reshape index data into vector objects
 */
function initVectors() {
  if (vectors) return vectors;

  const data = loadIndexData();
  const { dimensions, vectors: flat, metadata } = data;

  vectors = metadata.map((m, i) => ({
    ...m,
    vec: flat.slice(i * dimensions, (i + 1) * dimensions)
  }));

  return vectors;
}

/**
 * Vector search - find top K most similar chunks
 */
function search(queryVec, topK = 5) {
  const data = initVectors();
  return data
    .map(d => ({ ...d, score: cosine(queryVec, d.vec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Keyword-based fallback search when no embedding API is available
 */
function keywordSearch(query, topK = 5) {
  const data = initVectors();
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  if (queryWords.length === 0) {
    return data.slice(0, topK).map(d => ({ ...d, score: 0 }));
  }

  return data
    .map(d => {
      const textLower = d.text.toLowerCase();
      let score = 0;
      for (const word of queryWords) {
        if (textLower.includes(word)) {
          score += 1;
        }
      }
      // Normalize by query length
      return { ...d, score: score / queryWords.length };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Get embedding from OpenAI API
 */
async function getEmbedding(text) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // Return null to signal fallback to keyword search
    return null;
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 384
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Stream response from DeepSeek API
 */
async function streamDeepSeekResponse(prompt) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    // Return mock response for testing without API key
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache'
      },
      body: 'This is a mock response. Configure DEEPSEEK_API_KEY environment variable to enable LLM responses. Based on the context provided, I can see information about research papers, but I need an active API connection to generate proper responses.'
    };
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful research assistant. Answer questions based on the provided research context. Be concise and accurate. If the context does not contain relevant information, acknowledge this.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      stream: true,
      max_tokens: 1024
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
  }

  // Return streaming response
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    },
    body: response.body,
    isBase64Encoded: false
  };
}

/**
 * Sanitize input: strip HTML tags and limit length
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';

  return input
    .replace(/<[^>]*>/g, '')  // Remove HTML tags
    .replace(/[<>]/g, '')     // Remove any remaining angle brackets
    .trim()
    .slice(0, 2000);
}

/**
 * Main handler
 */
export async function handler(event) {
  // CORS headers
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  // Method check - POST only
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Origin validation (if ALLOWED_ORIGIN is set)
  if (process.env.ALLOWED_ORIGIN) {
    const origin = event.headers.origin || event.headers.Origin || '';
    if (!origin.includes(process.env.ALLOWED_ORIGIN)) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Forbidden' })
      };
    }
  }

  // Rate limiting
  cleanupRateLimits();
  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
             event.headers['client-ip'] ||
             'unknown';
  const now = Date.now();
  const limit = rateLimit.get(ip);

  if (limit && now - limit.start < RATE_WINDOW_MS) {
    if (limit.count >= RATE_LIMIT_MAX) {
      return {
        statusCode: 429,
        headers: {
          ...corsHeaders,
          'Retry-After': Math.ceil((RATE_WINDOW_MS - (now - limit.start)) / 1000).toString()
        },
        body: JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' })
      };
    }
    limit.count++;
  } else {
    rateLimit.set(ip, { start: now, count: 1 });
  }

  // Parse and validate input
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid JSON' })
    };
  }

  const query = sanitizeInput(body.query);

  if (!query) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid or empty query' })
    };
  }

  try {
    // Vector search
    let results;
    const queryVec = await getEmbedding(query);

    if (queryVec) {
      // Use vector search with embeddings
      results = search(queryVec, 5);
    } else {
      // Fallback to keyword search when no API key
      results = keywordSearch(query, 5);
    }

    // Build prompt with context
    const context = results
      .filter(r => r.score > 0)
      .map(r => r.text)
      .join('\n\n---\n\n');

    if (!context) {
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          response: 'I could not find relevant information in the research database for your query. Please try rephrasing or asking about specific research topics.',
          sources: []
        })
      };
    }

    const prompt = `Based on the following research context, answer the question.

Context:
${context}

Question: ${query}

Provide a helpful, accurate answer based on the research. If the context doesn't contain relevant information, say so.`;

    // Stream DeepSeek response
    const llmResponse = await streamDeepSeekResponse(prompt);

    // Add CORS headers to LLM response
    return {
      ...llmResponse,
      headers: {
        ...corsHeaders,
        ...llmResponse.headers
      }
    };

  } catch (error) {
    console.error('Chat function error:', error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'An error occurred processing your request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
}
