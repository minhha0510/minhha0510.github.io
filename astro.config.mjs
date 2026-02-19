import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// This is a username.github.io repository, so we serve from root
// No base path needed for username.github.io sites

export default defineConfig({
  output: 'static',
  integrations: [
    tailwind()
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark'
    }
  },
  // Your site URL
  site: 'https://minhha0510.github.io',
});
