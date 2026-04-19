# HTML-to-PDF Export

Convert rich, dark-themed HTML reports into multi-page PDFs suitable for sharing on Discord — with clickable links, proper dark backgrounds, and one page per natural section.

## Quick Start

```bash
# First-time setup (install Puppeteer + pdf-lib)
cd pdf-export && npm install && cd ..

# Convert an HTML file
node pdf-export/html-to-pdf.mjs pdf-export/reports/my-report.html

# Or specify a custom output path
node pdf-export/html-to-pdf.mjs input.html output.pdf
```

## What It Does

1. Opens the HTML file in headless Chromium via Puppeteer
2. Injects CSS page breaks at natural section boundaries (hero, TOC, each theme card, etc.)
3. Fixes `background-clip: text` elements that garble in Chrome's PDF renderer — replaces them with solid turquoise (`#06b6d4`)
4. Fixes `min-height: 100vh` on the hero so it doesn't expand to fill an oversized page
5. Generates a single PDF with Chrome's native renderer (preserving all links)
6. Trims each page to fit its section's content height using pdf-lib

The result is a multi-page PDF where each page is dynamically sized to its content and all external links work.

## Customizing Sections

Edit the `SECTIONS` array in `pdf-export/html-to-pdf.mjs` to match your report's structure. Each entry becomes one PDF page:

```js
const SECTIONS = [
  { label: "Hero",     sels: ["section.hero"] },
  { label: "Theme 1",  sels: ["#t1"] },
  { label: "Footer",   sels: [".footer"] },
];
```

Special `@` selectors for nth-of-type matching:
- `@divider:0` — `.container > .section-divider`, index 0
- `@stat-row:1` — `.container > .stat-row`, index 1

## Why Not Just Print-to-PDF from the Browser?

Browser print-to-PDF has three problems with dark-themed, single-page-scroll reports:

1. **Strips dark mode** — print stylesheets default to white backgrounds
2. **Breaks across fixed page sizes** — content gets split mid-section at arbitrary A4/Letter boundaries
3. **Garbles gradient text** — CSS `background-clip: text` renders as solid colored blocks

## Dependencies

- [Puppeteer](https://purl.org/nickg/puppeteer) — headless Chromium for faithful rendering
- [pdf-lib](https://github.com/Hopding/pdf-lib) — PDF post-processing (page trimming)

Both are installed locally in `pdf-export/node_modules/` and gitignored.
