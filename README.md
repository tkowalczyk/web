# Vanilla Markdown Blog

A framework-free static blog generator that turns Markdown files into a fully featured website. Posts are authored in plain Markdown with front matter metadata and compiled into vanilla HTML, CSS, and JavaScript assets that can be deployed to any static host.

## Features

- 🚀 **Zero framework runtime** – the generated site relies on vanilla HTML, CSS, and JavaScript only.
- 📝 **Markdown-first authoring** – write posts in `/posts` with YAML front matter for metadata.
- 🧭 **Automatic navigation** – index pages, pagination, and taxonomy pages for tags and categories are generated on build.
- 🔁 **Multiple post formats** – every article is available as rendered HTML, the original Markdown file, and a machine-friendly JSON document.
- 📰 **RSS feed** – keep subscribers up to date with a standards-compliant feed.
- 🌎 **Ready for static hosts** – deploy the `/dist` output to GitHub Pages, Cloudflare Pages, or any CDN.

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Generate the site**

   ```bash
   npm run build
   ```

   The static site is emitted to the `dist` directory. Open `dist/index.html` in a browser or serve the folder with your favourite static file server.

## Authoring content

- Create a new Markdown file in the `/posts` directory.
- Add front matter to describe the post:

  ```markdown
  ---
  title: "Your Post Title"
  date: "2024-10-05"
  tags:
    - example
    - markdown
  categories:
    - Guides
  summary: "A short preview shown on listing pages and the RSS feed."
  ---

  Write the rest of your article using Markdown syntax.
  ```

- `tags` and `categories` accept either arrays or comma-separated strings.
- Optional `draft: true` front matter excludes the post from the build output.

## Configuration

`site.config.js` centralises site-wide settings:

- `siteName` and `siteDescription` populate titles and metadata.
- `siteUrl` should point to the production domain and is used for canonical links and RSS.
- `basePath` controls the URL prefix (set to `/your-repo/` when deploying to a GitHub project site).
- `postsPerPage` configures how many posts appear on the blog index before pagination kicks in.
- `feed.path` and `feed.limit` control the RSS feed file name and length.

## Deployment

### GitHub Pages

1. Commit the repository and push to GitHub.
2. Enable GitHub Pages and set the build command to `npm run build` with `dist` as the output directory.
3. If the site is hosted at a project sub-path, update `basePath` in `site.config.js` (e.g. `/my-blog/`).

### Cloudflare Pages

1. Create a new Pages project and connect your repository.
2. Configure the build command (`npm run build`) and output directory (`dist`).
3. Deploy—Cloudflare will serve the static files globally.

Because the output is static, the same instructions apply to Netlify, Vercel static exports, or any other CDN-aware hosting platform.

## Directory structure

```
.
├── build.js          # Static site generator
├── posts/            # Markdown sources with front matter
├── src/assets/       # Shared CSS (and optional JS) copied into dist/assets
├── dist/             # Generated output (created after running the build)
└── site.config.js    # Site-wide configuration
```

## License

MIT
