#!/usr/bin/env node
/**
 * generate-pdfs.mjs - Generate both PDF files from the 71 captured screenshots.
 * 1. Screenshots PDF: 71 pages, one screenshot per page (297mm x 167mm landscape)
 * 2. Modules PDF: regenerated from updated plain.html with new base64 images
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';

const require = createRequire('C:/Users/Admin/.vscode/extensions/danielsanmedium.dscodegpt-3.24.57/standalone/');
const { chromium } = require('patchright');

const ROOT = 'C:\\Users\\Admin\\OneDrive\\Desktop\\New folder\\POS-System';
const SHOTS = ROOT + '\\design\\screenshots';
const UI = ROOT + '\\design\\ui';
const DOCS = ROOT + '\\docs';

const PNG_NAMES = [
  '01-sa-login-failed','02-sa-login-success','03-sa-dashboard','04-sa-pos-menu',
  '05-sa-pos-item-added','06-sa-pos-cart-items','07-sa-pos-qty-increase',
  '08-sa-pos-qty-decrease','09-sa-pos-remove-item','10-sa-pos-customer',
  '11-sa-pos-discount','12-sa-pos-order-type','13-sa-pos-cash-input',
  '14-sa-pos-quick-cash','15-sa-pos-receipt','16-sa-pos-empty-cart',
  '17-sa-inv-list','18-sa-inv-search','19-sa-inv-add-form','20-sa-inv-edit-form',
  '21-sa-inv-stock-in','22-sa-inv-delete','23-sa-recipe-editor','24-sa-recipe-add-row',
  '25-sa-pos-insufficient-ingredient','26-sa-ing-list','27-sa-ing-search',
  '28-sa-ing-add-form','29-sa-ing-edit-form','30-sa-ing-stock-in','31-sa-ing-delete',
  '32-sa-ing-status','33-sa-sales-list','34-sa-sales-receipt','35-sa-sales-void',
  '36-sa-cust-list','37-sa-cust-add','38-sa-cust-edit','39-sa-cust-history',
  '40-sa-cust-delete','41-sa-reports','42-sa-users-list','43-sa-users-add',
  '44-sa-users-edit','45-sa-users-delete','46-cl-login-failed','47-cl-login-success',
  '48-cl-dashboard','49-cl-pos-menu','50-cl-pos-cart','51-cl-pos-receipt',
  '52-cl-inv-list','53-cl-inv-add-form','54-cl-inv-stock-in','55-cl-ing-list',
  '56-cl-sales-list','57-cl-sales-receipt','58-cl-cust-list','59-cl-cust-add',
  '60-cl-reports','61-st-login-failed','62-st-login-success','63-st-dashboard',
  '64-st-pos-menu','65-st-pos-cart','66-st-pos-receipt','67-st-inv-viewonly',
  '68-st-ing-viewonly','69-st-sales-list','70-st-sales-receipt','71-st-cust-viewonly',
];

// Build base64 images
console.log('Loading 71 screenshots as base64...');
const b64Images = PNG_NAMES.map(name => {
  const buf = readFileSync(`${SHOTS}\\${name}.png`);
  return buf.toString('base64');
});

// Generate Screenshots HTML
const PAGE_CSS = `@page { size: 297mm 167mm; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
.pg { width: 297mm; height: 167mm; page-break-after: always; }
.pg:last-child { page-break-after: auto; }
img { display: block; width: 100%; height: 100%; }`;

let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${PAGE_CSS}</style></head><body>`;
b64Images.forEach(b64 => {
  html += `<div class="pg"><img src="data:image/png;base64,${b64}"></div>`;
});
html += `</body></html>`;

const screenshotsHtml = `${UI}\\screenshots-print.html`;
writeFileSync(screenshotsHtml, html);
console.log(`Wrote ${screenshotsHtml}`);

// Also regenerate plain.html (Modules PDF source) with same structure
const modulesHtml = `${UI}\\plain.html`;
writeFileSync(modulesHtml, html);
console.log(`Wrote ${modulesHtml}`);

// Print both to PDF using chromium
console.log('\nLaunching chromium for PDF generation...');
const browser = await chromium.launch({
  headless: true,
  channel: 'chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

async function printPdf(htmlPath, pdfPath) {
  const page = await browser.newPage();
  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.pdf({
    path: pdfPath,
    width: '297mm',
    height: '167mm',
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    printBackground: true,
  });
  await page.close();
  console.log(`  Generated: ${pdfPath}`);
}

await printPdf(screenshotsHtml, `${DOCS}\\Daniels-Barbecue-POS-Screenshots.pdf`);
await printPdf(modulesHtml, `${DOCS}\\Daniels-Barbecue-POS-Modules.pdf`);

await browser.close();
console.log('\nDone! Both PDFs generated.');
