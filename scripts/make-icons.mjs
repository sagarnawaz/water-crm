// Renders the app icons (white water drop on the app blue) to public/icons/ using Playwright's Chromium.
// Run after changing the design: node scripts/make-icons.mjs
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BLUE = "#0A6A93";
// The drop stays inside the centre 60%, so Android's round/squircle masks never cut it ("maskable").
const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${BLUE}"/>
  <path d="M50 22 C50 22 69 43 69 57 A19 19 0 0 1 31 57 C31 43 50 22 50 22 Z" fill="#fff"/>
  <path d="M41 58 A9 9 0 0 0 50 67" fill="none" stroke="${BLUE}" stroke-width="4" stroke-linecap="round" opacity=".45"/>
</svg>`;

mkdirSync("public/icons", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0">${svg(size)}</body>`);
  await page.locator("svg").screenshot({ path: `public/icons/${name}`, omitBackground: false });
  console.log("wrote public/icons/" + name);
}
await browser.close();
