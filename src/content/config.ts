import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

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
  papers,
};
