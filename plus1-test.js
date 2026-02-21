const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function takeScreenshot(page, name) {
  const screenshotPath = `/tmp/plus1-${name}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}

async function runTests() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  const results = [];

  try {
    // -----------------------------------------------------------------------
    // TEST 1: Navigate and find PLUS1 toy
    // -----------------------------------------------------------------------
    console.log('\n=== TEST 1: Navigate to mattheard.net ===');
    await page.goto('https://mattheard.net', { waitUntil: 'networkidle' });
    await sleep(2000);
    await takeScreenshot(page, '01-homepage');

    // Click "Toys" filter if it exists
    const toysFilter = page.locator('button', { hasText: 'Toys' });
    const toysFilterCount = await toysFilter.count();
    console.log(`Toys filter button found: ${toysFilterCount > 0}`);
    if (toysFilterCount > 0) {
      await toysFilter.click();
      await sleep(1000);
      await takeScreenshot(page, '02-toys-filter');
      console.log('Clicked Toys filter');
    }

    // Find PLUS1 article link
    const plus1Link = page.locator('a', { hasText: /PLUS1/i }).first();
    const plus1Count = await plus1Link.count();
    console.log(`PLUS1 link found: ${plus1Count > 0}`);
    results.push({ test: 'Find PLUS1 toy', passed: plus1Count > 0, details: `Count: ${plus1Count}` });

    if (plus1Count === 0) {
      // Try scrolling and searching
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(1000);
      const allLinks = await page.locator('a').allTextContents();
      const plus1Links = allLinks.filter(t => /plus.?1/i.test(t));
      console.log('All links with PLUS1:', plus1Links);
      await takeScreenshot(page, '03-scrolled');
    }

    // Navigate to PLUS1 toy page
    await plus1Link.click();
    await page.waitForLoadState('networkidle');
    await sleep(2000);
    const plus1Url = page.url();
    console.log(`Navigated to: ${plus1Url}`);
    await takeScreenshot(page, '04-plus1-page');

    // -----------------------------------------------------------------------
    // TEST 2: Confirm toy loads with kv input showing at least one row
    // -----------------------------------------------------------------------
    console.log('\n=== TEST 2: Confirm kv input with at least one row ===');

    // Look for kv-related elements
    const kvRows = page.locator('.kv-row, [class*="kv"], .key-value-row, tr, .input-row').first();
    const kvRowCount = await page.locator('.kv-row').count();
    console.log('.kv-row count:', kvRowCount);

    // Check for input elements in the toy
    const inputCount = await page.locator('input[type="text"], input:not([type])').count();
    console.log('Text input count:', inputCount);

    // Look for the key/value inputs specifically
    const keyInputs = await page.locator('input[placeholder*="key" i], input[name*="key" i]').count();
    const valueInputs = await page.locator('input[placeholder*="value" i], textarea[placeholder*="value" i]').count();
    console.log(`Key inputs: ${keyInputs}, Value inputs: ${valueInputs}`);

    // Try to get the page HTML structure around the toy area
    const toyHtml = await page.locator('article, main, .toy, #toy, .content').first().innerHTML().catch(() => '');
    console.log('Toy HTML snippet (first 2000 chars):', toyHtml.substring(0, 2000));

    await takeScreenshot(page, '05-kv-area');

    // -----------------------------------------------------------------------
    // TEST 3: Click the ▾ toggle button on a row
    // -----------------------------------------------------------------------
    console.log('\n=== TEST 3: Click ▾ toggle button ===');

    // Look for the toggle button with ▾ or similar
    const toggleButton = page.locator('button:has-text("▾"), button[aria-label*="type"], button[title*="type"], .type-toggle').first();
    const toggleCount = await toggleButton.count();
    console.log(`Toggle button (▾) found: ${toggleCount > 0}`);

    // Also try finding by text content
    const allButtons = await page.locator('button').allTextContents();
    console.log('All button texts:', allButtons);

    let typeSelectVisible = false;
    if (toggleCount > 0) {
      await toggleButton.click();
      await sleep(500);
      await takeScreenshot(page, '06-after-toggle-click');

      // Check if type select appeared
      const typeSelect = page.locator('select').first();
      const selectCount = await typeSelect.count();
      typeSelectVisible = selectCount > 0;
      console.log(`Type select appeared: ${typeSelectVisible}`);
      results.push({ test: 'Toggle reveals type select', passed: typeSelectVisible, details: `Select count: ${selectCount}` });
    } else {
      // Try clicking any small button in the kv area
      console.log('Looking for any small buttons in the kv area...');
      const allButtonEls = page.locator('button');
      const count = await allButtonEls.count();
      console.log(`Total buttons on page: ${count}`);
      for (let i = 0; i < Math.min(count, 10); i++) {
        const text = await allButtonEls.nth(i).textContent();
        const isVisible = await allButtonEls.nth(i).isVisible();
        console.log(`  Button ${i}: "${text}" visible=${isVisible}`);
      }
      results.push({ test: 'Toggle reveals type select', passed: false, details: 'Toggle button not found' });
    }

    // -----------------------------------------------------------------------
    // TEST 4: Verify type select options
    // -----------------------------------------------------------------------
    console.log('\n=== TEST 4: Verify type select options ===');

    const selects = page.locator('select');
    const selectCount = await selects.count();
    console.log(`Number of selects: ${selectCount}`);

    if (selectCount > 0) {
      const options = await selects.first().locator('option').allTextContents();
      console.log('Select options:', options);
      const hasString = options.some(o => /string/i.test(o));
      const hasNumber = options.some(o => /number/i.test(o));
      const hasBoolean = options.some(o => /boolean/i.test(o));
      const hasJson = options.some(o => /json/i.test(o));
      console.log(`Has string: ${hasString}, number: ${hasNumber}, boolean: ${hasBoolean}, json: ${hasJson}`);
      const allOptionsCorrect = hasString && hasNumber && hasBoolean && hasJson;
      results.push({ test: 'Type select has correct options', passed: allOptionsCorrect, details: `Options: ${options.join(', ')}` });
    } else {
      results.push({ test: 'Type select has correct options', passed: false, details: 'No select found' });
    }

    // -----------------------------------------------------------------------
    // TEST 5: Test PLUS1 with string type
    // -----------------------------------------------------------------------
    console.log('\n=== TEST 5: Test PLUS1 with string type ===');

    // Reload the page to start fresh
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(2000);
    await takeScreenshot(page, '07-reloaded');

    // Find key/value inputs
    // First, let's inspect the DOM structure
    const formHtml = await page.evaluate(() => {
      const form = document.querySelector('form, .kv-editor, .toy-input, .input-section');
      return form ? form.outerHTML : document.body.innerHTML.substring(0, 5000);
    });
    console.log('Form/input HTML:', formHtml.substring(0, 3000));

    // Try to find key and value inputs
    const allInputs = page.locator('input[type="text"], input:not([type="submit"]):not([type="checkbox"]):not([type="radio"])');
    const allInputCount = await allInputs.count();
    console.log(`All text inputs: ${allInputCount}`);

    for (let i = 0; i < Math.min(allInputCount, 6); i++) {
      const placeholder = await allInputs.nth(i).getAttribute('placeholder');
      const name = await allInputs.nth(i).getAttribute('name');
      const id = await allInputs.nth(i).getAttribute('id');
      const val = await allInputs.nth(i).inputValue();
      console.log(`  Input ${i}: placeholder="${placeholder}" name="${name}" id="${id}" value="${val}"`);
    }

    // Set key="sentence" and value="Ich gehe nach Hause"
    // Try different selectors for key input
    let keyInput = page.locator('input[placeholder*="key" i]').first();
    let keyCount = await keyInput.count();

    if (keyCount === 0) {
      keyInput = page.locator('input').first();
    }

    let valueInput = page.locator('textarea, input[placeholder*="value" i]').first();
    let valueCount = await valueInput.count();

    if (valueCount === 0) {
      valueInput = page.locator('input').nth(1);
    }

    console.log('Setting key="sentence"...');
    await keyInput.click({ clickCount: 3 });
    await keyInput.fill('sentence');
    await sleep(200);

    console.log('Setting value="Ich gehe nach Hause"...');
    await valueInput.click({ clickCount: 3 });
    await valueInput.fill('Ich gehe nach Hause');
    await sleep(200);

    await takeScreenshot(page, '08-first-row-filled');

    // Look for "Add row" button to add second row for knownWords
    const addRowButton = page.locator('button:has-text("Add"), button:has-text("+"), button[title*="add" i], button[aria-label*="add" i]').first();
    const addRowCount = await addRowButton.count();
    console.log(`Add row button found: ${addRowCount > 0}`);

    if (addRowCount > 0) {
      await addRowButton.click();
      await sleep(500);
      console.log('Clicked add row button');
      await takeScreenshot(page, '09-second-row-added');

      // Now fill in the second row
      const keyInputs2 = page.locator('input[placeholder*="key" i]');
      const keyInputCount2 = await keyInputs2.count();
      console.log(`Key inputs after add: ${keyInputCount2}`);

      if (keyInputCount2 >= 2) {
        await keyInputs2.nth(1).fill('knownWords');
        const valueInputs2 = page.locator('textarea, input[placeholder*="value" i]');
        if (await valueInputs2.count() >= 2) {
          await valueInputs2.nth(1).fill('ich\ngehe\nnach');
        }
      }
      await takeScreenshot(page, '10-second-row-filled');
    } else {
      // Check all buttons again
      const allBtns = await page.locator('button').allTextContents();
      console.log('All buttons for adding rows:', allBtns);
    }

    // Find and click the run/submit button
    const runButton = page.locator('button[type="submit"], button:has-text("Run"), button:has-text("Submit"), button:has-text("Execute"), input[type="submit"]').first();
    const runCount = await runButton.count();
    console.log(`Run button found: ${runCount > 0}`);

    if (runCount > 0) {
      const runText = await runButton.textContent();
      console.log(`Run button text: "${runText}"`);
      await runButton.click();
      await sleep(3000);
      await takeScreenshot(page, '11-after-run');

      // Check output
      const output = await page.locator('.output, #output, pre, .result, [class*="output"]').allTextContents();
      console.log('Output:', output);
      const outputText = output.join(' ');
      const hasPlusOne = /isPlusOne\s*:\s*true/i.test(outputText) || /isPlusOne.*true/i.test(outputText);
      console.log(`isPlusOne: true found in output: ${hasPlusOne}`);
      results.push({ test: 'PLUS1 with string type shows isPlusOne: true', passed: hasPlusOne, details: `Output: ${outputText.substring(0, 500)}` });
    } else {
      results.push({ test: 'PLUS1 with string type shows isPlusOne: true', passed: false, details: 'Run button not found' });
    }

    // -----------------------------------------------------------------------
    // TEST 6: Test with number type
    // -----------------------------------------------------------------------
    console.log('\n=== TEST 6: Test with number type ===');

    await page.reload({ waitUntil: 'networkidle' });
    await sleep(2000);

    // Find the toggle button for the first row
    const toggleBtn = page.locator('button:has-text("▾"), button[class*="toggle"], .type-toggle').first();
    const tbCount = await toggleBtn.count();
    console.log(`Toggle button found for number test: ${tbCount > 0}`);

    if (tbCount > 0) {
      // Set key first
      const kInput = page.locator('input[placeholder*="key" i]').first();
      await kInput.fill('testNum');

      // Click toggle
      await toggleBtn.click();
      await sleep(500);
      await takeScreenshot(page, '12-toggle-for-number');

      // Change type to "number"
      const typeSelect = page.locator('select').first();
      const tsCount = await typeSelect.count();
      console.log(`Type select visible: ${tsCount > 0}`);
      if (tsCount > 0) {
        await typeSelect.selectOption('number');
        await sleep(300);
        console.log('Selected "number" type');
        await takeScreenshot(page, '13-number-type-selected');

        // Set value to 42
        const vInput = page.locator('input[placeholder*="value" i], textarea').first();
        await vInput.fill('42');
        await sleep(200);
        await takeScreenshot(page, '14-number-value-set');

        // Look for any JSON preview or serialized output
        const jsonPreview = await page.locator('pre, code, .json-preview, [class*="preview"]').allTextContents();
        console.log('JSON preview:', jsonPreview);

        // Try running the toy and checking JSON output
        const runBtn2 = page.locator('button[type="submit"], button:has-text("Run"), button:has-text("Submit")').first();
        if (await runBtn2.count() > 0) {
          await runBtn2.click();
          await sleep(2000);
          await takeScreenshot(page, '15-number-run-output');
          const output2 = await page.locator('.output, #output, pre, .result, [class*="output"]').allTextContents();
          console.log('Number output:', output2);
          const outputStr = output2.join(' ');
          // Check if 42 appears as number (not "42" string) in JSON-like output
          const hasNumeric42 = /"testNum"\s*:\s*42\b/.test(outputStr) || /testNum.*:\s*42\b/.test(outputStr);
          const hasString42 = /"testNum"\s*:\s*"42"/.test(outputStr);
          console.log(`Numeric 42 found: ${hasNumeric42}, String "42" found: ${hasString42}`);
          results.push({ test: 'Number type serialises as numeric 42', passed: hasNumeric42 && !hasString42, details: `Output: ${outputStr.substring(0, 500)}` });
        } else {
          results.push({ test: 'Number type serialises as numeric 42', passed: false, details: 'Run button not found' });
        }
      } else {
        results.push({ test: 'Number type serialises as numeric 42', passed: false, details: 'Type select not found' });
      }
    } else {
      results.push({ test: 'Number type serialises as numeric 42', passed: false, details: 'Toggle button not found' });
    }

  } catch (err) {
    console.error('Test error:', err);
    await takeScreenshot(page, 'error');
    results.push({ test: 'Error', passed: false, details: err.message });
  } finally {
    // Final summary
    console.log('\n=== TEST RESULTS SUMMARY ===');
    for (const r of results) {
      const status = r.passed ? 'PASS' : 'FAIL';
      console.log(`[${status}] ${r.test}`);
      console.log(`       ${r.details}`);
    }

    await browser.close();
  }
}

runTests().catch(console.error);
