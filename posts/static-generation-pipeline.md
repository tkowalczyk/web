---
title: "Building the Static Generation Pipeline"
date: "2024-10-01"
tags:
  - static-site
  - tooling
  - markdown
categories:
  - Engineering
summary: "A tour of the build script that turns Markdown files into a fully featured static blog."
---

The build script that assembles this site is intentionally small, but it covers everything a modern blog needs. Every run performs a fresh sweep of the `docs` directory, parses each Markdown file with front matter, and outputs HTML, Markdown, and JSON views for every post.

### Key steps in the pipeline

1. **Front matter parsing** – Metadata such as title, date, tags, and categories are extracted with a lightweight library so writers can express structure without touching code.
2. **HTML conversion** – Content passes through the Markdown renderer and receives a shared layout that keeps navigation consistent across the entire site.
3. **Multi-format output** – Alongside the HTML view we publish the original Markdown file and a JSON representation that is perfect for LLM ingestion or automation.

```bash
npm run build
```

Running the build command is all it takes to regenerate the blog. The script handles pagination arrays, taxonomy pages, and even generates the RSS feed from the latest posts so readers can subscribe immediately.

In upcoming posts we will take a closer look at how each phase works and how you can tune it for your own publishing workflow.
