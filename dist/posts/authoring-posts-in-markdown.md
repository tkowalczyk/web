---
title: "Authoring Posts in Pure Markdown"
date: "2024-09-15"
tags:
  - writing
  - markdown
  - workflow
categories:
  - Guides
summary: "Tips for writing rich posts using only Markdown and a small amount of front matter."
---

Markdown remains the friendliest way to create structured content without touching HTML. With a few conventions you can write quickly and still give the build script everything it needs.

### Start with descriptive front matter

Add a short YAML block to the top of the file that declares the title, publication date, and any tags or categories. This metadata drives navigation, previews, and the RSS feed.

### Keep formatting lightweight

Use headings to break up sections, bullet lists for quick wins, and fenced code blocks for snippets. The stylesheet takes care of presentation, so there is no need to embed inline styles or custom classes.

### Preview locally

Run `npm run build` and open the generated HTML file in your browser. Because the output is static, you can even serve it with a simple Python HTTP server to mimic production hosting.

Writing in Markdown keeps the publishing workflow approachable for writers and maintainable for developers. Less time spent on formatting means more time crafting stories worth reading.
