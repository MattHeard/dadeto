import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

const entry = page.locator('#container > .entry').first();
await entry.screenshot({ path: 'e2e-results/localhost-fixed.png' });

const bioKey = entry.locator('.key:has-text("bio")');
const bioValue = bioKey.locator('+ .value');

const keyBox = await bioKey.boundingBox();
const valueBox = await bioValue.boundingBox();

console.log('\n=== BIO ALIGNMENT ===');
console.log(`Bio key y: ${keyBox.y}`);
console.log(`Bio value y: ${valueBox.y}`);
console.log(`Difference: ${Math.abs(keyBox.y - valueBox.y)} pixels`);

if (Math.abs(keyBox.y - valueBox.y) < 5) {
  console.log('✓ Vertically aligned!');
} else {
  console.log('✗ Not aligned - key and value have different baselines');
}

await browser.close();
