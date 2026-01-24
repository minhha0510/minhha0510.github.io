/**
 * Build Vector Index Script
 *
 * Generates embeddings for all chunks and builds a static JSON index
 * for runtime vector search.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/build-index.mjs
 *
 * If OPENAI_API_KEY is not set, generates mock random vectors for testing.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const DIMENSIONS = 384;
const MODEL = 'text-embedding-3-small';

// Rate limiting: OpenAI allows 3000 RPM for text-embedding-3-small
const BATCH_SIZE = 20;
const DELAY_BETWEEN_BATCHES_MS = 200;

/**
 * Generate embedding via OpenAI API
 */
async function getEmbedding(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      input: text,
      dimensions: DIMENSIONS
    })
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`OpenAI API error: ${res.status} - ${error}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

/**
 * Generate batch of embeddings via OpenAI API
 */
async function getEmbeddingsBatch(texts) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      input: texts,
      dimensions: DIMENSIONS
    })
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`OpenAI API error: ${res.status} - ${error}`);
  }

  const data = await res.json();
  // Sort by index to maintain order
  return data.data.sort((a, b) => a.index - b.index).map(d => d.embedding);
}

/**
 * Generate mock random vector for testing
 */
function getMockEmbedding() {
  const vector = new Array(DIMENSIONS);
  for (let i = 0; i < DIMENSIONS; i++) {
    vector[i] = (Math.random() * 2 - 1); // Random value between -1 and 1
  }
  // Normalize to unit vector
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map(v => v / magnitude);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Build the vector index
 */
async function buildIndex() {
  const projectRoot = dirname(__dirname);
  const chunksPath = `${projectRoot}/content/chunks.json`;
  const outputPath = `${projectRoot}/netlify/functions/data/index.json`;

  console.log('Loading chunks...');
  const chunks = JSON.parse(await readFile(chunksPath, 'utf-8'));
  console.log(`Loaded ${chunks.length} chunks`);

  const useMock = !OPENAI_KEY;
  if (useMock) {
    console.log('\nWARNING: OPENAI_API_KEY not set. Generating MOCK vectors for testing.');
    console.log('Set OPENAI_API_KEY environment variable to generate real embeddings.\n');
  } else {
    console.log(`\nUsing OpenAI API with model: ${MODEL}, dimensions: ${DIMENSIONS}`);
  }

  const embeddings = [];

  if (useMock) {
    // Generate mock embeddings
    for (let i = 0; i < chunks.length; i++) {
      embeddings.push(getMockEmbedding());
      console.log(`Generated mock embedding ${i + 1}/${chunks.length}`);
    }
  } else {
    // Generate real embeddings via OpenAI API in batches
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, Math.min(i + BATCH_SIZE, chunks.length));
      const texts = batch.map(c => c.text);

      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} (chunks ${i + 1}-${i + batch.length})`);

      try {
        const batchEmbeddings = await getEmbeddingsBatch(texts);
        embeddings.push(...batchEmbeddings);
      } catch (error) {
        console.error(`Error processing batch: ${error.message}`);
        // Fall back to individual requests
        for (const chunk of batch) {
          try {
            const embedding = await getEmbedding(chunk.text);
            embeddings.push(embedding);
          } catch (e) {
            console.error(`Failed to get embedding for chunk ${chunk.id}: ${e.message}`);
            // Use mock embedding as fallback
            embeddings.push(getMockEmbedding());
          }
        }
      }

      // Rate limiting delay between batches
      if (i + BATCH_SIZE < chunks.length) {
        await sleep(DELAY_BETWEEN_BATCHES_MS);
      }
    }
  }

  console.log('\nBuilding index...');

  // Build the index
  const index = {
    dimensions: DIMENSIONS,
    vectors: embeddings.flat(),
    metadata: chunks.map(c => ({
      id: c.id,
      paper: c.paper,
      text: c.text.slice(0, 500)
    }))
  };

  // Ensure output directory exists
  await mkdir(dirname(outputPath), { recursive: true });

  // Write the index
  await writeFile(outputPath, JSON.stringify(index));

  // Calculate stats
  const vectorsSize = index.vectors.length * 4; // 4 bytes per float32
  const metadataSize = JSON.stringify(index.metadata).length;
  const totalSize = JSON.stringify(index).length;

  console.log('\nIndex built successfully!');
  console.log(`Output: ${outputPath}`);
  console.log(`\nStats:`);
  console.log(`  - Chunks: ${chunks.length}`);
  console.log(`  - Dimensions: ${DIMENSIONS}`);
  console.log(`  - Total vectors: ${embeddings.length}`);
  console.log(`  - Vector array length: ${index.vectors.length}`);
  console.log(`  - Estimated vector size: ${(vectorsSize / 1024).toFixed(2)} KB`);
  console.log(`  - Metadata size: ${(metadataSize / 1024).toFixed(2)} KB`);
  console.log(`  - Total file size: ${(totalSize / 1024).toFixed(2)} KB`);

  if (useMock) {
    console.log('\n[MOCK MODE] Generated random vectors. Run with OPENAI_API_KEY for real embeddings.');
  }
}

// Run the script
buildIndex().catch(error => {
  console.error('Error building index:', error);
  process.exit(1);
});
