#!/usr/bin/env node

/**
 * WebIndexer — Website Knowledge Graph
 *
 * CLI:  node index.mjs crawl https://example.com
 *       node index.mjs inspect https://example.com
 *
 * Crawls a website, builds a structured knowledge graph,
 * and outputs a JSON report that AI agents can understand.
 */

import { crawl, inspect } from "./crawler.mjs";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

function help() {
  console.log(`
  WebIndexer — Website Knowledge Graph

  Usage:
    node index.mjs inspect <url>             Analyze a single page
    node index.mjs crawl <url> [options]     Crawl and index entire site
    node index.mjs help                      Show this help

  Crawl Options:
    --max-pages <n>     Max pages to crawl (default: 30)
    --max-depth <n>     Max link depth (default: 3)
    --concurrency <n>   Parallel pages (default: 3)
    --output <path>     Output JSON file (default: stdout)
    --pretty            Pretty-print output
    --screenshots       Capture page screenshots (to /tmp/webindexer/)
    --verbose           Show progress

  Examples:
    node index.mjs inspect https://stripe.com
    node index.mjs crawl https://example.com --max-pages 50 --output site.json
  `);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "help" || args[0] === "--help") {
    help();
    process.exit(0);
  }

  const command = args[0];
  const url = args[1];

  if (!url || !url.startsWith("http")) {
    console.error("❌ Provide a valid URL starting with http:// or https://");
    help();
    process.exit(1);
  }

  // Parse options
  const opts = {
    maxPages: parseInt(getOpt(args, "--max-pages") || "30", 10),
    maxDepth: parseInt(getOpt(args, "--max-depth") || "3", 10),
    concurrency: parseInt(getOpt(args, "--concurrency") || "3", 10),
    screenshots: args.includes("--screenshots"),
    verbose: args.includes("--verbose"),
    onProgress: (done, total) => {
      if (args.includes("--verbose")) {
        process.stderr.write(`\r📡 Crawled ${done} pages (${total} discovered)`);
      }
    },
  };

  const outputPath = getOpt(args, "--output");
  const pretty = args.includes("--pretty");

  try {
    let result;

    if (command === "inspect") {
      console.error(`🔍 Inspecting: ${url}`);
      result = await inspect(url);
      console.error(`✅ ${result.metadata?.title || url}`);
    } else if (command === "crawl") {
      console.error(`🕷️  Crawling: ${url}`);
      console.error(`   max-pages: ${opts.maxPages}, max-depth: ${opts.maxDepth}, concurrency: ${opts.concurrency}`);
      const { pages, sitemap } = await crawl(url, opts);

      if (opts.verbose) process.stderr.write("\n");

      console.error(`\n✅ Crawled ${sitemap.totalCrawled} pages`);
      console.error(`   Tech stack: ${sitemap.techStack.join(", ") || "unknown"}`);

      // Build results object
      result = {
        crawled: new Date().toISOString(),
        sitemap,
        siteGraph: sitemap.pageGraph,
        pages: {},
      };

      for (const [pageUrl, analysis] of pages) {
        // Strip verbose fields for cleaner output
        const { links, forms, images, scripts, ...summary } = analysis;
        result.pages[pageUrl] = {
          ...summary,
          linkCount: links?.internal?.length || 0,
          formCount: forms?.length || 0,
          imageCount: images?.length || 0,
        };
      }
    } else {
      console.error(`❌ Unknown command: ${command}`);
      help();
      process.exit(1);
    }

    const output = pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result);

    if (outputPath) {
      writeFileSync(resolve(outputPath), output, "utf-8");
      console.error(`📄 Written to: ${outputPath}`);
    } else {
      console.log(output);
    }
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    if (opts.verbose) console.error(err);
    process.exit(1);
  }
}

function getOpt(args, name) {
  const idx = args.indexOf(name);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return null;
}

main();
