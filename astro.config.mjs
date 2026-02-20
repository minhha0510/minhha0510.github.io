import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// Site URL: https://mh-nguyen.cv/

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
  site: 'https://mh-nguyen.cv',
});
