/**
 * WebIndexer — Page Analyzer
 *
 * Given a Playwright page, extracts structured information:
 * metadata, navigation, forms, tech stack, design tokens, components, etc.
 */

// ─── Tech stack signatures ──────────────────────────────────────────

const TECH_DETECTORS = [
  // Meta frameworks
  { name: "Next.js", detect: (ctx) => ctx.hasReact && ctx.has("__NEXT_DATA__") },
  { name: "Nuxt", detect: (ctx) => ctx.hasVue && ctx.has("__NUXT__") },
  { name: "Gatsby", detect: (ctx) => ctx.hasReact && ctx.has("___GATSBY") },
  { name: "Remix", detect: (ctx) => ctx.has("__remixContext") },
  { name: "SvelteKit", detect: (ctx) => ctx.has("__sveltekit") },
  { name: "Astro", detect: (ctx) => ctx.hasReact && ctx.has("__astro") },
  { name: "11ty/ Eleventy", detect: (ctx) => ctx.scripts.some((s) => s.includes("11ty") || s.includes("eleventy")) },

  // Core frameworks
  { name: "React", detect: (ctx) => ctx.hasReact || ctx.hasDataReactroot || ctx.getAttrCount("*", "data-reactroot") > 0 },
  { name: "Vue.js", detect: (ctx) => ctx.hasVue || ctx.getAttrCount("*", "data-v-") > 0 },
  { name: "Angular", detect: (ctx) => ctx.getAttrCount("*", "ng-") > 0 || ctx.selectors.some((s) => s.startsWith("app-")) },
  { name: "Svelte", detect: (ctx) => ctx.has("__svelte") },
  { name: "jQuery", detect: (ctx) => ctx.has("jQuery") || ctx.has("$") },

  // CSS frameworks
  { name: "Tailwind CSS", detect: (ctx) => ctx.classes.some((c) => /^(m|p|flex|grid|text-|bg-|border-)[a-z]/.test(c)) > 10 },
  { name: "Bootstrap", detect: (ctx) => ctx.classes.some((c) => ["container", "row", "col-", "btn", "navbar"].some((b) => c.startsWith(b))) > 5 },
  { name: "shadcn/ui", detect: (ctx) => ctx.classes.filter((c) => /^(bg-|text-|border-)(primary|secondary|destructive|muted|accent|popover|card)/.test(c)).length > 8 },

  // CMS
  { name: "WordPress", detect: (ctx) => ctx.classes.some((c) => c.startsWith("wp-")) || ctx.selectors.some((s) => s.includes("wp-content")) },
  { name: "Shopify", detect: (ctx) => ctx.has("Shopify") || ctx.scripts.some((s) => s.includes("shopify")) },

  // Analytics / Third-party
  { name: "Google Analytics (GA4)", detect: (ctx) => ctx.scripts.some((s) => s.includes("gtag") || s.includes("G-")) },
  { name: "Google Analytics (UA)", detect: (ctx) => ctx.scripts.some((s) => s.includes("analytics.js") || s.includes("ga.js")) },
  { name: "Meta Pixel", detect: (ctx) => ctx.scripts.some((s) => s.includes("fbq")) },
  { name: "Cloudflare", detect: (ctx) => ctx.headers?.get?.("cf-ray") },
  { name: "Vercel", detect: (ctx) => ctx.headers?.get?.("x-vercel-id") },
  { name: "Netlify", detect: (ctx) => ctx.headers?.get?.("x-nf-request-id") },
  { name: "Intercom", detect: (ctx) => ctx.scripts.some((s) => s.includes("intercom")) },
  { name: "Hotjar", detect: (ctx) => ctx.scripts.some((s) => s.includes("hotjar")) },
  { name: "Segment", detect: (ctx) => ctx.scripts.some((s) => s.includes("segment")) },
  { name: "Amplitude", detect: (ctx) => ctx.scripts.some((s) => s.includes("amplitude")) },
  { name: "Stripe", detect: (ctx) => ctx.scripts.some((s) => s.includes("stripe")) },
  { name: "Algolia", detect: (ctx) => ctx.scripts.some((s) => s.includes("algolia")) },

  // Hosting / Platforms
  { name: "Zendesk", detect: (ctx) => ctx.has("zE") || ctx.classes.some((c) => c.startsWith("hc-") || c.startsWith("zd-")) || ctx.scripts.some((s) => s.includes("zendesk")) },
  { name: "Shopify", detect: (ctx) => ctx.has("Shopify") || ctx.selectors.some((s) => s.startsWith("shopify-")) || ctx.scripts.some((s) => s.includes("shopify") || s.includes("myshopify")) },
  { name: "Squarespace", detect: (ctx) => ctx.has("Squarespace") || ctx.selectors.some((s) => s.startsWith("sqs-")) },
  { name: "Webflow", detect: (ctx) => ctx.selectors.some((s) => s.includes("w-webflow-badge")) || ctx.scripts.some((s) => s.includes("webflow")) },
  { name: "Wix", detect: (ctx) => ctx.has("Wix") || ctx.selectors.some((s) => s.startsWith("wix-")) },

  // Build tools
  { name: "Vite", detect: (ctx) => ctx.scripts.some((s) => s.includes("/@vite/") || s.includes("vite")) },
  { name: "Webpack", detect: (ctx) => ctx.scripts.some((s) => s.includes("webpack")) },
];

// ─── Component pattern heuristics ───────────────────────────────────

const COMPONENT_PATTERNS = [
  { name: "Navigation / Menu", selectors: ["nav", "[role=navigation]", ".nav", ".navbar", "header nav", ".menu"] },
  { name: "Hero / Banner", selectors: ["[class*=hero]", "[class*=banner]", "section:first-of-type h1"] },
  { name: "Card", selectors: ["[class*=card]", "[class*=\"card-\"]", "[class*=tile]"] },
  { name: "Modal / Dialog", selectors: ["[role=dialog]", "[class*=modal]", "[class*=overlay]", "dialog"] },
  { name: "Form", selectors: ["form"] },
  { name: "Table / Data Grid", selectors: ["table", "[role=grid]", "[role=table]"] },
  { name: "Tabs", selectors: ["[role=tablist]", "[class*=tab]", "[class*=tabs]"] },
  { name: "Accordion", selectors: ["[class*=accordion]", "[class*=accordian]", "details"] },
  { name: "Carousel / Slider", selectors: ["[class*=carousel]", "[class*=slider]", "[class*=slick]"] },
  { name: "Footer", selectors: ["footer", "[role=contentinfo]"] },
  { name: "Sidebar", selectors: ["[class*=sidebar]", "[class*=side-bar]", "aside"] },
  { name: "Pricing Table", selectors: ["[class*=pricing]", "[class*=price]"] },
  { name: "Testimonials", selectors: ["[class*=testimonial]", "[class*=review]", "[class*=quote]"] },
  { name: "FAQ Section", selectors: ["[class*=faq]", "[class*=faq-section]", "[class*=faq-list]"] },
  { name: "Search", selectors: ["[role=search]", "[class*=search]", "input[type=search]"] },
  { name: "Breadcrumbs", selectors: ["[class*=breadcrumb]", "[aria-label*=breadcrumb]", "nav[aria-label*=breadcrumb]"] },
  { name: "Pagination", selectors: ["[class*=pagination]", "nav[aria-label=pagination]", "[aria-label*=pagination]"] },
  { name: "Tooltip / Popover", selectors: ["[role=tooltip]", "[class*=tooltip]", "[class*=popover]"] },
  { name: "Avatar / Profile", selectors: ["[class*=avatar]", "[class*=profile-pic]", "[class*=user-avatar]"] },
  { name: "Social Proof", selectors: ["[class*=social-proof]", "[class*=social]"] },
];

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Analyze a single page and extract structured information.
 * @param {import('playwright').Page} page
 * @param {string} url
 * @returns {Promise<Object>} Page analysis result
 */
export async function analyzePage(page, url) {
  const result = {
    url,
    analyzedAt: new Date().toISOString(),
    metadata: {},
    headings: [],
    nav: [],
    links: { internal: [], external: [] },
    forms: [],
    techStack: [],
    designTokens: {},
    components: {},
    images: [],
    scripts: [],
    cookies: [],
    cookieCategories: {},
    performance: {},
    redirects: [],
    finalUrl: page.url(),
    status: "ok",
    error: null,
  };

  try {
    await safeExtract(extractMetadata, page, result);
    await safeExtract(extractHeadings, page, result);
    await safeExtract(extractNavigation, page, result);
    await safeExtract(extractLinks, page, page.url(), result);
    await safeExtract(extractForms, page, result);
    await safeExtract(extractTechStack, page, result);
    await safeExtract(extractDesignTokens, page, result);
    await safeExtract(extractCookies, page, result);
    await safeExtract(extractComponents, page, result);
    await safeExtract(extractImages, page, result);
    await safeExtract(extractScripts, page, result);
    await safeExtract(extractPerformance, page, result);
  } catch (err) {
    result.status = "partial";
    result.error = err.message;
  }

  return result;
}

async function safeExtract(fn, page, ...args) {
  try {
    await fn(page, ...args);
  } catch (err) {
    // Ignore individual extractor failures
  }
}

// ─── Extractors ─────────────────────────────────────────────────────

async function extractMetadata(page, result) {
  result.metadata = await page.evaluate(() => {
    const m = { title: "", description: "", lang: "", charset: "", viewport: "", canonical: "", favicon: "", og: {}, twitter: {}, robots: "" };

    m.title = document.title;
    m.lang = document.documentElement.lang || "";
    m.charset = document.characterSet;
    m.robots = document.querySelector("meta[name=robots]")?.content || "";

    const metaDesc = document.querySelector("meta[name=description]");
    if (metaDesc) m.description = metaDesc.content;

    const canonical = document.querySelector("link[rel=canonical]");
    if (canonical) m.canonical = canonical.href;

    const favicon = document.querySelector("link[rel=icon], link[rel='shortcut icon'], link[rel='apple-touch-icon']");
    if (favicon) m.favicon = favicon.href;

    const viewport = document.querySelector("meta[name=viewport]");
    if (viewport) m.viewport = viewport.content;

    // OG tags
    document.querySelectorAll("meta[property^='og:']").forEach((el) => {
      m.og[el.getAttribute("property")?.slice(3)] = el.content;
    });

    // Twitter card
    document.querySelectorAll("meta[name^='twitter:']").forEach((el) => {
      m.twitter[el.getAttribute("name")?.slice(8)] = el.content;
    });

    return m;
  });
}

async function extractHeadings(page, result) {
  result.headings = await page.evaluate(() => {
    const hTags = ["h1", "h2", "h3", "h4", "h5", "h6"];
    const headings = [];
    hTags.forEach((tag) => {
      document.querySelectorAll(tag).forEach((el) => {
        headings.push({ level: parseInt(tag[1]), text: el.textContent.trim(), id: el.id || null });
      });
    });
    // Sort by DOM position
    const all = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")];
    headings.sort((a, b) => {
      const elA = all.find((el) => el.textContent.trim() === a.text && el.tagName.toLowerCase() === `h${a.level}`);
      const elB = all.find((el) => el.textContent.trim() === b.text && el.tagName.toLowerCase() === `h${b.level}`);
      return all.indexOf(elA) - all.indexOf(elB);
    });
    return headings;
  });
}

async function extractNavigation(page, result) {
  result.nav = await page.evaluate(() => {
    const navs = [];
    document.querySelectorAll("nav, [role=navigation], header .menu, header ul.nav").forEach((nav, i) => {
      const items = [];
      nav.querySelectorAll("a").forEach((a) => {
        items.push({ text: a.textContent.trim(), href: a.href, ariaLabel: a.getAttribute("aria-label") || null });
      });
      if (items.length > 0) {
        navs.push({
          index: i,
          label: nav.getAttribute("aria-label") || nav.getAttribute("aria-labelledby") || null,
          itemCount: items.length,
          items,
        });
      }
    });
    return navs;
  });
}

async function extractLinks(page, baseUrl, result) {
  const base = new URL(baseUrl);
  const links = await page.evaluate(() => {
    return [...document.querySelectorAll("a[href]")].map((a) => ({
      text: a.textContent.trim().slice(0, 200),
      href: a.href,
      rel: a.rel || null,
      target: a.target || null,
      ariaLabel: a.getAttribute("aria-label") || null,
    }));
  });

  for (const link of links) {
    try {
      const u = new URL(link.href);
      if (u.hostname === base.hostname) {
        result.links.internal.push(link);
      } else if (u.protocol.startsWith("http")) {
        result.links.external.push(link);
      }
    } catch {
      // invalid URL, skip
    }
  }
}

async function extractForms(page, result) {
  result.forms = await page.evaluate(() => {
    return [...document.querySelectorAll("form")].map((f, i) => {
      const inputs = [...f.querySelectorAll("input, select, textarea")].map((inp) => ({
        type: inp.type || inp.tagName.toLowerCase(),
        name: inp.name || inp.id || null,
        placeholder: inp.placeholder || null,
        required: inp.required || false,
        autocomplete: inp.autocomplete || null,
      }));
      const buttons = [...f.querySelectorAll("button, input[type=submit], input[type=button]")].map((b) => ({
        text: b.textContent.trim() || b.value || "",
        type: b.type || "button",
      }));
      return {
        index: i,
        action: f.action || null,
        method: (f.method || "get").toUpperCase(),
        inputCount: inputs.length,
        inputs,
        buttonCount: buttons.length,
        buttons,
      };
    });
  });
}

async function extractTechStack(page, result) {
  const ctx = await page.evaluate(() => {
    const allElements = [...document.querySelectorAll("*")];
    const allClasses = allElements.flatMap((el) => [...el.classList]).filter(Boolean);
    const allSelectors = allElements.map((el) => el.tagName.toLowerCase());
    const scripts = [...document.querySelectorAll("script[src]")].map((s) => s.src);
    const inlineScripts = [...document.querySelectorAll("script:not([src])")].map((s) => s.textContent.slice(0, 500));

    return {
      hasReact: typeof React !== "undefined",
      hasVue: typeof Vue !== "undefined",
      hasDataReactroot: !!(document.getElementById("__next") || document.querySelector("[data-reactroot]")),
      has: (key) => typeof window[key] !== "undefined",
      getAttrCount: (sel, attr) => document.querySelectorAll(sel).length,
      classes: allClasses,
      selectors: allSelectors,
      scripts: [...scripts, ...inlineScripts],
    };
  });

  // Also grab response headers
  try {
    const resp = await page.goto(page.url(), { waitUntil: "commit", timeout: 3000 });
    if (resp) {
      ctx.headers = resp.headers();
    }
  } catch { /* ignore */ }

  const detected = TECH_DETECTORS.filter((d) => {
    try {
      return d.detect(ctx);
    } catch {
      return false;
    }
  }).map((d) => d.name);

  result.techStack = detected;
}

async function extractDesignTokens(page, result) {
  result.designTokens = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    const colors = new Set();
    const fonts = new Set();
    const spacing = new Set();

    // CSS custom properties
    const cssVars = {};
    for (let i = 0; i < document.styleSheets.length; i++) {
      try {
        const sheet = document.styleSheets[i];
        for (const rule of sheet.cssRules || []) {
          if (rule.selectorText === ":root" || rule.selectorText === "html") {
            for (const prop of rule.style) {
              if (prop.startsWith("--")) {
                cssVars[prop] = rule.style.getPropertyValue(prop).trim();
              }
            }
          }
        }
      } catch { /* CORS restrictions */ }
    }

    // Common color properties
    const colorProps = ["color", "background-color", "border-color", "background"];
    const sample = 200; // sample some elements
    [...document.querySelectorAll("*")].slice(0, sample).forEach((el) => {
      const cs = getComputedStyle(el);
      colorProps.forEach((p) => {
        const v = cs[p];
        if (v && v !== "rgba(0, 0, 0, 0)" && v !== "transparent") {
          colors.add(v);
        }
      });
      const f = cs.fontFamily;
      if (f && !f.includes("system-ui")) fonts.add(f);
    });

    return {
      cssVariables: cssVars,
      colorPalette: [...colors].slice(0, 30),
      fontFamilies: [...fonts].slice(0, 10),
      primaryFont: styles.fontFamily,
    };
  });
}

async function extractComponents(page, result) {
  result.components = await page.evaluate(() => {
    const found = {};
    const patterns = [
      { name: "Navigation / Menu", selectors: ["nav", "[role=navigation]", ".nav", "header nav"] },
      { name: "Hero / Banner", selectors: ["[class*=hero]", "[class*=banner]"] },
      { name: "Card", selectors: ["[class*=card]", "[class*=tile]"] },
      { name: "Modal / Dialog", selectors: ["[role=dialog]", "dialog", "[class*=modal]"] },
      { name: "Form", selectors: ["form"] },
      { name: "Table / Data Grid", selectors: ["table", "[role=grid]"] },
      { name: "Tabs", selectors: ["[role=tablist]", "[class*=tab]"] },
      { name: "Footer", selectors: ["footer", "[role=contentinfo]"] },
      { name: "Sidebar", selectors: ["aside", "[class*=sidebar]"] },
      { name: "Search", selectors: ["[role=search]", "input[type=search]"] },
      { name: "Breadcrumbs", selectors: ["[class*=breadcrumb]", "nav[aria-label*=breadcrumb]"] },
      { name: "Pagination", selectors: ["[class*=pagination]", "[aria-label*=pagination]"] },
      { name: "Pricing Table", selectors: ["[class*=pricing]"] },
      { name: "Testimonials", selectors: ["[class*=testimonial]"] },
      { name: "FAQ Section", selectors: ["[class*=faq]"] },
      { name: "Carousel / Slider", selectors: ["[class*=carousel]", "[class*=slider]", "[class*=slick]"] },
      { name: "Accordion", selectors: ["details", "[class*=accordion]"] },
    ];

    patterns.forEach(({ name, selectors }) => {
      const combined = selectors.join(",");
      const elements = document.querySelectorAll(combined);
      let count = 0;
      const seen = new Set();
      elements.forEach((el) => {
        // Deduplicate nested matches
        const key = el.tagName + (el.id ? "#" + el.id : "") + (el.className ? "." + el.className : "");
        if (!seen.has(key)) {
          seen.add(key);
          count++;
        }
      });
      if (count > 0) {
        found[name] = { count, selector: selectors[0] };
      }
    });

    return found;
  });
}

async function extractImages(page, result) {
  result.images = await page.evaluate(() => {
    return [...document.querySelectorAll("img[src]")]
      .map((img) => ({
        src: img.src,
        alt: img.alt || null,
        width: img.naturalWidth || img.width || null,
        height: img.naturalHeight || img.height || null,
        loading: img.loading || null,
      }))
      .slice(0, 50); // limit to 50 images
  });
}

async function extractScripts(page, result) {
  result.scripts = await page.evaluate(() => {
    return [...document.querySelectorAll("script[src]")]
      .map((s) => ({ src: s.src, async: s.async, defer: s.defer, type: s.type || "text/javascript" }))
      .slice(0, 30);
  });
}

async function extractPerformance(page, result) {
  try {
    result.performance = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      if (!nav) return {};
      return {
        domContentLoaded: nav.domContentLoadedEventEnd?.toFixed(0) || null,
        loadComplete: nav.loadEventEnd?.toFixed(0) || null,
        ttfB: nav.responseStart?.toFixed(0) || null,
        domInteractive: nav.domInteractive?.toFixed(0) || null,
        resources: performance.getEntriesByType("resource").length,
      };
    });
  } catch { /* ignore */ }
}

async function extractCookies(page, result) {
  try {
    const cookies = await page.context().cookies();
    result.cookies = cookies.map((c) => ({
      name: c.name,
      domain: c.domain,
      path: c.path,
      secure: c.secure,
      httpOnly: c.httpOnly,
      sameSite: c.sameSite || null,
      session: !c.expires,
      expires: c.expires ? new Date(c.expires * 1000).toISOString() : null,
    }));

    // Also extract document.cookie for JavaScript-accessible cookies
    const docCookies = await page.evaluate(() => {
      return document.cookie.split(";").map((c) => c.trim()).filter(Boolean);
    });

    result.documentCookies = docCookies;

    // Categorize cookies by purpose
    const categories = {
      analytics: [],
      auth: [],
      preferences: [],
      tracking: [],
      other: [],
    };

    for (const c of result.cookies) {
      const name = c.name.toLowerCase();
      if (name.includes("ga") || name.includes("_gid") || name.includes("_ga") || name.includes("_fbp") || name.includes("_clck") || name.includes("_pin") || name.includes("ajs") || name.includes("amplitude") || name.includes("mixpanel")) {
        categories.analytics.push(c.name);
      } else if (name.includes("sid") || name.includes("token") || name.includes("auth") || name.includes("session") || name.includes("jwt") || name.includes("csrf") || name.includes("xsrf")) {
        categories.auth.push(c.name);
      } else if (name.includes("pref") || name.includes("theme") || name.includes("lang") || name.includes("locale") || name.includes("currency") || name.includes("consent")) {
        categories.preferences.push(c.name);
      } else if (name.includes("ad") || name.includes("track") || name.includes("pixel") || name.includes("_gcl") || name.includes("_uet") || name.includes("_ttp") || name.includes("_sc") || name.includes("_lr")) {
        categories.tracking.push(c.name);
      } else {
        categories.other.push(c.name);
      }
    }

    result.cookieCategories = categories;
  } catch { /* ignore */ }
}
