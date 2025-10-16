---
title: "Deploying to GitHub Pages and Cloudflare Pages"
date: "2024-09-20"
tags:
  - deployment
  - github-pages
  - cloudflare-pages
categories:
  - Operations
summary: "Simple deployment workflows for publishing the generated site to GitHub Pages or Cloudflare Pages."
---

Static output is wonderfully portable. Once the generator finishes, everything lives inside a single `docs` directory that can be uploaded to any static host. Two popular options—GitHub Pages and Cloudflare Pages—require just a handful of steps.

### GitHub Pages

1. Push your repository to GitHub and enable GitHub Pages in the project settings.
2. Configure the site to use the `docs` directory, either through the Pages build workflow or by checking in the generated files on a dedicated branch.
3. Update the `basePath` value in `site.config.js` if you are hosting under a project subdirectory (e.g. `/my-blog/`).

### Cloudflare Pages

1. Create a Pages project and connect it to your repository.
2. Set the build command to `npm run build` and the output directory to `docs`.
3. Deploy, then take advantage of Cloudflare's global CDN and preview deployments.

Both hosts handle HTTPS, caching, and CDN distribution out of the box. With the generator doing the heavy lifting you can deploy confidently in minutes.
