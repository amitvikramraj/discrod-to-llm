import puppeteer from "puppeteer";
import { PDFDocument } from "pdf-lib";
import { resolve } from "path";
import { writeFile } from "fs/promises";

const input = resolve(process.argv[2] || "report.html");
const output = process.argv[3] || input.replace(/\.html$/, ".pdf");
const PAGE_WIDTH = 1280;
const PAD = 48;

// Section groups: each group = one PDF page.
// First selector in each group gets the page break.
// All selectors in a group contribute to that page's measured height.
//
// Customize this array for each report. Common patterns:
//   { label: "Hero",     sels: ["section.hero"] }
//   { label: "Theme 1",  sels: ["#t1"] }
//   { label: "Footer",   sels: [".footer"] }
//
// Special "@" selectors for nth-of-type matching:
//   "@divider:0"  → .container > .section-divider, index 0
//   "@stat-row:1" → .container > .stat-row, index 1
const SECTIONS = [
  { label: "Hero",              sels: ["section.hero"] },
  { label: "TOC",               sels: ["section.toc-section"] },
  { label: "Part 1 Stats",      sels: ["@divider:0", "@stat-row:0", "@stat-row:1"] },
  { label: "RDS CPU/IOPS",      sels: ["#t1"] },
  { label: "K8s Pod Failures",  sels: ["#t2"] },
  { label: "ArgoCD Storms",     sels: ["#t3"] },
  { label: "Sandbox Noise",     sels: ["#t4"] },
  { label: "Full Outages",      sels: ["#t5"] },
  { label: "Stuck Provisioning", sels: ["#t6"] },
  { label: "Customer Debug",    sels: ["#t7"] },
  { label: "CI/CD Flakiness",   sels: ["#t8"] },
  { label: "Third-Party",       sels: ["#t9"] },
  { label: "Part 2 Recs",       sels: ["@divider:1", "@rec-card"] },
  { label: "Footer",            sels: [".footer"] },
];

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: PAGE_WIDTH, height: 800 });
await page.goto(`file://${input}`, { waitUntil: "networkidle0" });

// Step 1: Measure section heights and inject page breaks + print fixes.
const sectionHeights = await page.evaluate((sections, PAD) => {
  const dividers = [...document.querySelectorAll(".container > .section-divider")];
  const statRows = [...document.querySelectorAll(".container > .stat-row")];
  const additionalItems = [...document.querySelectorAll(".container > .additional-item")];
  const recCards = [...document.querySelectorAll(".container > .rec-card")];

  function resolveSelector(sel) {
    if (sel.startsWith("@divider:")) return [dividers[+sel.split(":")[1]]];
    if (sel.startsWith("@stat-row:")) return [statRows[+sel.split(":")[1]]];
    if (sel === "@additional-items") return additionalItems;
    if (sel === "@rec-card") return recCards;
    return [...document.querySelectorAll(sel)];
  }

  const heights = [];
  for (let i = 0; i < sections.length; i++) {
    const els = sections[i].sels.flatMap(s => resolveSelector(s)).filter(Boolean);
    if (els.length === 0) { heights.push(0); continue; }

    if (i > 0) {
      els[0].style.pageBreakBefore = "always";
    }

    let top = Infinity, bottom = -Infinity;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.top < top) top = r.top;
      if (r.bottom > bottom) bottom = r.bottom;
    }
    heights.push(bottom - top);
  }

  // --- Print fixes ---

  // Fix hero expanding to 100vh of (very tall) page
  const hero = document.querySelector(".hero");
  if (hero) hero.style.minHeight = "0";

  // Fix background-clip: text garbling in Chrome print
  const TURQUOISE = "#06b6d4";
  for (const el of document.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    if (cs.webkitBackgroundClip === "text" || cs.backgroundClip === "text") {
      el.style.webkitBackgroundClip = "initial";
      el.style.backgroundClip = "initial";
      el.style.webkitTextFillColor = "initial";
      el.style.background = "none";
      el.style.color = TURQUOISE;
    }
  }

  // Prevent Chrome from splitting sections across pages
  const noSplit = document.querySelectorAll(
    ".theme-card, .rec-card, .evidence, .toc, .section-divider, .stat-row, .stat-card, .footer, .card"
  );
  for (const el of noSplit) {
    el.style.pageBreakInside = "avoid";
  }

  return heights;
}, SECTIONS, PAD);

// Step 2: Generate PDF with a page tall enough for the largest section
const maxHeight = Math.max(...sectionHeights);
const pageHeight = maxHeight + PAD * 2 + 100;

console.log("Section heights:", sectionHeights.map(h => Math.round(h)));
console.log(`Page size: ${PAGE_WIDTH} x ${Math.round(pageHeight)}px\n`);

const pdfBytes = await page.pdf({
  width: `${PAGE_WIDTH}px`,
  height: `${pageHeight}px`,
  printBackground: true,
  preferCSSPageSize: false,
  margin: { top: `${PAD}px`, right: "0px", bottom: `${PAD}px`, left: "0px" },
});

await browser.close();

// Step 3: Trim each page to its section's actual content height
console.log("Trimming pages...");
const doc = await PDFDocument.load(pdfBytes);
const pageCount = doc.getPageCount();
console.log(`Chrome generated ${pageCount} pages (expected ${SECTIONS.length})\n`);

for (let i = 0; i < pageCount && i < sectionHeights.length; i++) {
  const pg = doc.getPage(i);
  const { width, height } = pg.getSize();
  const trimmedHeight = sectionHeights[i] + PAD * 2;

  if (trimmedHeight < height) {
    pg.setMediaBox(0, height - trimmedHeight, width, trimmedHeight);
    pg.setCropBox(0, height - trimmedHeight, width, trimmedHeight);
    console.log(`  ${SECTIONS[i].label}: ${Math.round(height)} -> ${Math.round(trimmedHeight)}px`);
  } else {
    console.log(`  ${SECTIONS[i].label}: ${Math.round(height)}px (no trim)`);
  }
}

const finalBytes = await doc.save();
await writeFile(output, finalBytes);

const sizeMB = (finalBytes.length / 1024 / 1024).toFixed(1);
console.log(`\nDone! ${output} -- ${pageCount} pages, ${sizeMB} MB`);
