---
title: "Performance Checklist for Vanilla Sites"
date: "2024-09-05"
tags:
  - performance
  - best-practices
  - optimization
categories:
  - Best Practices
summary: "A quick checklist to keep framework-free sites loading fast and staying accessible."
---

Lightweight sites deserve to feel fast. The fact that this blog ships no runtime framework gives us a head start, but there are still a few habits worth adopting.

## Performance checks before deploying

- **Audit image sizes.** Resize and compress assets so they fit the layout and load instantly on mobile connections.
- **Minimize CSS.** Keep the stylesheet focused on layout and typography. When possible, remove unused selectors between releases.
- **Lean on browser caching.** Because file names rarely change, static hosts can cache aggressively and reduce repeat fetches.
- **Validate accessibility.** Headings, landmarks, and link text should remain descriptive to help assistive technologies.

## Automate what matters

Even without a complex toolchain you can automate link checking, HTML validation, or feed verification in CI. These lightweight safeguards protect your readers while preserving the simplicity that drew you to a vanilla stack in the first place.
