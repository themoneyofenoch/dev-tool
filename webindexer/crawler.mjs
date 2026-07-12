/**
 * WebIndexer — Crawler Engine
 *
 * BFS crawler that discovers all pages of a website using Playwright.
 * SPA-aware: uses URL changes and MutationObserver to detect client-side routes.
 */

import { chromium } from "playwright";

/**
 * Crawl a website starting from a URL.
 * @param {string} startUrl - The URL to start from
 * @param {Object} [opts]
 * @param {number} [opts.maxPages=30] - Maximum pages to crawl
 * @param {number} [opts.maxDepth=3] - Maximum link depth
 * @param {number} [opts.concurrency=3] - Parallel pages
 * @param {number} [opts.timeout=15000] - Page load timeout in ms
 * @param {boolean} [opts.headless=true] - Run headless
 * @param {boolean} [opts.screenshots=false] - Capture screenshots
 * @param {function} [opts.onProgress] - Progress callback (pagesCrawled, total)
 * @returns {Promise<Object>} { pages: Map<url, analysis>, sitemap: Object }
 */
export async function crawl(startUrl, opts = {}) {
  const {
    maxPages = 30,
    maxDepth = 3,
    concurrency = 3,
    timeout = 15000,
    headless = true,
    screenshots = false,
    onProgress = null,
  } = opts;

  const base = new URL(startUrl);
  const visited = new Map(); // url -> analysis result
  const queue = [{ url: startUrl, depth: 0, referrer: null }];
  const inQueue = new Set([startUrl]);

  const browser = await chromium.launch({
    headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
  });

  // Block unnecessary resources for speed
  await ctx.route("**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf,ico}", (route) => route.abort());

  const sitemap = {
    startUrl,
    baseHost: base.hostname,
    totalCrawled: 0,
    totalFound: 0,
    pages: {},
    pageGraph: {}, // url -> [linked urls]
    techStack: new Set(),
  };

  async function processPage({ url: pageUrl, depth, referrer }) {
    const page = await ctx.newPage();
    const result = {
      url: pageUrl,
      depth,
      referrer,
      analyzedAt: null,
      title: null,
      status: "pending",
      error: null,
      metadata: {},
      headings: [],
      nav: [],
      links: { internal: [], external: [] },
      forms: [],
      techStack: [],
      designTokens: {},
      components: {},
      images: [],
    };

    try {
      const response = await page.goto(pageUrl, {
        waitUntil: "domcontentloaded",
        timeout,
      });

      if (!response) {
        result.status = "error";
        result.error = "No response";
        return result;
      }

      result.status = response.ok() ? "ok" : `http_${response.status()}`;

      // Wait for page to settle
      await page.waitForTimeout(1500);

      // Wait for network idle if possible
      try {
        await page.waitForLoadState("networkidle", { timeout: 5000 });
      } catch { /* timeout is fine */ }

      // Extract analysis
      await doAnalysis(page, result);

      // Screenshot
      if (screenshots) {
        const filename = pageUrl.replace(/[^a-z0-9]/gi, "_").slice(0, 100) + ".png";
        await page.screenshot({ path: `/tmp/webindexer/${filename}`, fullPage: true });
      }
    } catch (err) {
      result.status = "error";
      result.error = err.message;
    } finally {
      await page.close();
    }

    return result;
  }

  // BFS crawl loop
  let pagesCrawled = 0;

  while (queue.length > 0 && visited.size < maxPages) {
    const batch = queue.splice(0, Math.min(concurrency, maxPages - visited.size));

    const results = await Promise.all(
      batch.map((item) => processPage(item))
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const originalItem = batch[i];

      if (!result) continue;

      visited.set(originalItem.url, result);
      pagesCrawled++;

      // Collect tech stack
      if (result.techStack) {
        result.techStack.forEach((t) => sitemap.techStack.add(t));
      }

      // Build page graph edges
      sitemap.pageGraph[originalItem.url] = (result.links?.internal || []).map((l) => l.href);

      if (onProgress) onProgress(pagesCrawled, Math.max(pagesCrawled, queue.length + visited.size));

      // Discover new pages from internal links
      if (originalItem.depth < maxDepth) {
        const internalLinks = result.links?.internal || [];
        for (const link of internalLinks) {
          try {
            const linkUrl = link.href.split("#")[0].split("?")[0]; // strip hash and query for dedup
            const linkUrlFull = link.href;
            if (
              !visited.has(linkUrlFull) &&
              !inQueue.has(linkUrlFull) &&
              linkUrlFull.startsWith(base.origin) &&
              !linkUrlFull.includes("://") === false // skip protocol-less
            ) {
              inQueue.add(linkUrlFull);
              queue.push({ url: linkUrlFull, depth: originalItem.depth + 1, referrer: originalItem.url });
            }
          } catch { /* skip invalid */ }
        }
      }
    }
  }

  await browser.close();

  // Build final sitemap
  sitemap.totalCrawled = visited.size;
  sitemap.totalFound = visited.size + queue.length;
  sitemap.techStack = [...sitemap.techStack];

  for (const [url, analysis] of visited) {
    sitemap.pages[url] = {
      title: analysis.metadata?.title || analysis.title,
      depth: analysis.depth,
      status: analysis.status,
      headingCount: analysis.headings?.length || 0,
      linkCount: analysis.links?.internal?.length || 0,
      formCount: analysis.forms?.length || 0,
      componentTypes: analysis.components ? Object.keys(analysis.components) : [],
      techStack: analysis.techStack || [],
      error: analysis.error,
    };
  }

  return { pages: visited, sitemap };
}

/**
 * Run the page analysis (imported from analyzer) within a browser context.
 * We evaluate the page from the Node side using Playwright APIs.
 */
async function doAnalysis(page, result) {
  const { analyzePage } = await import("./analyzer.mjs");
  const analysis = await analyzePage(page, page.url());
  Object.assign(result, analysis);
}

/**
 * Quick single-page inspect (no crawling).
 * Returns full analysis of one page.
 */
export async function inspect(url, opts = {}) {
  const { headless = true, timeout = 15000 } = opts;

  const browser = await chromium.launch({ headless, args: ["--no-sandbox"] });
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
  });

  const page = await ctx.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout });
    await page.waitForTimeout(1500);
    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch { /* ok */ }

    const { analyzePage } = await import("./analyzer.mjs");
    const analysis = await analyzePage(page, url);
    return analysis;
  } finally {
    await page.close();
    await browser.close();
  }
}
