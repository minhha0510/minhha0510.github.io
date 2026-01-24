/**
 * Convert DOCX papers to Markdown format
 * Extracts: Abstract, Introduction, Methods, Results, Discussion
 */

import mammoth from 'mammoth';
import { readdir, writeFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';

const PAPERS_DIR = './papers';
const OUTPUT_DIR = './content/papers';

// Convert HTML to clean Markdown
function htmlToMarkdown(html) {
  return html
    // Headers
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n')
    // Bold and italic
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    // Paragraphs
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
    // Lists
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    // Tables (basic conversion)
    .replace(/<table[^>]*>/gi, '\n')
    .replace(/<\/table>/gi, '\n')
    .replace(/<tr[^>]*>/gi, '|')
    .replace(/<\/tr>/gi, '|\n')
    .replace(/<th[^>]*>(.*?)<\/th>/gi, ' $1 |')
    .replace(/<td[^>]*>(.*?)<\/td>/gi, ' $1 |')
    // Line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// Extract sections from markdown content
function extractSections(markdown) {
  const sections = {
    abstract: '',
    introduction: '',
    methods: '',
    results: '',
    discussion: '',
    full: markdown
  };

  // Try to find abstract
  const abstractMatch = markdown.match(/(?:^|\n)#+\s*Abstract\s*\n([\s\S]*?)(?=\n#+\s|\n##|$)/i);
  if (abstractMatch) {
    sections.abstract = abstractMatch[1].trim();
  }

  // Try to find introduction
  const introMatch = markdown.match(/(?:^|\n)#+\s*Introduction\s*\n([\s\S]*?)(?=\n#+\s|\n##|$)/i);
  if (introMatch) {
    sections.introduction = introMatch[1].trim();
  }

  // Try to find methods
  const methodsMatch = markdown.match(/(?:^|\n)#+\s*(?:Methods?|Materials?\s+and\s+Methods?|Study\s+Design)\s*\n([\s\S]*?)(?=\n#+\s|\n##|$)/i);
  if (methodsMatch) {
    sections.methods = methodsMatch[1].trim();
  }

  // Try to find results
  const resultsMatch = markdown.match(/(?:^|\n)#+\s*Results?\s*\n([\s\S]*?)(?=\n#+\s|\n##|$)/i);
  if (resultsMatch) {
    sections.results = resultsMatch[1].trim();
  }

  // Try to find discussion
  const discussionMatch = markdown.match(/(?:^|\n)#+\s*(?:Discussion|Conclusion)\s*\n([\s\S]*?)(?=\n#+\s|\n##|$)/i);
  if (discussionMatch) {
    sections.discussion = discussionMatch[1].trim();
  }

  return sections;
}

// Calculate reading time (220 words per minute for academic content)
function calculateReadingTime(content) {
  const words = content.split(/\s+/).filter(w => w.length > 0).length;
  return Math.ceil(words / 220);
}

// Generate slug from filename
function generateSlug(filename) {
  return basename(filename, '.docx')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Generate title from filename
function generateTitle(filename) {
  const name = basename(filename, '.docx');
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function convertPaper(filepath) {
  console.log(`Converting: ${filepath}`);

  const result = await mammoth.convertToHtml({ path: filepath });

  if (result.messages.length > 0) {
    console.log('  Warnings:', result.messages.map(m => m.message).join(', '));
  }

  const markdown = htmlToMarkdown(result.value);
  const sections = extractSections(markdown);
  const readingTime = calculateReadingTime(markdown);
  const slug = generateSlug(filepath);
  const title = generateTitle(filepath);

  // Build frontmatter
  const frontmatter = `---
title: "${title}"
slug: "${slug}"
date: "${new Date().toISOString().split('T')[0]}"
readingTime: ${readingTime}
abstract: |
  ${sections.abstract.slice(0, 500).replace(/\n/g, '\n  ') || 'Abstract not found.'}
---`;

  // Build final markdown
  const finalMarkdown = `${frontmatter}

${markdown}
`;

  return { slug, content: finalMarkdown, readingTime, title };
}

async function main() {
  try {
    // Ensure output directory exists
    await mkdir(OUTPUT_DIR, { recursive: true });

    // Get all DOCX files
    const files = await readdir(PAPERS_DIR);
    const docxFiles = files.filter(f => f.endsWith('.docx'));

    console.log(`Found ${docxFiles.length} DOCX files\n`);

    const results = [];

    for (const file of docxFiles) {
      const filepath = join(PAPERS_DIR, file);
      const { slug, content, readingTime, title } = await convertPaper(filepath);

      const outputPath = join(OUTPUT_DIR, `${slug}.md`);
      await writeFile(outputPath, content, 'utf-8');

      console.log(`  -> ${outputPath} (${readingTime} min read)\n`);
      results.push({ slug, title, readingTime });
    }

    console.log('\nConversion complete!');
    console.log('Papers converted:', results.length);
    results.forEach(r => console.log(`  - ${r.title}: ${r.readingTime} min`));

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
