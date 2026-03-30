import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// Site URL: https://mh-nguyen.cv/

export default defineConfig({
  output: 'static',
  integrations: [
    tailwind(),
    sitemap()
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark'
    }
  },
  site: 'https://mh-nguyen.cv',
});
