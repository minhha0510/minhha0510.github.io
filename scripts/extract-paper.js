#!/usr/bin/env node
/**
 * Paper to Blog Post Extraction Script
 * 
 * This script helps convert academic papers into blog-style posts.
 * It reads .docx files from the papers/ folder and generates a template
 * markdown file in src/content/posts/.
 * 
 * Usage:
 *   node scripts/extract-paper.js papers/my-paper.docx
 *   
 * Or process all papers:
 *   node scripts/extract-paper.js --all
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { basename, join } from 'path';
import mammoth from 'mammoth';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PAPERS_DIR = join(__dirname, '..', 'papers');
const POSTS_DIR = join(__dirname, '..', 'src/content/posts');

/**
 * Generate a slug from a title
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

/**
 * Estimate reading time from word count
 */
function estimateReadingTime(text) {
  const wordsPerMinute = 200;
  const wordCount = text.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Extract title from paper content
 */
function extractTitle(content) {
  // Try to find the title - usually the first bold or all-caps line
  const lines = content.split('\n').filter(line => line.trim());
  
  // Look for patterns that suggest a title
  for (const line of lines.slice(0, 20)) {
    const trimmed = line.trim();
    // Skip common non-title headers
    if (trimmed.match(/^(abstract|introduction|methods|results|conclusion)/i)) continue;
    if (trimmed.match(/^(doi|keywords|correspondence)/i)) continue;
    if (trimmed.length < 20) continue; // Too short for a title
    if (trimmed.length > 200) continue; // Too long for a title
    
    // If it looks like a title, return it
    if (trimmed.match(/[A-Z]/)) {
      return trimmed.replace(/\*\*/g, ''); // Remove markdown bold
    }
  }
  
  return 'Untitled Paper';
}

/**
 * Extract abstract from paper content
 */
function extractAbstract(content) {
  // Look for abstract section
  const abstractMatch = content.match(/abstract[\s\S]*?(?=\n\s*\n|introduction|background)/i);
  if (abstractMatch) {
    return abstractMatch[0]
      .replace(/abstract[:\s]*/i, '')
      .trim()
      .substring(0, 500);
  }
  
  // If no abstract found, return first substantial paragraph
  const paragraphs = content.split('\n\n');
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (trimmed.length > 100 && trimmed.length < 1000) {
      return trimmed.substring(0, 500);
    }
  }
  
  return '';
}

/**
 * Create blog post template from paper content
 */
function createBlogTemplate(title, content, filename) {
  const slug = slugify(title) + '-explained';
  const readingTime = Math.max(5, estimateReadingTime(content));
  const abstract = extractAbstract(content);
  const today = new Date().toISOString().split('T')[0];
  
  return `---
title: "${title.replace(/"/g, '\\"')}"
slug: "${slug}"
date: "${today}"
readingTime: ${readingTime}
excerpt: "${abstract.substring(0, 200).replace(/"/g, '\\"')}..."
category: "Research"
tags: []
paperTitle: "${title.replace(/"/g, '\\"')}"
authors: ""
journal: "[Forthcoming]"
---

## Introduction

[Write a compelling introduction that explains why this research matters to a general audience.]

## The Research Question

[What question did you set out to answer? Why is it important?]

## Background

[Provide context: what's the current state of knowledge? What gaps exist?]

## Methods

[Explain your approach in accessible terms. What data did you use? How did you analyze it?]

## Key Findings

[Present the main results. Use tables or bullet points for clarity.]

## What This Means

[Interpret the findings. What are the implications for patients, clinicians, or policy?]

## Strengths and Limitations

[Be transparent about what the study can and cannot tell us.]

## Conclusion

[Sum up the key takeaways.]

---

*This post is based on a paper currently under review.*

<!-- 
RAW PAPER CONTENT (for reference):
${content.substring(0, 2000)}...
-->
`;
}

/**
 * Process a single paper file
 */
async function processPaper(filePath) {
  console.log(`Processing: ${basename(filePath)}`);
  
  try {
    // Extract text from docx
    const buffer = readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    const content = result.value;
    
    // Extract metadata
    const title = extractTitle(content);
    const slug = slugify(title) + '-explained';
    
    // Create output path
    const outputPath = join(POSTS_DIR, `${slug}.md`);
    
    // Check if file already exists
    if (existsSync(outputPath)) {
      console.log(`  ⚠️  Post already exists: ${outputPath}`);
      return;
    }
    
    // Generate template
    const template = createBlogTemplate(title, content, basename(filePath));
    
    // Write file
    writeFileSync(outputPath, template, 'utf-8');
    console.log(`  ✓ Created: ${outputPath}`);
    console.log(`  📝 Title: ${title}`);
    console.log(`  🔗 Slug: ${slug}`);
    
  } catch (error) {
    console.error(`  ✗ Error processing ${filePath}:`, error.message);
  }
}

/**
 * Main function
 */
async function main() {
  // Ensure posts directory exists
  if (!existsSync(POSTS_DIR)) {
    mkdirSync(POSTS_DIR, { recursive: true });
  }
  
  const args = process.argv.slice(2);
  
  if (args.includes('--all')) {
    // Process all papers
    const { readdirSync } = await import('fs');
    const files = readdirSync(PAPERS_DIR)
      .filter(f => f.endsWith('.docx'))
      .map(f => join(PAPERS_DIR, f));
    
    console.log(`Found ${files.length} paper(s) to process\n`);
    
    for (const file of files) {
      await processPaper(file);
      console.log('');
    }
    
  } else if (args.length > 0) {
    // Process specific file(s)
    for (const file of args) {
      const filePath = file.startsWith('/') || file.includes(':\\') 
        ? file 
        : join(PAPERS_DIR, file);
      await processPaper(filePath);
    }
    
  } else {
    console.log(`
Paper to Blog Post Extraction Script

Usage:
  node scripts/extract-paper.js <file.docx>     Process a specific paper
  node scripts/extract-paper.js --all           Process all papers in papers/

Examples:
  node scripts/extract-paper.js papers/my-paper.docx
  node scripts/extract-paper.js --all

The script will:
1. Extract text from the .docx file
2. Generate a blog post template with frontmatter
3. Save it to src/content/posts/

You'll then need to:
1. Edit the template to add your narrative explanation
2. Fill in the authors and journal information
3. Add relevant tags
4. Remove the raw content comment at the bottom
`);
  }
}

main().catch(console.error);
