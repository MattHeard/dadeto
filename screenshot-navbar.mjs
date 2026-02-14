import { chromium } from 'playwright';

async function takeScreenshot() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set viewport to capture full width
  await page.setViewportSize({ width: 1200, height: 2000 });
  
  console.log('Loading mattheard.net...');
  await page.goto('https://mattheard.net', { waitUntil: 'domcontentloaded', timeout: 15000 });
  
  // Take screenshot
  const screenshotPath = '/tmp/navbar-screenshot.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  
  console.log(`✓ Screenshot saved to ${screenshotPath}`);
  
  await browser.close();
}

takeScreenshot().catch(console.error);
