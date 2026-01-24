/**
 * Chunk Papers for RAG
 *
 * Reads markdown papers and splits them into semantic chunks suitable for RAG retrieval.
 * Target chunk size: 800-1200 tokens (estimated as words * 1.3)
 *
 * Splits on bold section headers (e.g., **INTRODUCTION**) which are used in these papers.
 * Handles edge cases:
 * - Sections > 1200 tokens: split at paragraph boundaries
 * - Sections < 400 tokens: merge with previous chunk
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const PAPERS_DIR = 'content/papers';
const OUTPUT_FILE = 'content/chunks.json';

// Token estimation: words * 1.3
const MIN_TOKENS = 400;
const TARGET_MIN_TOKENS = 800;
const TARGET_MAX_TOKENS = 1200;

function estimateTokens(text) {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  return Math.round(words * 1.3);
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterStr = match[1];
  const body = match[2];

  // Simple YAML parsing for our needs
  const frontmatter = {};
  const lines = frontmatterStr.split('\n');
  let currentKey = null;
  let multilineValue = '';

  for (const line of lines) {
    if (line.match(/^\w+:/)) {
      // Save previous multiline value if any
      if (currentKey && multilineValue) {
        frontmatter[currentKey] = multilineValue.trim();
        multilineValue = '';
      }

      const colonIdx = line.indexOf(':');
      currentKey = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();

      if (value === '|') {
        // Multiline value follows
        multilineValue = '';
      } else {
        frontmatter[currentKey] = value.replace(/^["']|["']$/g, '');
        currentKey = null;
      }
    } else if (currentKey && line.startsWith('  ')) {
      multilineValue += line.trim() + ' ';
    }
  }

  // Save last multiline value if any
  if (currentKey && multilineValue) {
    frontmatter[currentKey] = multilineValue.trim();
  }

  return { frontmatter, body };
}

function extractSections(body) {
  // These papers use bold text for section headers like **INTRODUCTION**
  // Split on these patterns
  const sectionPattern = /\*\*([A-Z][A-Z\s\-&]+)\*\*/g;

  const sections = [];
  let lastIndex = 0;
  let lastSectionName = 'Preamble';
  let match;

  // Find all section headers
  const matches = [];
  while ((match = sectionPattern.exec(body)) !== null) {
    matches.push({
      name: match[1].trim(),
      index: match.index,
      fullMatch: match[0]
    });
  }

  // Extract content between headers
  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];

    // Get content before this header
    if (currentMatch.index > lastIndex) {
      const content = body.slice(lastIndex, currentMatch.index).trim();
      if (content) {
        sections.push({
          name: lastSectionName,
          content: content
        });
      }
    }

    lastSectionName = currentMatch.name;
    lastIndex = currentMatch.index + currentMatch.fullMatch.length;
  }

  // Get remaining content after last header
  if (lastIndex < body.length) {
    const content = body.slice(lastIndex).trim();
    if (content) {
      sections.push({
        name: lastSectionName,
        content: content
      });
    }
  }

  // Filter out empty sections and clean up
  return sections.filter(s => s.content && estimateTokens(s.content) > 0);
}

function splitLongSection(section, maxTokens) {
  const { name, content } = section;
  const tokens = estimateTokens(content);

  if (tokens <= maxTokens) {
    return [section];
  }

  // Split at paragraph boundaries
  const paragraphs = content.split(/\n\n+/);
  const chunks = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para);
    const currentTokens = estimateTokens(currentChunk);

    // If adding this paragraph would exceed max, save current chunk and start new
    if (currentChunk && currentTokens + paraTokens > maxTokens) {
      chunks.push({
        name: chunkIndex === 0 ? name : `${name} (cont.)`,
        content: currentChunk.trim()
      });
      currentChunk = para;
      chunkIndex++;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n\n${para}` : para;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      name: chunkIndex === 0 ? name : `${name} (cont.)`,
      content: currentChunk.trim()
    });
  }

  return chunks;
}

function mergeSections(sections, minTokens) {
  if (sections.length === 0) return sections;

  const merged = [];
  let pendingSection = null;

  for (const section of sections) {
    const tokens = estimateTokens(section.content);

    if (pendingSection) {
      const pendingTokens = estimateTokens(pendingSection.content);

      // If current section is small, merge it
      if (tokens < minTokens) {
        pendingSection = {
          name: pendingSection.name,
          content: `${pendingSection.content}\n\n${section.name}\n\n${section.content}`
        };
      } else {
        // Save pending and start fresh
        merged.push(pendingSection);
        pendingSection = section;
      }
    } else if (tokens < minTokens) {
      // Start accumulating
      pendingSection = section;
    } else {
      pendingSection = section;
    }
  }

  // Don't forget last pending section
  if (pendingSection) {
    merged.push(pendingSection);
  }

  return merged;
}

function createChunks(paperSlug, paperTitle, sections) {
  const chunks = [];
  let chunkIndex = 0;

  for (const section of sections) {
    // Split long sections first
    const splitSections = splitLongSection(section, TARGET_MAX_TOKENS);

    for (const splitSection of splitSections) {
      const sectionSlug = splitSection.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Prepend section context to chunk
      const contextPrefix = `Paper: ${paperTitle}\nSection: ${splitSection.name}\n\n`;
      const fullText = contextPrefix + splitSection.content;

      chunks.push({
        id: `${paperSlug}-${sectionSlug}-${chunkIndex}`,
        paper: paperSlug,
        paperTitle: paperTitle,
        section: splitSection.name,
        chunkIndex: chunkIndex,
        text: fullText,
        tokenEstimate: estimateTokens(fullText)
      });

      chunkIndex++;
    }
  }

  return chunks;
}

async function processPaper(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(content);

  const paperSlug = frontmatter.slug || filePath.split('/').pop().replace('.md', '');
  const paperTitle = frontmatter.title || paperSlug;

  console.log(`Processing: ${paperTitle} (${paperSlug})`);

  // Extract sections from the paper
  let sections = extractSections(body);
  console.log(`  Found ${sections.length} sections`);

  // Merge small sections
  sections = mergeSections(sections, MIN_TOKENS);
  console.log(`  After merging small sections: ${sections.length} sections`);

  // Create chunks
  const chunks = createChunks(paperSlug, paperTitle, sections);
  console.log(`  Created ${chunks.length} chunks`);

  // Log chunk sizes
  for (const chunk of chunks) {
    console.log(`    - ${chunk.section}: ~${chunk.tokenEstimate} tokens`);
  }

  return chunks;
}

async function main() {
  console.log('Chunking papers for RAG...\n');

  const files = await readdir(PAPERS_DIR);
  const mdFiles = files.filter(f => f.endsWith('.md'));

  console.log(`Found ${mdFiles.length} paper(s) to process\n`);

  const allChunks = [];

  for (const file of mdFiles) {
    const filePath = join(PAPERS_DIR, file);
    const chunks = await processPaper(filePath);
    allChunks.push(...chunks);
    console.log('');
  }

  // Write output
  await writeFile(OUTPUT_FILE, JSON.stringify(allChunks, null, 2));

  console.log('='.repeat(50));
  console.log(`Total chunks created: ${allChunks.length}`);
  console.log(`Output written to: ${OUTPUT_FILE}`);

  // Summary statistics
  const tokenCounts = allChunks.map(c => c.tokenEstimate);
  const avgTokens = Math.round(tokenCounts.reduce((a, b) => a + b, 0) / tokenCounts.length);
  const minTokens = Math.min(...tokenCounts);
  const maxTokens = Math.max(...tokenCounts);

  console.log(`\nToken statistics:`);
  console.log(`  Min: ${minTokens}`);
  console.log(`  Max: ${maxTokens}`);
  console.log(`  Avg: ${avgTokens}`);
}

main().catch(console.error);
