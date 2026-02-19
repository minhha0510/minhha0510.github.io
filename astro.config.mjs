import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// IMPORTANT: Repository is minhha0510/minhha0510
// Site URL: https://minhha0510.github.io/minhha0510/
// Must include base path for subdirectory deployment

export default defineConfig({
  output: 'static',
  base: '/minhha0510',
  integrations: [
    tailwind()
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark'
    }
  },
  site: 'https://minhha0510.github.io',
});
