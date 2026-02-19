import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Blog posts collection - includes paper explanations
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    date: z.string(),
    readingTime: z.number(),
    excerpt: z.string(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    // Paper-specific fields (for posts derived from papers)
    paperTitle: z.string().optional(),
    paperUrl: z.string().optional(),
    journal: z.string().optional(),
    authors: z.string().optional(),
    doi: z.string().optional(),
  }),
});

// Legacy papers collection (for reference)
const papers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/papers' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    date: z.string(),
    readingTime: z.number(),
    abstract: z.string(),
    journalUrl: z.string().optional(),
    topic: z.string().optional(),
  }),
});

export const collections = {
  posts,
  papers,
};
