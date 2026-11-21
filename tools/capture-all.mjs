#!/usr/bin/env node
/**
 * capture-all.mjs - Generate 71 screenshots for Daniel's Barbecue POS
 * Uses patchright directly. All interactions are pure DOM (click/fill/selectOption).
 */
import { createRequire } from 'node:module';
import { copyFileSync } from 'node:fs';

const require = createRequire('C:/Users/Admin/.vscode/extensions/danielsanmedium.dscodegpt-3.24.57/standalone/');
const { chromium } = require('patchright');

const ROOT = 'C:\\Users\\Admin\\OneDrive\\Desktop\\New folder\\POS-System';
const URL = 'file:///C:/Users/Admin/OneDrive/Desktop/New%20folder/POS-System/app/index.html';
const SHOTS = ROOT + '\\design\\screenshots';
const UI = ROOT + '\\design\\ui';

const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({
  viewport: { width: 1366, height: 768 },
  deviceScaleFactor: 2,
  locale: 'en-US',
});
const page = await ctx.newPage();

let n = 0;
async function snap(name) {
  n++;
  const p = `${SHOTS}\\${name}.png`;
  await page.screenshot({ path: p, fullPage: false });
  copyFileSync(p, `${UI}\\${name}.png`);
  console.log(`[${String(n).padStart(2)}/71] ${name}`);
}
const wait = (ms = 300) => page.waitForTimeout(ms);

async function freshLoad() {
  await page.goto(URL, { waitUntil: 'load', timeout: 15000 });
  await wait(800);
}

async function resetAll() {
  await freshLoad();
  await page.evaluate(() => {
    localStorage.removeItem('sipos_session_v1');
    localStorage.removeItem('sipos_db_v2');
  });
  await freshLoad();
  await page.waitForSelector('#login', { state: 'visible', timeout: 5000 });
  await wait(300);
}

async function login(user, pass) {
  await page.fill('#logUser', user);
  await page.fill('#logPass', pass);
  await page.click('.login-card .btn');
  await wait(600);
}

async function nav(label) {
  await page.locator('.ni').filter({ hasText: label }).click();
  await wait(400);
}

async function closeModal() {
  await page.keyboard.press('Escape');
  await wait(200);
}

async function waitForModal() {
  await page.waitForSelector('.overlay.show', { timeout: 3000 });
  await wait(200);
}

async function waitForTable() {
  await page.waitForSelector('table', { timeout: 5000 });
  await wait(200);
}

async function waitForPos() {
  await page.waitForSelector('.pcard', { timeout: 5000 });
  await wait(200);
}

async function addItem(name) {
  await page.locator('.pcard').filter({ hasText: name }).first().click();
  await wait(150);
}

async function cartPlus(name) {
  await page.locator('.cline').filter({ hasText: name }).locator('.qty button').last().click();
  await wait(150);
}

async function cartMinus(name) {
  await page.locator('.cline').filter({ hasText: name }).locator('.qty button').first().click();
  await wait(150);
}

async function cartRemove(name) {
  await page.locator('.cline').filter({ hasText: name }).locator('.rm').click();
  await wait(150);
}

async function tableAction(rowIdx, title) {
  await page.locator('tr').nth(rowIdx).locator(`button[title="${title}"]`).click();
  await waitForModal();
}

async function tableIconBtn(rowIdx, cls) {
  await page.locator('tr').nth(rowIdx).locator(`.icon-btn.${cls}`).click();
  await waitForModal();
}

async function clickBtn(text) {
  await page.locator('button').filter({ hasText: text }).first().click();
}

// ================================================================
// SUPERADMIN (01-45)
// ================================================================
console.log('\n=== Superadmin ===');

// 01: Login failed
await resetAll();
await login('wrong', 'wrong');
await snap('01-sa-login-failed');

// 02: Login success (dashboard with welcome toast)
await login('user', '<redacted>');
await snap('02-sa-login-success');

// 03: Dashboard (clean, after toast disappears)
await wait(2600);
await snap('03-sa-dashboard');

// 04: POS menu
await nav('Point of Sale');
await waitForPos();
await snap('04-sa-pos-menu');

// 05: Item added to cart
await addItem('Pork BBQ Plate');
await wait(100);
await snap('05-sa-pos-item-added');

// 06: Multiple cart items
await addItem('Chicken BBQ Plate');
await addItem('Iced Tea');
await wait(100);
await snap('06-sa-pos-cart-items');

// 07: Qty increase
await cartPlus('Pork BBQ Plate');
await snap('07-sa-pos-qty-increase');

// 08: Qty decrease
await cartMinus('Pork BBQ Plate');
await snap('08-sa-pos-qty-decrease');

// 09: Remove item
await cartRemove('Iced Tea');
await snap('09-sa-pos-remove-item');

// 10: Customer selected
await page.selectOption('#custSel', 'c1');
await wait(200);
await snap('10-sa-pos-customer');

// 11: Discount applied
await page.selectOption('#discSel', '0.1');
await wait(200);
await snap('11-sa-pos-discount');

// 12: Order type changed
await page.locator('.ot-btn').filter({ hasText: 'Take-out' }).click();
await wait(200);
await snap('12-sa-pos-order-type');

// 13: Cash input
await page.fill('#cashInput', '200');
await wait(200);
await snap('13-sa-pos-cash-input');

// 14: Quick cash button
await page.locator('.qcash button').filter({ hasText: '500' }).click();
await wait(200);
await snap('14-sa-pos-quick-cash');

// 15: Receipt modal after checkout
await page.locator('.checkout-btn').click();
await page.waitForSelector('.receipt', { timeout: 5000 });
await wait(400);
await snap('15-sa-pos-receipt');

// 16: Empty cart after closing receipt
await closeModal();
await wait(300);
await snap('16-sa-pos-empty-cart');

// 17: Inventory list
await nav('Inventory');
await waitForTable();
await snap('17-sa-inv-list');

// 18: Inventory search
await page.locator('.toolrow .search-wrap input').fill('pork');
await wait(400);
await snap('18-sa-inv-search');

// 19: Inventory add form
await page.locator('.toolrow .search-wrap input').fill('');
await wait(200);
await clickBtn('+ Add Item');
await waitForModal();
await snap('19-sa-inv-add-form');

// 20: Inventory edit form
await closeModal();
await tableAction(1, 'Edit');
await snap('20-sa-inv-edit-form');

// 21: Inventory stock in
await closeModal();
await tableAction(1, 'Stock in');
await snap('21-sa-inv-stock-in');

// 22: Inventory delete
await closeModal();
await tableAction(1, 'Delete');
await snap('22-sa-inv-delete');

// 23: Recipe editor
await closeModal();
await tableAction(1, 'Recipe');
await snap('23-sa-recipe-editor');

// 24: Recipe add row
await clickBtn('+ Add ingredient row');
await wait(200);
await snap('24-sa-recipe-add-row');

// 25: POS insufficient ingredient
await closeModal();
await page.evaluate(() => {
  const db = JSON.parse(localStorage.getItem('sipos_db_v2'));
  const ing = db.ingredients.find(g => g.name === 'Pork Liempo');
  if (ing) ing.stock = 0.1;
  localStorage.setItem('sipos_db_v2', JSON.stringify(db));
});
await freshLoad();
await wait(300);
await nav('Point of Sale');
await waitForPos();
await addItem('Pork BBQ Plate');
await wait(100);
await page.fill('#cashInput', '500');
await wait(100);
await page.locator('.checkout-btn').click();
await page.waitForSelector('.toast.show', { timeout: 5000 });
await wait(100);
await snap('25-sa-pos-insufficient-ingredient');
await wait(2600);
await page.evaluate(() => {
  const db = JSON.parse(localStorage.getItem('sipos_db_v2'));
  const ing = db.ingredients.find(g => g.name === 'Pork Liempo');
  if (ing) ing.stock = 18;
  localStorage.setItem('sipos_db_v2', JSON.stringify(db));
});

// 26: Ingredients list
await nav('Ingredients');
await waitForTable();
await snap('26-sa-ing-list');

// 27: Ingredients search
await page.locator('.toolrow .search-wrap input').fill('pork');
await wait(400);
await snap('27-sa-ing-search');

// 28: Ingredients add form
await page.locator('.toolrow .search-wrap input').fill('');
await wait(200);
await clickBtn('+ Add Ingredient');
await waitForModal();
await snap('28-sa-ing-add-form');

// 29: Ingredients edit form
await closeModal();
await tableAction(1, 'Edit');
await snap('29-sa-ing-edit-form');

// 30: Ingredients stock in
await closeModal();
await tableAction(1, 'Stock in');
await snap('30-sa-ing-stock-in');

// 31: Ingredients delete
await closeModal();
await tableAction(1, 'Delete');
await snap('31-sa-ing-delete');

// 32: Ingredients status (list showing status pills)
await closeModal();
await snap('32-sa-ing-status');

// 33: Sales list
await nav('Sales History');
await waitForTable();
await snap('33-sa-sales-list');

// 34: Sales receipt
await tableIconBtn(1, 'view');
await page.waitForSelector('.receipt', { timeout: 5000 });
await wait(300);
await snap('34-sa-sales-receipt');

// 35: Sales void confirmation
await closeModal();
await tableIconBtn(1, 'del');
await snap('35-sa-sales-void');

// 36: Customers list
await closeModal();
await nav('Customers');
await waitForTable();
await snap('36-sa-cust-list');

// 37: Customers add form
await clickBtn('+ Add Customer');
await waitForModal();
await snap('37-sa-cust-add');

// 38: Customers edit form
await closeModal();
await tableIconBtn(1, 'edit');
await snap('38-sa-cust-edit');

// 39: Customers history
await closeModal();
await tableIconBtn(1, 'view');
await wait(300);
await snap('39-sa-cust-history');

// 40: Customers delete
await closeModal();
await tableIconBtn(1, 'del');
await snap('40-sa-cust-delete');

// 41: Reports
await closeModal();
await nav('Reports');
await wait(500);
await snap('41-sa-reports');

// 42: Users list
await nav('Users');
await waitForTable();
await snap('42-sa-users-list');

// 43: Users add form
await clickBtn('+ Add User');
await waitForModal();
await snap('43-sa-users-add');

// 44: Users edit form
await closeModal();
await tableIconBtn(1, 'edit');
await snap('44-sa-users-edit');

// 45: Users delete confirmation
await closeModal();
await page.locator('tr').filter({ hasText: 'Mahinay Irish D.' }).locator('.icon-btn.del').click();
await waitForModal();
await snap('45-sa-users-delete');

// ================================================================
// CLIENT (46-60)
// ================================================================
console.log('\n=== Client ===');
await closeModal();

// 46: Login failed
await resetAll();
await login('wrong', 'wrong');
await snap('46-cl-login-failed');

// 47: Login success
await login('client', '<redacted>');
await snap('47-cl-login-success');

// 48: Dashboard
await wait(2600);
await snap('48-cl-dashboard');

// 49: POS menu
await nav('Point of Sale');
await waitForPos();
await snap('49-cl-pos-menu');

// 50: POS cart with items
await addItem('BBQ Burger');
await addItem('French Fries (Reg)');
await addItem('Soda 12oz');
await wait(100);
await snap('50-cl-pos-cart');

// 51: POS receipt
await page.fill('#cashInput', '200');
await wait(100);
await page.locator('.checkout-btn').click();
await page.waitForSelector('.receipt', { timeout: 5000 });
await wait(400);
await snap('51-cl-pos-receipt');

// 52: Inventory list
await closeModal();
await nav('Inventory');
await waitForTable();
await snap('52-cl-inv-list');

// 53: Inventory add form
await clickBtn('+ Add Item');
await waitForModal();
await snap('53-cl-inv-add-form');

// 54: Inventory stock in
await closeModal();
await tableAction(1, 'Stock in');
await snap('54-cl-inv-stock-in');

// 55: Ingredients list
await closeModal();
await nav('Ingredients');
await waitForTable();
await snap('55-cl-ing-list');

// 56: Sales list
await nav('Sales History');
await waitForTable();
await snap('56-cl-sales-list');

// 57: Sales receipt
await tableIconBtn(1, 'view');
await page.waitForSelector('.receipt', { timeout: 5000 });
await wait(300);
await snap('57-cl-sales-receipt');

// 58: Customers list
await closeModal();
await nav('Customers');
await waitForTable();
await snap('58-cl-cust-list');

// 59: Customers add form
await clickBtn('+ Add Customer');
await waitForModal();
await snap('59-cl-cust-add');

// 60: Reports
await closeModal();
await nav('Reports');
await wait(500);
await snap('60-cl-reports');

// ================================================================
// STAFF (61-71)
// ================================================================
console.log('\n=== Staff ===');

// 61: Login failed
await resetAll();
await login('wrong', 'wrong');
await snap('61-st-login-failed');

// 62: Login success
await login('staff', '<redacted>');
await snap('62-st-login-success');

// 63: Dashboard
await wait(2600);
await snap('63-st-dashboard');

// 64: POS menu
await nav('Point of Sale');
await waitForPos();
await snap('64-st-pos-menu');

// 65: POS cart with items
await addItem('Sisig Plate');
await addItem('Garlic Rice');
await addItem('Fresh Lemonade');
await wait(100);
await snap('65-st-pos-cart');

// 66: POS receipt
await page.fill('#cashInput', '300');
await wait(100);
await page.locator('.checkout-btn').click();
await page.waitForSelector('.receipt', { timeout: 5000 });
await wait(400);
await snap('66-st-pos-receipt');

// 67: Inventory view only
await closeModal();
await nav('Inventory');
await waitForTable();
await snap('67-st-inv-viewonly');

// 68: Ingredients view only
await nav('Ingredients');
await waitForTable();
await snap('68-st-ing-viewonly');

// 69: Sales list
await nav('Sales History');
await waitForTable();
await snap('69-st-sales-list');

// 70: Sales receipt
await tableIconBtn(1, 'view');
await page.waitForSelector('.receipt', { timeout: 5000 });
await wait(300);
await snap('70-st-sales-receipt');

// 71: Customers view only
await closeModal();
await nav('Customers');
await waitForTable();
await snap('71-st-cust-viewonly');

// ================================================================
console.log(`\nDone! ${n} screenshots captured.`);
await browser.close();
