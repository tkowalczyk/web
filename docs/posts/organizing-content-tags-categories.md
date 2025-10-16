---
title: "Organizing Content with Tags and Categories"
date: "2024-09-28"
tags:
  - content-architecture
  - taxonomy
  - metadata
categories:
  - Content Strategy
summary: "How tags and categories keep a static markdown blog navigable without any client-side routing."
---

A blog is only as useful as its navigation. Tags and categories give readers multiple pathways to the ideas that interest them most, and they require almost no overhead when working in Markdown.

## Tags vs. categories

- **Categories** describe the broad buckets of content on the site. Think "Engineering", "Content Strategy", or "Productivity".
- **Tags** capture more granular concepts such as "metadata", "deployment", or "CLI tooling".

By combining both, we make it trivial to surface related material without implementing client-side routing or complicated search engines.

## Building the taxonomy index

During the build process we gather every tag and category, group the posts, and generate dedicated listing pages. Each page inherits the same layout and exposes links back to the original articles. Because everything is statically rendered there is no need for hash-based routing or runtime fetches—links are simple, descriptive URLs.

When you publish your own content, invest a few seconds in tags and categories. The payoff is a smooth reading experience for visitors and a searchable archive for you.
