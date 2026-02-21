import { chromium } from 'playwright';

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
    const toyHtml = await page.evaluate(() => {
      const form = document.querySelector('form');
      return form ? form.outerHTML : document.body.innerHTML.substring(0, 5000);
    });
    console.log('Form HTML snippet (first 3000 chars):', toyHtml.substring(0, 3000));

    const hasAtLeastOneRow = kvRowCount > 0 || keyInputs > 0 || inputCount > 0;
    results.push({ test: 'kv input shows at least one row', passed: hasAtLeastOneRow, details: `kvRows: ${kvRowCount}, keyInputs: ${keyInputs}, inputs: ${inputCount}` });

    await takeScreenshot(page, '05-kv-area');

    // -----------------------------------------------------------------------
    // TEST 3: Click the ▾ toggle button on a row
    // -----------------------------------------------------------------------
    console.log('\n=== TEST 3: Click ▾ toggle button ===');

    // Look for the toggle button with ▾ or similar
    const toggleButton = page.locator('button:has-text("▾")').first();
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
      const typeSelect = page.locator('select');
      const selectCount = await typeSelect.count();
      typeSelectVisible = selectCount > 0;
      console.log(`Type select appeared: ${typeSelectVisible}`);
      results.push({ test: 'Toggle reveals type select', passed: typeSelectVisible, details: `Select count: ${selectCount}` });
    } else {
      // Explore what buttons exist
      const allButtonEls = page.locator('button');
      const count = await allButtonEls.count();
      console.log(`Total buttons on page: ${count}`);
      for (let i = 0; i < Math.min(count, 15); i++) {
        const text = await allButtonEls.nth(i).textContent();
        const isVisible = await allButtonEls.nth(i).isVisible();
        const className = await allButtonEls.nth(i).getAttribute('class');
        console.log(`  Button ${i}: "${text}" visible=${isVisible} class="${className}"`);
      }
      results.push({ test: 'Toggle reveals type select', passed: false, details: 'Toggle button (▾) not found' });
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
      results.push({ test: 'Type select has string/number/boolean/json options', passed: allOptionsCorrect, details: `Options: ${options.join(', ')}` });
    } else {
      results.push({ test: 'Type select has string/number/boolean/json options', passed: false, details: 'No select found' });
    }

    // -----------------------------------------------------------------------
    // TEST 5: Test PLUS1 with string type
    // -----------------------------------------------------------------------
    console.log('\n=== TEST 5: Test PLUS1 with string type ===');

    // Reload the page to start fresh
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(2000);
    await takeScreenshot(page, '07-reloaded');

    // Inspect the full DOM to understand the structure
    const bodyHtml = await page.evaluate(() => document.body.innerHTML.substring(0, 8000));
    console.log('Body HTML (8000 chars):', bodyHtml);

    // Try to find key and value inputs
    const allTextInputs = page.locator('input[type="text"], input:not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="hidden"])');
    const allTextCount = await allTextInputs.count();
    console.log(`All text inputs: ${allTextCount}`);

    for (let i = 0; i < Math.min(allTextCount, 8); i++) {
      const placeholder = await allTextInputs.nth(i).getAttribute('placeholder');
      const name = await allTextInputs.nth(i).getAttribute('name');
      const id = await allTextInputs.nth(i).getAttribute('id');
      const className = await allTextInputs.nth(i).getAttribute('class');
      const val = await allTextInputs.nth(i).inputValue();
      console.log(`  Input ${i}: placeholder="${placeholder}" name="${name}" id="${id}" class="${className}" value="${val}"`);
    }

    // Check textareas too
    const textareas = page.locator('textarea');
    const textareaCount = await textareas.count();
    console.log(`Textareas: ${textareaCount}`);
    for (let i = 0; i < Math.min(textareaCount, 4); i++) {
      const placeholder = await textareas.nth(i).getAttribute('placeholder');
      const name = await textareas.nth(i).getAttribute('name');
      const id = await textareas.nth(i).getAttribute('id');
      const className = await textareas.nth(i).getAttribute('class');
      console.log(`  Textarea ${i}: placeholder="${placeholder}" name="${name}" id="${id}" class="${className}"`);
    }

    // Fill in sentence row
    // Try using nth-based approach for key-value pairs
    let filled = false;

    // Look for inputs with placeholder "key"
    const keyPlaceholder = page.locator('input[placeholder="key"]');
    const keyPlaceholderCount = await keyPlaceholder.count();
    console.log(`Inputs with placeholder="key": ${keyPlaceholderCount}`);

    if (keyPlaceholderCount > 0) {
      await keyPlaceholder.first().fill('sentence');
      // Value input is likely next to it
      const valuePlaceholder = page.locator('input[placeholder="value"], textarea[placeholder="value"]');
      const valueCount2 = await valuePlaceholder.count();
      console.log(`Value inputs: ${valueCount2}`);
      if (valueCount2 > 0) {
        await valuePlaceholder.first().fill('Ich gehe nach Hause');
        filled = true;
      }
    }

    if (!filled && allTextCount >= 2) {
      await allTextInputs.nth(0).fill('sentence');
      await allTextInputs.nth(1).fill('Ich gehe nach Hause');
      filled = true;
    }

    await takeScreenshot(page, '08-first-row-filled');
    console.log(`First row filled: ${filled}`);

    // Add a second row for knownWords
    const addRowButton = page.locator('button:has-text("Add row"), button:has-text("Add"), button:has-text("+")').first();
    const addRowCount2 = await addRowButton.count();
    console.log(`Add row button: ${addRowCount2 > 0}`);

    // List all buttons to find the add button
    const allBtns = await page.locator('button').allTextContents();
    console.log('All buttons:', JSON.stringify(allBtns));

    if (addRowCount2 > 0) {
      const addText = await addRowButton.textContent();
      console.log(`Clicking add button: "${addText}"`);
      await addRowButton.click();
      await sleep(500);
      await takeScreenshot(page, '09-after-add-row');

      // Fill in knownWords
      const keyInputsAfter = page.locator('input[placeholder="key"]');
      const keyCountAfter = await keyInputsAfter.count();
      console.log(`Key inputs after add: ${keyCountAfter}`);

      if (keyCountAfter >= 2) {
        await keyInputsAfter.nth(1).fill('knownWords');
        const valueInputsAfter = page.locator('input[placeholder="value"], textarea[placeholder="value"]');
        const valueCountAfter = await valueInputsAfter.count();
        if (valueCountAfter >= 2) {
          // Use keyboard to type newlines
          await valueInputsAfter.nth(1).click();
          await page.keyboard.type('ich');
          await page.keyboard.press('Enter');
          await page.keyboard.type('gehe');
          await page.keyboard.press('Enter');
          await page.keyboard.type('nach');
          console.log('Typed knownWords with newlines');
        }
        await takeScreenshot(page, '10-second-row-filled');
      }
    }

    // Find and click run/submit button
    const runButton = page.locator('button[type="submit"], input[type="submit"]').first();
    const runCount = await runButton.count();

    // If no submit, look for any run/execute button
    let submitBtn = runButton;
    if (runCount === 0) {
      submitBtn = page.locator('button:has-text("Run"), button:has-text("Execute"), button:has-text("Submit")').first();
    }

    const submitCount = await submitBtn.count();
    console.log(`Submit/Run button found: ${submitCount > 0}`);

    if (submitCount > 0) {
      const btnText = await submitBtn.textContent();
      console.log(`Clicking run button: "${btnText}"`);
      await submitBtn.click();
      await sleep(3000);
      await takeScreenshot(page, '11-after-run');

      // Check for any output
      const outputEls = await page.locator('pre, code, .output, #output, .result, [class*="output"], [class*="result"]').allTextContents();
      console.log('All output elements:', JSON.stringify(outputEls));
      const outputText = outputEls.join('\n');

      // Also check the whole page text
      const pageText = await page.evaluate(() => document.body.innerText);
      console.log('Page text after run (last 2000 chars):', pageText.slice(-2000));

      const hasPlusOne = /isPlusOne\s*[=:]\s*true/i.test(outputText) || /isPlusOne.*true/i.test(outputText) ||
                         /isPlusOne\s*[=:]\s*true/i.test(pageText) || /isPlusOne.*true/i.test(pageText);
      console.log(`isPlusOne: true found: ${hasPlusOne}`);
      results.push({ test: 'PLUS1 with string type shows isPlusOne: true', passed: hasPlusOne, details: `Output: ${outputText.substring(0, 500)}` });
    } else {
      results.push({ test: 'PLUS1 with string type shows isPlusOne: true', passed: false, details: 'Run/Submit button not found' });
    }

    // -----------------------------------------------------------------------
    // TEST 6: Test with number type
    // -----------------------------------------------------------------------
    console.log('\n=== TEST 6: Test with number type ===');

    await page.reload({ waitUntil: 'networkidle' });
    await sleep(2000);

    // Find the toggle button for the first row
    const toggleBtn6 = page.locator('button:has-text("▾")').first();
    const tbCount6 = await toggleBtn6.count();
    console.log(`Toggle button found for number test: ${tbCount6 > 0}`);

    if (tbCount6 > 0) {
      // Click toggle to reveal type select
      await toggleBtn6.click();
      await sleep(500);
      await takeScreenshot(page, '12-toggle-for-number');

      // Change type to "number"
      const typeSelect = page.locator('select').first();
      const tsCount = await typeSelect.count();
      console.log(`Type select visible: ${tsCount > 0}`);

      if (tsCount > 0) {
        const currentVal = await typeSelect.inputValue();
        console.log(`Current type select value: "${currentVal}"`);
        await typeSelect.selectOption('number');
        await sleep(300);
        const newVal = await typeSelect.inputValue();
        console.log(`New type select value: "${newVal}"`);
        await takeScreenshot(page, '13-number-type-selected');

        // Set key (if there's a key input)
        const keyIn = page.locator('input[placeholder="key"]').first();
        if (await keyIn.count() > 0) {
          await keyIn.fill('myNum');
        }

        // Set value to 42
        const vInput = page.locator('input[placeholder="value"], textarea[placeholder="value"]').first();
        const vCount = await vInput.count();
        if (vCount > 0) {
          await vInput.fill('42');
          console.log('Set value to "42"');
        }
        await takeScreenshot(page, '14-number-value-set');

        // Run the toy
        const runBtn6 = page.locator('button[type="submit"], input[type="submit"]').first();
        let submitBtn6 = runBtn6;
        if (await runBtn6.count() === 0) {
          submitBtn6 = page.locator('button:has-text("Run"), button:has-text("Execute")').first();
        }

        if (await submitBtn6.count() > 0) {
          await submitBtn6.click();
          await sleep(2000);
          await takeScreenshot(page, '15-number-run-output');

          const output6 = await page.locator('pre, code, .output, #output, [class*="output"]').allTextContents();
          console.log('Number output elements:', JSON.stringify(output6));
          const outputStr6 = output6.join('\n');
          const pageText6 = await page.evaluate(() => document.body.innerText);
          console.log('Page text after number run (last 2000):', pageText6.slice(-2000));

          // Check if 42 appears as numeric in JSON output (not "42" as string)
          const combinedOutput = outputStr6 + '\n' + pageText6;
          const hasNumeric42 = /"myNum"\s*:\s*42\b/.test(combinedOutput) || /:\s*42\b/.test(combinedOutput);
          const hasString42 = /"myNum"\s*:\s*"42"/.test(combinedOutput);
          console.log(`Numeric 42 found: ${hasNumeric42}, String "42" found: ${hasString42}`);
          results.push({ test: 'Number type serialises as numeric 42 (not "42")', passed: hasNumeric42 && !hasString42, details: `Output snippet: ${combinedOutput.slice(-500)}` });
        } else {
          results.push({ test: 'Number type serialises as numeric 42 (not "42")', passed: false, details: 'Run button not found' });
        }
      } else {
        results.push({ test: 'Number type serialises as numeric 42 (not "42")', passed: false, details: 'Type select not visible after toggle click' });
      }
    } else {
      results.push({ test: 'Number type serialises as numeric 42 (not "42")', passed: false, details: 'Toggle button (▾) not found' });
    }

  } catch (err) {
    console.error('Test error:', err.message);
    console.error(err.stack);
    await takeScreenshot(page, 'error').catch(() => {});
    results.push({ test: 'Unexpected error', passed: false, details: err.message });
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
