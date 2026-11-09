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
  // The blog and portfolio were retired in Nov 2026; their old addresses land on the homepage.
  redirects: {
    '/writing': '/',
    '/portfolio': '/',
    '/portfolio/liteodyssey': '/',
    '/portfolio/pihf-mcp': '/',
    '/posts/5-aris-depression-explained': '/',
    '/posts/finasteride-depression-warning': '/',
    '/posts/hira-diabetes-study-explained': '/',
    '/posts/nz-glycemic-control-explained': '/',
  },
});
