#!/usr/bin/env node

/**
 * WebIndexer MCP Server
 *
 * Exposes website analysis tools via the Model Context Protocol.
 * OpenCode can connect to this and ask:
 *   - "Inspect https://stripe.com"
 *   - "Crawl and index https://docs.example.com"
 *   - "What pages does this site have?"
 *   - "What tech stack does this use?"
 *
 * Usage: node mcp-server.mjs
 * Config: Add to opencode.json MCP servers:
 *   "webindexer": {
 *     "command": "node",
 *     "args": ["/Users/nakfaai/Developer/dev-tools/webindexer/mcp-server.mjs"]
 *   }
 */

import { inspect, crawl } from "./crawler.mjs";

// ─── State ──────────────────────────────────────────────────────────

const state = {
  indexedSites: new Map(), // origin -> { pages, sitemap, indexedAt }
};

// ─── MCP Protocol ───────────────────────────────────────────────────

const TOOLS = [
  {
    name: "inspect_url",
    description: "Analyze a single webpage: title, headings, navigation, forms, tech stack, design tokens, components, images, links. Returns a complete structured breakdown of the page.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The full URL to inspect (e.g. https://stripe.com)" },
      },
      required: ["url"],
    },
  },
  {
    name: "crawl_site",
    description: "Crawl and index an entire website. Discovers pages, builds a sitemap, detects tech stack, maps navigation and component structure. Results are cached for querying.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The starting URL to crawl from" },
        maxPages: { type: "number", default: 30, description: "Maximum pages to crawl (default: 30)" },
        maxDepth: { type: "number", default: 3, description: "Maximum link depth (default: 3)" },
      },
      required: ["url"],
    },
  },
  {
    name: "get_site_summary",
    description: "Get the cached sitemap summary for a previously crawled site. Shows pages discovered, tech stack, page count per depth, and component patterns across the site.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL that was crawled (origin matched)" },
      },
      required: ["url"],
    },
  },
  {
    name: "list_indexed_sites",
    description: "List all websites currently indexed in memory. Shows URL, page count, tech stack, and when it was indexed.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "search_pages",
    description: "Search within an indexed site for pages matching a query. Searches URL paths, page titles, and heading text.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The indexed site URL" },
        query: { type: "string", description: "Search term (matched against URL, title, headings)" },
      },
      required: ["url", "query"],
    },
  },
];

// ─── Tool Handlers ──────────────────────────────────────────────────

async function handleToolCall(name, args) {
  switch (name) {
    case "inspect_url":
      return await handleInspect(args);
    case "crawl_site":
      return await handleCrawl(args);
    case "get_site_summary":
      return await handleGetSummary(args);
    case "list_indexed_sites":
      return await handleListIndexed(args);
    case "search_pages":
      return await handleSearch(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function handleInspect({ url }) {
  console.error(`[webindexer] Inspecting: ${url}`);
  const analysis = await inspect(url);
  return {
    content: [
      {
        type: "text",
        text: formatInspectResult(analysis),
      },
    ],
  };
}

async function handleCrawl({ url, maxPages = 30, maxDepth = 3 }) {
  const origin = new URL(url).origin;
  console.error(`[webindexer] Crawling: ${url} (max: ${maxPages} pages, depth: ${maxDepth})`);

  const { pages, sitemap } = await crawl(url, { maxPages, maxDepth });

  state.indexedSites.set(origin, {
    pages: Object.fromEntries(pages),
    sitemap,
    indexedAt: new Date().toISOString(),
  });

  return {
    content: [
      {
        type: "text",
        text: formatCrawlResult(sitemap),
      },
    ],
  };
}

async function handleGetSummary({ url }) {
  const origin = new URL(url).origin;
  const site = state.indexedSites.get(origin);
  if (!site) {
    return {
      content: [{ type: "text", text: `Site not indexed. Use crawl_site first to index ${origin}` }],
    };
  }
  return {
    content: [{ type: "text", text: formatSiteSummary(origin, site) }],
  };
}

async function handleListIndexed() {
  if (state.indexedSites.size === 0) {
    return { content: [{ type: "text", text: "No sites indexed yet. Use crawl_site to index a website." }] };
  }
  const lines = ["## Indexed Websites\n"];
  for (const [origin, site] of state.indexedSites) {
    const pageCount = Object.keys(site.sitemap.pages).length;
    lines.push(`- **${origin}** — ${pageCount} pages, indexed ${new Date(site.indexedAt).toLocaleString()}`);
    if (site.sitemap.techStack?.length) {
      lines.push(`  Tech: ${site.sitemap.techStack.join(", ")}`);
    }
  }
  return { content: [{ type: "text", text: lines.join("\n") }] };
}

async function handleSearch({ url, query }) {
  const origin = new URL(url).origin;
  const site = state.indexedSites.get(origin);
  if (!site) {
    return { content: [{ type: "text", text: `Site not indexed. Use crawl_site first to index ${origin}` }] };
  }

  const q = query.toLowerCase();
  const results = [];

  for (const [pageUrl, page] of Object.entries(site.pages)) {
    const title = (page.metadata?.title || page.title || "").toLowerCase();
    const headings = (page.headings || []).map((h) => h.text.toLowerCase()).join(" ");
    const urlLc = pageUrl.toLowerCase();

    if (urlLc.includes(q) || title.includes(q) || headings.includes(q)) {
      results.push({ url: pageUrl, title: page.metadata?.title || page.title, depth: page.depth });
    }
  }

  if (results.length === 0) {
    return { content: [{ type: "text", text: `No pages matching "${query}" in ${origin}` }] };
  }

  const lines = [`## Search results for "${query}" in ${origin}\n`];
  for (const r of results) {
    lines.push(`- ${r.title || "(no title)"}`);
    lines.push(`  ${r.url} (depth: ${r.depth})`);
  }
  lines.push(`\n_Found ${results.length} pages_`);

  return { content: [{ type: "text", text: lines.join("\n") }] };
}

// ─── Formatting ─────────────────────────────────────────────────────

function formatInspectResult(analysis) {
  const m = analysis.metadata || {};
  const lines = [];

  lines.push(`# ${m.title || "Untitled Page"}`);
  lines.push(`URL: ${analysis.url}`);
  if (m.description) lines.push(`Description: ${m.description}`);
  lines.push("");

  // Tech stack
  if (analysis.techStack?.length) {
    lines.push(`**Tech Stack:** ${analysis.techStack.join(", ")}`);
  }

  // Navigation
  if (analysis.nav?.length) {
    const totalItems = analysis.nav.reduce((s, n) => s + n.itemCount, 0);
    lines.push(`**Navigation:** ${analysis.nav.length} nav elements, ${totalItems} items`);
    analysis.nav.slice(0, 2).forEach((nav) => {
      nav.items.slice(0, 8).forEach((item) => {
        if (item.text) lines.push(`  → ${item.text}`);
      });
    });
    if (totalItems > 8) lines.push(`  … and ${totalItems - 8} more`);
  }

  // Headings (structure outline)
  if (analysis.headings?.length) {
    lines.push(`\n**Page Structure:**`);
    analysis.headings.slice(0, 25).forEach((h) => {
      const indent = "  ".repeat(h.level - 1);
      lines.push(`${indent}h${h.level}: ${h.text.slice(0, 100)}`);
    });
    if (analysis.headings.length > 25) lines.push(`  … and ${analysis.headings.length - 25} more headings`);
  }

  // Forms
  if (analysis.forms?.length) {
    lines.push(`\n**Forms:** ${analysis.forms.length}`);
    analysis.forms.forEach((f) => {
      lines.push(`  Method: ${f.method}, Action: ${f.action || "(same page)"}, Inputs: ${f.inputCount}`);
      f.inputs.slice(0, 5).forEach((inp) => {
        lines.push(`    ${inp.type}${inp.name ? " name=" + inp.name : ""}${inp.placeholder ? ' "' + inp.placeholder + '"' : ""}`);
      });
    });
  }

  // Components
  if (analysis.components && Object.keys(analysis.components).length) {
    lines.push(`\n**UI Components:**`);
    for (const [name, info] of Object.entries(analysis.components)) {
      lines.push(`  ${name} ×${info.count}`);
    }
  }

  // Design tokens
  const dt = analysis.designTokens || {};
  if (dt.fontFamilies?.length) {
    lines.push(`\n**Fonts:** ${dt.fontFamilies.join(" | ")}`);
  }
  if (dt.colorPalette?.length) {
    lines.push(`**Colors:** ${dt.colorPalette.slice(0, 8).join(", ")}${dt.colorPalette.length > 8 ? "…" : ""}`);
  }
  if (dt.cssVariables && Object.keys(dt.cssVariables).length) {
    lines.push(`**CSS Variables:** ${Object.keys(dt.cssVariables).length} custom properties`);
  }

  // Links
  const intLinks = analysis.links?.internal?.length || 0;
  const extLinks = analysis.links?.external?.length || 0;
  lines.push(`\n**Links:** ${intLinks} internal, ${extLinks} external`);

  // Performance
  const perf = analysis.performance || {};
  if (perf.loadComplete) {
    lines.push(`**Load:** ${perf.loadComplete}ms (DOM interactive: ${perf.domInteractive || "?"}ms)`);
  }

  return lines.join("\n");
}

function formatCrawlResult(sitemap) {
  const lines = [];
  lines.push(`# Crawl Report: ${sitemap.startUrl}`);
  lines.push(`Pages crawled: ${sitemap.totalCrawled} | Total discovered: ${sitemap.totalFound}`);
  if (sitemap.techStack?.length) {
    lines.push(`Tech stack: ${sitemap.techStack.join(", ")}`);
  }
  lines.push("");

  // Pages grouped by depth
  const byDepth = {};
  for (const [url, info] of Object.entries(sitemap.pages)) {
    const d = info.depth || 0;
    if (!byDepth[d]) byDepth[d] = [];
    byDepth[d].push({ url, ...info });
  }

  for (const depth of Object.keys(byDepth).sort((a, b) => a - b)) {
    const pages = byDepth[depth];
    lines.push(`### Depth ${depth} (${pages.length} pages)`);
    pages.slice(0, 10).forEach((p) => {
      lines.push(`- ${p.title || "(no title)"}`);
      lines.push(`  ${p.url}`);
    });
    if (pages.length > 10) lines.push(`  … and ${pages.length - 10} more`);
    lines.push("");
  }

  lines.push(`**To query this site, use:**`);
  lines.push(`- \`get_site_summary\` with url "${sitemap.startUrl}"`);
  lines.push(`- \`search_pages\` to search for specific pages`);

  return lines.join("\n");
}

function formatSiteSummary(origin, site) {
  const sitemap = site.sitemap;
  const lines = [];
  lines.push(`# ${origin}`);
  lines.push(`Indexed: ${new Date(site.indexedAt).toLocaleString()}`);
  lines.push(`Pages: ${sitemap.totalCrawled}`);
  if (sitemap.techStack?.length) lines.push(`Tech: ${sitemap.techStack.join(", ")}`);
  lines.push("");

  // Collect component patterns across all pages
  const allComponents = {};
  for (const page of Object.values(site.pages)) {
    const pageData = site.pages[page.url] || page;
    // Reorganize - site.pages has summary, pages Map has full data
  }

  // Aggregate component counts from the full pages data
  const componentAgg = {};
  const pageEntries = Object.entries(site.pages);
  for (const [, pageInfo] of pageEntries) {
    const comps = pageInfo.componentTypes || [];
    comps.forEach((c) => {
      componentAgg[c] = (componentAgg[c] || 0) + 1;
    });
  }

  if (Object.keys(componentAgg).length) {
    lines.push("### Components Used Across Site");
    for (const [name, count] of Object.entries(componentAgg).sort((a, b) => b[1] - a[1])) {
      lines.push(`- ${name} (on ${count} pages)`);
    }
    lines.push("");
  }

  lines.push("### Page Index");
  for (const [url, info] of pageEntries.slice(0, 30)) {
    lines.push(`- ${info.title || "(no title)"}`);
    lines.push(`  ${url}`);
  }
  if (pageEntries.length > 30) {
    lines.push(`  … and ${pageEntries.length - 30} more pages`);
  }

  return lines.join("\n");
}

// ─── MCP Server Loop ───────────────────────────────────────────────

async function main() {
  process.stdin.setEncoding("utf-8");
  let buffer = "";

  console.error("[webindexer] MCP server ready on stdin/stdout");

  process.stdin.on("data", async (chunk) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // keep incomplete line

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        await handleMessage(msg);
      } catch (err) {
        console.error(`[webindexer] Parse error: ${err.message}`);
      }
    }
  });

  process.stdin.on("end", () => {
    process.exit(0);
  });
}

async function handleMessage(msg) {
  const { id, method, params } = msg;

  try {
    switch (method) {
      case "initialize":
        reply(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "webindexer", version: "0.1.0" },
        });
        break;

      case "ping":
        reply(id, {});
        break;

      case "notifications/initialized":
        // Nothing to do
        break;

      case "tools/list":
        reply(id, { tools: TOOLS });
        break;

      case "tools/call":
        const result = await handleToolCall(params.name, params.arguments || {});
        reply(id, result);
        break;

      default:
        reply(id, null);
    }
  } catch (err) {
    replyError(id, -32000, err.message);
  }
}

function reply(id, result) {
  const msg = JSON.stringify({ jsonrpc: "2.0", id, result });
  process.stdout.write(msg + "\n");
}

function replyError(id, code, message) {
  const msg = JSON.stringify({
    jsonrpc: "2.0",
    id,
    error: { code, message },
  });
  process.stdout.write(msg + "\n");
}

main();
