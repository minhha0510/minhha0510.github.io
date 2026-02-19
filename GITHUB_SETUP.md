# GitHub Pages Setup Guide

## What You Get
- **Free hosting** on GitHub
- **Automatic deployment** when you push changes
- **URL**: `https://HaNguyen.github.io/HaNguyen-blog`
- **Custom domain** support (optional, later)

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. **Repository name**: `HaNguyen-blog`
3. Make it **Public** (required for free GitHub Pages)
4. Don't initialize with README (we have one)
5. Click **Create repository**

## Step 2: Push Your Code

In your project folder, run:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Add GitHub as remote (replace HaNguyen with your actual username)
git remote add origin https://github.com/HaNguyen/HaNguyen-blog.git

# Push
git branch -M main
git push -u origin main
```

## Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Click **Pages** in the left sidebar
4. Under "Source", select **GitHub Actions**

The workflow file (`.github/workflows/deploy.yml`) is already in your repo. GitHub will automatically detect it.

## Step 4: Wait for Deployment

1. Go to **Actions** tab in your repo
2. You'll see a workflow running
3. Wait for it to turn green ✓ (takes 2-3 minutes)
4. Visit: `https://HaNguyen.github.io/HaNguyen-blog`

## Step 5: Update Your Site URL

Edit `astro.config.mjs` and update your actual GitHub username:

```javascript
// Change this:
site: 'https://HaNguyen.github.io',

// To your actual username, e.g.:
site: 'https://minhha-nguyen.github.io',
```

Then push the change:
```bash
git add astro.config.mjs
git commit -m "Update site URL"
git push
```

## Making Updates

After initial setup, whenever you want to update your site:

```bash
git add .
git commit -m "Add new blog post"
git push
```

GitHub Actions will automatically rebuild and redeploy!

## Troubleshooting

### Site shows 404
- Check that GitHub Pages is enabled (Settings > Pages)
- Make sure the workflow completed successfully (Actions tab)
- Wait 2-3 minutes after the workflow completes

### Styles not loading
- Check that `base: '/HaNguyen-blog'` matches your repo name exactly
- Repo name is case-sensitive

### Changes not showing
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Check Actions tab to see if build succeeded
- Check that you pushed to the `main` branch

## Using a Custom Domain (Optional)

Later, if you want your own domain (e.g., `blog.hanguyen.com`):

1. Buy a domain from Namecheap, Cloudflare, etc.
2. Add a `CNAME` file in your repo with your domain
3. Configure DNS with your domain provider
4. Update `astro.config.mjs`:
   ```javascript
   site: 'https://blog.hanguyen.com',
   // Remove this line:
   // base: '/HaNguyen-blog',
   ```

## Quick Reference

| Task | Command |
|------|---------|
| Start local server | `npm run dev` |
| Build locally | `npm run build` |
| Deploy | `git push` (automatic) |
| Site URL | `https://HaNguyen.github.io/HaNguyen-blog` |

---

**That's it!** Your blog will be live on the internet for free. 🎉
