const path = require("node:path");
const fs = require("node:fs/promises");
const fse = require("fs-extra");
const matter = require("gray-matter");
const { marked } = require("marked");
const config = require("./site.config");

const ROOT_DIR = __dirname;
const POSTS_DIR = path.join(ROOT_DIR, "posts");
const OUTPUT_DIR = path.join(ROOT_DIR, "docs");
const ASSETS_DIR = path.join(ROOT_DIR, "src", "assets");
const BASE_PATH = normalizeBasePath(config.basePath);
const SITE_URL = ensureTrailingSlash(config.siteUrl || "");

marked.use({
  mangle: false,
  headerIds: true,
  gfm: true
});

async function buildSite() {
  try {
    await cleanOutput();
    await copyAssets();
    const posts = await loadPosts();
    await generatePostPages(posts);
    await generateIndexPages(posts);
    await generateTaxonomyPages(posts, {
      type: "tag",
      directory: "tags",
      pageTitle: "Browse by Tag",
      emptyMessage: "No tags have been published yet."
    });
    await generateTaxonomyPages(posts, {
      type: "category",
      directory: "categories",
      pageTitle: "Browse by Category",
      emptyMessage: "No categories have been published yet."
    });
    await generateFeed(posts);
    console.log("✔ Site built successfully");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

async function cleanOutput() {
  await fse.remove(OUTPUT_DIR);
  await fse.ensureDir(OUTPUT_DIR);
}

async function copyAssets() {
  const destination = path.join(OUTPUT_DIR, "assets");
  if (await fse.pathExists(ASSETS_DIR)) {
    await fse.copy(ASSETS_DIR, destination);
  }
}

async function loadPosts() {
  await fse.ensureDir(POSTS_DIR);
  const entries = await fs.readdir(POSTS_DIR);
  const markdownFiles = entries.filter((item) => item.toLowerCase().endsWith(".md"));

  const posts = [];

  for (const fileName of markdownFiles) {
    const filePath = path.join(POSTS_DIR, fileName);
    const rawFile = await fs.readFile(filePath, "utf8");
    const parsed = matter(rawFile);
    const data = parsed.data || {};
    const content = parsed.content || "";

    if (!data.title) {
      throw new Error(`Missing required front matter field \"title\" in ${fileName}`);
    }

    const slug = data.slug ? slugify(data.slug) : slugify(fileName.replace(/\.md$/i, ""));
    const date = data.date ? new Date(data.date) : new Date();
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid date field in ${fileName}`);
    }

    const html = marked.parse(content);
    const excerpt = data.summary || data.description || createExcerpt(html);

    const tags = normalizeTaxonomy(data.tags);
    const categories = normalizeTaxonomy(data.categories);

    posts.push({
      slug,
      title: String(data.title),
      description: data.description || data.summary || excerpt,
      date,
      isoDate: date.toISOString(),
      formattedDate: formatDate(date),
      tags,
      categories,
      tagsDetailed: tags.map((tag) => ({ name: tag, slug: slugify(tag) })),
      categoriesDetailed: categories.map((category) => ({ name: category, slug: slugify(category) })),
      excerpt,
      html,
      markdown: parsed.content.trim(),
      raw: rawFile,
      draft: Boolean(data.draft)
    });
  }

  const published = posts.filter((post) => !post.draft);
  published.sort((a, b) => b.date - a.date);
  return published;
}

async function generatePostPages(posts) {
  if (!posts.length) {
    return;
  }

  const postsDir = path.join(OUTPUT_DIR, "posts");
  await fse.ensureDir(postsDir);

  for (let index = 0; index < posts.length; index += 1) {
    const post = posts[index];
    const newer = index > 0 ? posts[index - 1] : null;
    const older = index < posts.length - 1 ? posts[index + 1] : null;

    const postDir = path.join(postsDir, post.slug);
    await fse.ensureDir(postDir);

    const htmlPath = path.join(postDir, "index.html");
    const markdownPath = path.join(postsDir, `${post.slug}.md`);
    const jsonPath = path.join(postsDir, `${post.slug}.json`);

    const rendered = renderPostPage(post, { newer, older });
    await fs.writeFile(htmlPath, rendered, "utf8");
    await fs.writeFile(markdownPath, post.raw, "utf8");

    const jsonData = {
      title: post.title,
      slug: post.slug,
      date: post.isoDate,
      formattedDate: post.formattedDate,
      description: post.description,
      excerpt: post.excerpt,
      tags: post.tags,
      categories: post.categories,
      author: config.author || null,
      urls: {
        html: canonicalUrl(`posts/${post.slug}/`),
        markdown: canonicalUrl(`posts/${post.slug}.md`),
        json: canonicalUrl(`posts/${post.slug}.json`)
      },
      content: {
        markdown: post.markdown,
        html: post.html
      }
    };

    await fs.writeFile(jsonPath, `${JSON.stringify(jsonData, null, 2)}\n`, "utf8");
  }
}

async function generateIndexPages(posts) {
  const perPage = config.postsPerPage || 5;
  const totalPages = Math.max(1, Math.ceil(posts.length / perPage));

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
    const currentPage = pageIndex + 1;
    const start = pageIndex * perPage;
    const end = start + perPage;
    const pagePosts = posts.slice(start, end);

    const html = renderIndexPage({
      posts: pagePosts,
      currentPage,
      totalPages
    });

    if (currentPage === 1) {
      await fs.writeFile(path.join(OUTPUT_DIR, "index.html"), html, "utf8");
    } else {
      const pageDir = path.join(OUTPUT_DIR, "page", String(currentPage));
      await fse.ensureDir(pageDir);
      await fs.writeFile(path.join(pageDir, "index.html"), html, "utf8");
    }
  }
}

async function generateTaxonomyPages(posts, { type, directory, pageTitle, emptyMessage }) {
  const taxonomyItems = collectTaxonomy(posts, type);
  const baseDir = path.join(OUTPUT_DIR, directory);
  await fse.ensureDir(baseDir);

  const overviewContent = renderLayout({
    title: `${capitalize(directory)} · ${config.siteName}`,
    description: config.siteDescription,
    canonical: canonicalUrl(`${directory}/`),
    pageHeading: pageTitle,
    content: taxonomyItems.length ? renderTaxonomyOverview(taxonomyItems, directory) : `<p>${escapeHtml(emptyMessage)}</p>`
  });

  await fs.writeFile(path.join(baseDir, "index.html"), overviewContent, "utf8");

  for (const item of taxonomyItems) {
    const itemDir = path.join(baseDir, item.slug);
    await fse.ensureDir(itemDir);

    const pageContent = renderLayout({
      title: `${capitalize(type)}: ${item.name} · ${config.siteName}`,
      description: `Posts filed under ${item.name}.`,
      canonical: canonicalUrl(`${directory}/${item.slug}/`),
      pageHeading: `${capitalize(type)}: ${item.name}`,
      content: renderTaxonomyPosts(item.posts)
    });

    await fs.writeFile(path.join(itemDir, "index.html"), pageContent, "utf8");
  }
}

async function generateFeed(posts) {
  const feedConfig = config.feed || {};
  const feedPath = feedConfig.path || "feed.xml";
  const limit = feedConfig.limit || 20;
  const latest = posts.slice(0, limit);

  const items = latest
    .map((post) => {
      const link = canonicalUrl(`posts/${post.slug}/`);
      const description = escapeXml(post.excerpt);
      return [
        "  <item>",
        `    <title>${escapeXml(post.title)}</title>`,
        `    <link>${link}</link>`,
        `    <guid>${link}</guid>`,
        `    <pubDate>${new Date(post.isoDate).toUTCString()}</pubDate>`,
        `    <description><![CDATA[${post.excerpt}]]></description>`,
        `    <content:encoded><![CDATA[${post.html}]]></content:encoded>`,
        "  </item>"
      ].join("\n");
    })
    .join("\n");

  const rss = [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<rss version=\"2.0\" xmlns:content=\"http://purl.org/rss/1.0/modules/content/\" xmlns:atom=\"http://www.w3.org/2005/Atom\">",
    "<channel>",
    `  <title>${escapeXml(config.siteName)}</title>`,
    `  <link>${SITE_URL}</link>`,
    `  <description>${escapeXml(config.siteDescription)}</description>`,
    `  <language>en</language>`,
    `  <atom:link href="${canonicalUrl(feedPath)}" rel="self" type="application/rss+xml" />`,
    items,
    "</channel>",
    "</rss>",
    ""
  ].join("\n");

  const outputPath = path.join(OUTPUT_DIR, feedPath);
  await fse.ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, rss, "utf8");
}

function renderPostPage(post, { newer, older }) {
  const taxonomyMeta = [
    renderMetaGroup("Categories", post.categoriesDetailed, "categories"),
    renderMetaGroup("Tags", post.tagsDetailed, "tags")
  ]
    .filter(Boolean)
    .join("\n");

  const neighborNav = renderPostNeighbors({ newer, older });

  const content = `
    <article class="post">
      <header class="post-header">
        <h1>${escapeHtml(post.title)}</h1>
        <div class="post-meta">
          <time datetime="${post.isoDate}">${escapeHtml(post.formattedDate)}</time>
          ${taxonomyMeta}
        </div>
        <div class="post-formats">
          <a class="format-link" href="${withBase(`posts/${post.slug}.md`)}">Markdown</a>
          <a class="format-link" href="${withBase(`posts/${post.slug}.json`)}">JSON</a>
        </div>
      </header>
      <div class="post-content">
        ${post.html}
      </div>
      ${renderPostTaxonomyFooters(post)}
    </article>
    ${neighborNav}
  `;

  return renderLayout({
    title: post.title,
    description: post.description,
    canonical: canonicalUrl(`posts/${post.slug}/`),
    content
  });
}

function renderPostTaxonomyFooters(post) {
  const tags = post.tagsDetailed.length
    ? `<div class="taxonomy-tags"><span>Filed under:</span>${post.tagsDetailed
        .map((tag) => `<a href="${withBase(`tags/${tag.slug}/`)}">#${escapeHtml(tag.name)}</a>`)
        .join(" ")}</div>`
    : "";

  const categories = post.categoriesDetailed.length
    ? `<div class="taxonomy-categories"><span>Categories:</span>${post.categoriesDetailed
        .map((category) => `<a href="${withBase(`categories/${category.slug}/`)}">${escapeHtml(category.name)}</a>`)
        .join(" ")}</div>`
    : "";

  if (!tags && !categories) {
    return "";
  }

  return `<footer class="post-footer">${categories}${tags}</footer>`;
}

function renderPostNeighbors({ newer, older }) {
  if (!newer && !older) {
    return "";
  }

  const newerLink = newer
    ? `<a class="post-nav-link newer" href="${withBase(`posts/${newer.slug}/`)}">← ${escapeHtml(newer.title)}</a>`
    : "<span></span>";

  const olderLink = older
    ? `<a class="post-nav-link older" href="${withBase(`posts/${older.slug}/`)}">${escapeHtml(older.title)} →</a>`
    : "<span></span>";

  return `<nav class="post-pagination" aria-label="Post pagination">${newerLink}${olderLink}</nav>`;
}

function renderIndexPage({ posts, currentPage, totalPages }) {
  const previews = posts.map(renderPostPreview).join("\n");
  const pagination = renderPagination(currentPage, totalPages);

  return renderLayout({
    title: currentPage === 1 ? config.siteName : `Page ${currentPage} · ${config.siteName}`,
    description: config.siteDescription,
    canonical: canonicalUrl(currentPage === 1 ? "" : `page/${currentPage}/`),
    pageHeading: currentPage === 1 ? "Latest Posts" : `Posts · Page ${currentPage}`,
    content: `${previews}${pagination}`
  });
}

function renderPostPreview(post) {
  const tags = post.tagsDetailed.slice(0, 3);

  const tagList = tags.length
    ? `<ul class="inline-tags">${tags
        .map((tag) => `<li><a href="${withBase(`tags/${tag.slug}/`)}">#${escapeHtml(tag.name)}</a></li>`)
        .join("")}</ul>`
    : "";

  return `
    <article class="post-preview">
      <h2><a href="${withBase(`posts/${post.slug}/`)}">${escapeHtml(post.title)}</a></h2>
      <div class="post-preview-meta">
        <time datetime="${post.isoDate}">${escapeHtml(post.formattedDate)}</time>
        ${tagList}
      </div>
      <p>${escapeHtml(post.excerpt)}</p>
      <div class="post-preview-links">
        <a class="button" href="${withBase(`posts/${post.slug}/`)}">Read article</a>
        <a class="button secondary" href="${withBase(`posts/${post.slug}.md`)}">Markdown</a>
        <a class="button secondary" href="${withBase(`posts/${post.slug}.json`)}">JSON</a>
      </div>
    </article>
  `;
}

function renderPagination(currentPage, totalPages) {
  if (totalPages <= 1) {
    return "";
  }

  const pageLinks = Array.from({ length: totalPages }, (_, index) => {
    const pageNumber = index + 1;
    const href = pageNumber === 1 ? withBase("") : withBase(`page/${pageNumber}/`);
    if (pageNumber === currentPage) {
      return `<span class="current">${pageNumber}</span>`;
    }
    return `<a href="${href}">${pageNumber}</a>`;
  }).join("");

  const prevLink = currentPage > 1
    ? `<a class="prev" href="${currentPage === 2 ? withBase("") : withBase(`page/${currentPage - 1}/`)}">Previous</a>`
    : "<span></span>";

  const nextLink = currentPage < totalPages
    ? `<a class="next" href="${withBase(`page/${currentPage + 1}/`)}">Next</a>`
    : "<span></span>";

  return `<nav class="pagination" aria-label="Pagination">${prevLink}<div class="pages">${pageLinks}</div>${nextLink}</nav>`;
}

function renderTaxonomyOverview(items, directory) {
  return `
    <ul class="taxonomy-list">
      ${items
        .map((item) => {
          const href = withBase(`${directory}/${item.slug}/`);
          return `<li><a href="${href}">${escapeHtml(item.name)}</a><span>${item.posts.length} post${item.posts.length === 1 ? "" : "s"}</span></li>`;
        })
        .join("\n")}
    </ul>
  `;
}

function renderTaxonomyPosts(posts) {
  if (!posts.length) {
    return "<p>No posts found.</p>";
  }

  return posts.map(renderPostPreview).join("\n");
}

function renderMetaGroup(label, items, directory) {
  if (!items.length) {
    return "";
  }

  const links = items
    .map((item) => `<a href="${withBase(`${directory}/${item.slug}/`)}">${escapeHtml(item.name)}</a>`)
    .join(", ");
  return `<span>${label}: ${links}</span>`;
}

function collectTaxonomy(posts, type) {
  const map = new Map();
  const key = type === "tag" ? "tagsDetailed" : "categoriesDetailed";

  posts.forEach((post) => {
    post[key].forEach((item) => {
      if (!map.has(item.slug)) {
        map.set(item.slug, { ...item, posts: [] });
      }
      map.get(item.slug).posts.push(post);
    });
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function renderLayout({ title, description, canonical, content, pageHeading }) {
  const hasSiteName = title ? title.includes(config.siteName) : false;
  const fullTitle = title ? (hasSiteName ? title : `${title} · ${config.siteName}`) : config.siteName;
  const metaDescription = description || config.siteDescription;
  const rssHref = withBase(config.feed?.path || "feed.xml");
  const homeHref = withBase("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(metaDescription)}" />
  ${canonical ? `<link rel="canonical" href="${canonical}" />` : ""}
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(config.siteName)} RSS Feed" href="${rssHref}" />
  <link rel="stylesheet" href="${withBase("assets/styles.css")}" />
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a class="site-title" href="${homeHref}">${escapeHtml(config.siteName)}</a>
      <nav class="site-nav" aria-label="Main navigation">
        <a href="${homeHref}">Home</a>
        <a href="${withBase("tags/")}">Tags</a>
        <a href="${withBase("categories/")}">Categories</a>
        <a href="${rssHref}">RSS</a>
      </nav>
    </div>
  </header>
  <main class="site-main">
    <div class="container">
      ${pageHeading ? `<h1 class="page-title">${escapeHtml(pageHeading)}</h1>` : ""}
      ${content}
    </div>
  </main>
  <footer class="site-footer">
    <div class="container">
      <p>&copy; ${new Date().getFullYear()} ${escapeHtml(config.siteName)}. Built with vanilla HTML, CSS, and JavaScript.</p>
    </div>
  </footer>
</body>
</html>`;
}

function normalizeBasePath(basePath) {
  if (!basePath || basePath === "/") {
    return "/";
  }

  let normalized = basePath.trim();
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }
  if (!normalized.endsWith("/")) {
    normalized = `${normalized}/`;
  }
  return normalized;
}

function withBase(relativePath = "") {
  if (!relativePath) {
    return BASE_PATH;
  }

  const trimmed = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
  if (BASE_PATH === "/") {
    return `/${trimmed}`.replace(/\/{2,}/g, "/");
  }

  return `${BASE_PATH}${trimmed}`.replace(/\/{2,}/g, "/");
}

function canonicalUrl(relativePath = "") {
  if (!SITE_URL) {
    return "";
  }

  const withBasePath = withBase(relativePath) || "/";
  const normalized = withBasePath.startsWith("/") ? withBasePath : `/${withBasePath}`;
  return new URL(normalized, SITE_URL).toString();
}

function ensureTrailingSlash(value) {
  if (!value) {
    return "";
  }
  return value.endsWith("/") ? value : `${value}/`;
}

function slugify(value) {
  return value
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeTaxonomy(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => item.toString().trim()).filter(Boolean);
  }

  return value
    .toString()
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

function createExcerpt(html, maxLength = 200) {
  const text = stripHtml(html).replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}…` : text;
}

function stripHtml(value) {
  return value.replace(/<[^>]*>/g, "");
}

function escapeHtml(value) {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeXml(value) {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function capitalize(value) {
  if (!value) {
    return "";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

buildSite();
