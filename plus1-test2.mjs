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
    // TEST 1: Navigate to mattheard.net and locate PLUS1 toy
    // -----------------------------------------------------------------------
    console.log('\n=== TEST 1: Navigate to mattheard.net and find PLUS1 ===');
    await page.goto('https://mattheard.net', { waitUntil: 'networkidle' });
    await sleep(2000);
    await takeScreenshot(page, '01-homepage');

    // The PLUS1 toy appears directly on the homepage (not a separate page)
    // Check for the "toys" nav link to filter
    const navLinks = await page.locator('nav a, a').allTextContents();
    console.log('Nav links:', navLinks.slice(0, 20));

    // Try clicking "toys" nav link
    const toysNavLink = page.locator('a:has-text("toys"), a:has-text("Toys"), button:has-text("toys"), button:has-text("Toys")').first();
    const toysNavCount = await toysNavLink.count();
    console.log(`Toys nav link found: ${toysNavCount > 0}`);
    if (toysNavCount > 0) {
      await toysNavLink.click();
      await sleep(1000);
      await takeScreenshot(page, '02-toys-filter');
      console.log('Clicked toys filter');
    }

    // Find PLUS1 toy article/section
    // From the screenshot, PLUS1 is displayed as an article with "PLUS1" label
    const plus1Article = page.locator('text=PLUS1').first();
    const plus1Count = await plus1Article.count();
    console.log(`PLUS1 text found: ${plus1Count > 0}`);

    // Scroll PLUS1 into view
    if (plus1Count > 0) {
      await plus1Article.scrollIntoViewIfNeeded();
      await sleep(500);
    }
    await takeScreenshot(page, '03-plus1-visible');
    results.push({ test: 'PLUS1 toy found on page', passed: plus1Count > 0, details: `Found: ${plus1Count}` });

    // -----------------------------------------------------------------------
    // TEST 2: Confirm kv input with at least one row
    // -----------------------------------------------------------------------
    console.log('\n=== TEST 2: Confirm kv input with at least one row ===');

    // From screenshot: there's a "kv" dropdown (input type selector), Key and Value inputs,
    // a ▼ toggle button, and a + button
    // The kv editor is within the PLUS1 article

    // Find all inputs on page
    const allInputs = page.locator('input');
    const allInputCount = await allInputs.count();
    console.log(`Total inputs: ${allInputCount}`);

    for (let i = 0; i < Math.min(allInputCount, 10); i++) {
      const placeholder = await allInputs.nth(i).getAttribute('placeholder');
      const type = await allInputs.nth(i).getAttribute('type');
      const className = await allInputs.nth(i).getAttribute('class');
      console.log(`  Input ${i}: type="${type}" placeholder="${placeholder}" class="${className}"`);
    }

    // Look for Key and Value inputs (from screenshot they have placeholders "Key" and "Value")
    const keyInput = page.locator('input[placeholder="Key"]').first();
    const valueInput = page.locator('input[placeholder="Value"]').first();
    const keyCount = await keyInput.count();
    const valueCount = await valueInput.count();
    console.log(`Key input (placeholder="Key"): ${keyCount}`);
    console.log(`Value input (placeholder="Value"): ${valueCount}`);

    const hasKvRow = keyCount > 0 && valueCount > 0;
    results.push({ test: 'kv input shows at least one row (Key + Value inputs)', passed: hasKvRow, details: `Key: ${keyCount}, Value: ${valueCount}` });

    // -----------------------------------------------------------------------
    // TEST 3: Click the ▾ toggle button on a row
    // -----------------------------------------------------------------------
    console.log('\n=== TEST 3: Click ▾ toggle button ===');

    // From the screenshot, the toggle button shows "▼" (not "▾" - they look similar)
    // Let's check all buttons
    const allBtns = page.locator('button');
    const btnCount = await allBtns.count();
    console.log(`Total buttons: ${btnCount}`);
    for (let i = 0; i < Math.min(btnCount, 20); i++) {
      const text = await allBtns.nth(i).textContent();
      const className = await allBtns.nth(i).getAttribute('class');
      const isVisible = await allBtns.nth(i).isVisible();
      console.log(`  Button ${i}: "${text}" class="${className}" visible=${isVisible}`);
    }

    // The toggle button with ▾ or ▼ is next to the Value input
    // Try both triangle characters
    let toggleBtn = page.locator('button:has-text("▾"), button:has-text("▼"), button:has-text("▿")').first();
    let tCount = await toggleBtn.count();
    console.log(`Toggle button (▾/▼) found: ${tCount}`);

    if (tCount === 0) {
      // Try to find button with down-arrow unicode or class
      toggleBtn = page.locator('button').filter({ hasText: /[▾▼▿]/ }).first();
      tCount = await toggleBtn.count();
      console.log(`Toggle button (regex filter): ${tCount}`);
    }

    // Check visibility before toggle
    const selectsBefore = await page.locator('select').count();
    console.log(`Selects before toggle: ${selectsBefore}`);

    let toggleWorked = false;
    if (tCount > 0) {
      const toggleText = await toggleBtn.textContent();
      console.log(`Clicking toggle button with text: "${toggleText}"`);
      await toggleBtn.click();
      await sleep(700);
      await takeScreenshot(page, '04-after-toggle-click');

      const selectsAfter = await page.locator('select').count();
      console.log(`Selects after toggle: ${selectsAfter}`);

      // Check if the type select appeared (more selects than before)
      // Initially there's the "kv" dropdown (input type) and "text" dropdown (output type)
      // After clicking toggle, a type select for the row should appear
      toggleWorked = selectsAfter > selectsBefore;
      console.log(`New selects appeared: ${toggleWorked} (${selectsBefore} -> ${selectsAfter})`);
      results.push({ test: 'Toggle (▾) reveals type select', passed: toggleWorked, details: `Selects: ${selectsBefore} -> ${selectsAfter}` });
    } else {
      // List all selects to understand the structure
      const selectCount2 = await page.locator('select').count();
      console.log(`Select count: ${selectCount2}`);
      for (let i = 0; i < selectCount2; i++) {
        const opts = await page.locator('select').nth(i).locator('option').allTextContents();
        const val = await page.locator('select').nth(i).inputValue();
        console.log(`  Select ${i}: value="${val}" options=[${opts.join(', ')}]`);
      }
      results.push({ test: 'Toggle (▾) reveals type select', passed: false, details: 'Toggle button not found' });
    }

    // -----------------------------------------------------------------------
    // TEST 4: Verify type select has options: string, number, boolean, json
    // -----------------------------------------------------------------------
    console.log('\n=== TEST 4: Verify type select options ===');

    // After clicking toggle, find the new select that appeared
    const allSelects = page.locator('select');
    const allSelectCount = await allSelects.count();
    console.log(`All selects: ${allSelectCount}`);

    let typeSelectFound = false;
    for (let i = 0; i < allSelectCount; i++) {
      const opts = await allSelects.nth(i).locator('option').allTextContents();
      const val = await allSelects.nth(i).inputValue();
      console.log(`  Select ${i}: value="${val}" options=[${opts.join(', ')}]`);

      if (opts.some(o => /string/i.test(o)) && opts.some(o => /number/i.test(o))) {
        console.log(`  -> This is the type select!`);
        typeSelectFound = true;
        const hasString = opts.some(o => /string/i.test(o));
        const hasNumber = opts.some(o => /number/i.test(o));
        const hasBoolean = opts.some(o => /boolean/i.test(o));
        const hasJson = opts.some(o => /json/i.test(o));
        const allCorrect = hasString && hasNumber && hasBoolean && hasJson;
        results.push({
          test: 'Type select has string/number/boolean/json options',
          passed: allCorrect,
          details: `Options: ${opts.join(', ')}`
        });
        break;
      }
    }

    if (!typeSelectFound) {
      results.push({ test: 'Type select has string/number/boolean/json options', passed: false, details: 'Type select not found after toggle' });
    }

    // -----------------------------------------------------------------------
    // TEST 5: Test PLUS1 with string type
    // -----------------------------------------------------------------------
    console.log('\n=== TEST 5: Test PLUS1 with string type ===');

    // Reload to start fresh
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(2000);

    // Scroll to PLUS1
    const plus1Heading = page.locator('text=PLUS1').first();
    if (await plus1Heading.count() > 0) {
      await plus1Heading.scrollIntoViewIfNeeded();
      await sleep(500);
    }
    await takeScreenshot(page, '05-reloaded-plus1');

    // Fill in first row: key="sentence", value="Ich gehe nach Hause"
    const keyIn = page.locator('input[placeholder="Key"]').first();
    const valIn = page.locator('input[placeholder="Value"]').first();

    console.log(`Key input available: ${await keyIn.count() > 0}`);
    console.log(`Value input available: ${await valIn.count() > 0}`);

    if (await keyIn.count() > 0) {
      await keyIn.scrollIntoViewIfNeeded();
      await keyIn.click({ clickCount: 3 });
      await keyIn.fill('sentence');
      console.log('Set key = "sentence"');
    }

    if (await valIn.count() > 0) {
      await valIn.click({ clickCount: 3 });
      await valIn.fill('Ich gehe nach Hause');
      console.log('Set value = "Ich gehe nach Hause"');
    }

    await takeScreenshot(page, '06-first-row-filled');

    // Add a second row using the "+" button
    const addBtn = page.locator('button:has-text("+")').first();
    const addBtnCount = await addBtn.count();
    console.log(`"+" button found: ${addBtnCount > 0}`);

    if (addBtnCount > 0) {
      await addBtn.click();
      await sleep(500);
      console.log('Clicked + to add second row');
      await takeScreenshot(page, '07-second-row-added');

      // Fill in knownWords row
      const keyInputs = page.locator('input[placeholder="Key"]');
      const keyInputCount = await keyInputs.count();
      console.log(`Key inputs after add: ${keyInputCount}`);

      if (keyInputCount >= 2) {
        await keyInputs.nth(1).fill('knownWords');
        const valInputs = page.locator('input[placeholder="Value"]');
        const valInputCount = await valInputs.count();
        console.log(`Value inputs after add: ${valInputCount}`);

        if (valInputCount >= 2) {
          // Type knownWords value with newlines
          await valInputs.nth(1).click();
          // Use keyboard to type with Enter keys for newlines
          await page.keyboard.type('ich');
          await page.keyboard.press('Enter');
          await page.keyboard.type('gehe');
          await page.keyboard.press('Enter');
          await page.keyboard.type('nach');
          console.log('Set knownWords = "ich\\ngehe\\nnach"');
        }
      }
      await takeScreenshot(page, '08-second-row-filled');
    }

    // Click Submit
    const submitBtn = page.locator('button:has-text("Submit")').first();
    const submitCount = await submitBtn.count();
    console.log(`Submit button found: ${submitCount > 0}`);

    if (submitCount > 0) {
      await submitBtn.click();
      await sleep(3000);
      await takeScreenshot(page, '09-after-submit');

      // Get the output
      const pageText = await page.evaluate(() => document.body.innerText);
      const plus1Section = pageText.substring(pageText.indexOf('PLUS1'), pageText.indexOf('PLUS1') + 2000);
      console.log('PLUS1 section text:', plus1Section);

      // Check for isPlusOne: true
      const hasPlusOneTrue = /isPlusOne[^a-z]*true/i.test(pageText);
      console.log(`isPlusOne: true found: ${hasPlusOneTrue}`);
      results.push({ test: 'PLUS1 with string type shows isPlusOne: true', passed: hasPlusOneTrue, details: `Section: ${plus1Section.substring(0, 400)}` });
    } else {
      const allBtnTexts = await page.locator('button').allTextContents();
      console.log('All buttons:', allBtnTexts);
      results.push({ test: 'PLUS1 with string type shows isPlusOne: true', passed: false, details: 'Submit button not found' });
    }

    // -----------------------------------------------------------------------
    // TEST 6: Test number type
    // -----------------------------------------------------------------------
    console.log('\n=== TEST 6: Test with number type ===');

    // Reload fresh
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(2000);

    // Scroll to PLUS1
    const plus1Heading6 = page.locator('text=PLUS1').first();
    if (await plus1Heading6.count() > 0) {
      await plus1Heading6.scrollIntoViewIfNeeded();
      await sleep(500);
    }

    // Fill key first
    const keyIn6 = page.locator('input[placeholder="Key"]').first();
    if (await keyIn6.count() > 0) {
      await keyIn6.fill('testNumber');
    }

    // Click the toggle button (▾ or ▼)
    const toggleBtn6 = page.locator('button:has-text("▾"), button:has-text("▼"), button:has-text("▿")').first();
    const tCount6 = await toggleBtn6.count();
    console.log(`Toggle button for number test: ${tCount6 > 0}`);

    if (tCount6 > 0) {
      await toggleBtn6.click();
      await sleep(500);
      await takeScreenshot(page, '10-toggle-for-number');

      // Find the type select that appeared (not the input-type or output-type selects)
      const allSelects6 = page.locator('select');
      const selectCount6 = await allSelects6.count();
      console.log(`Selects after toggle: ${selectCount6}`);

      let typeSelectIdx = -1;
      for (let i = 0; i < selectCount6; i++) {
        const opts = await allSelects6.nth(i).locator('option').allTextContents();
        console.log(`  Select ${i}: options=[${opts.join(', ')}]`);
        if (opts.some(o => /^number$/i.test(o.trim()))) {
          typeSelectIdx = i;
          break;
        }
      }

      console.log(`Type select index: ${typeSelectIdx}`);

      if (typeSelectIdx >= 0) {
        const typeSelect = allSelects6.nth(typeSelectIdx);
        await typeSelect.selectOption('number');
        await sleep(300);
        const newVal = await typeSelect.inputValue();
        console.log(`Type select now: "${newVal}"`);
        await takeScreenshot(page, '11-number-type-selected');

        // Set value to 42
        const valIn6 = page.locator('input[placeholder="Value"]').first();
        if (await valIn6.count() > 0) {
          await valIn6.fill('42');
          console.log('Set value = "42"');
        }
        await takeScreenshot(page, '12-value-42-set');

        // Submit
        const submitBtn6 = page.locator('button:has-text("Submit")').first();
        if (await submitBtn6.count() > 0) {
          await submitBtn6.click();
          await sleep(3000);
          await takeScreenshot(page, '13-number-output');

          const pageText6 = await page.evaluate(() => document.body.innerText);
          const plus1Section6 = pageText6.substring(pageText6.indexOf('PLUS1'), pageText6.indexOf('PLUS1') + 3000);
          console.log('Output section:', plus1Section6.substring(0, 1000));

          // Check JSON-like output for numeric 42 vs "42"
          // The output area might show JSON or text
          // Look for "testNumber": 42 vs "testNumber": "42"
          const hasNumeric = /"testNumber"\s*:\s*42\b/.test(plus1Section6) || /testNumber[^"]*42\b/.test(plus1Section6);
          const hasStringed = /"testNumber"\s*:\s*"42"/.test(plus1Section6);
          console.log(`Numeric 42: ${hasNumeric}, Stringed "42": ${hasStringed}`);

          // Also check if input field coerces - look in the whole page
          const preElements = await page.locator('pre, code').allTextContents();
          console.log('pre/code elements:', preElements);

          results.push({
            test: 'Number type serialises as numeric 42',
            passed: hasNumeric && !hasStringed,
            details: `Output: ${plus1Section6.substring(0, 600)}`
          });
        } else {
          results.push({ test: 'Number type serialises as numeric 42', passed: false, details: 'Submit not found' });
        }
      } else {
        results.push({ test: 'Number type serialises as numeric 42', passed: false, details: `Type select with "number" option not found. Select count: ${selectCount6}` });
      }
    } else {
      results.push({ test: 'Number type serialises as numeric 42', passed: false, details: 'Toggle button not found' });
    }

  } catch (err) {
    console.error('Test error:', err.message);
    console.error(err.stack);
    await takeScreenshot(page, 'error').catch(() => {});
    results.push({ test: 'Unexpected error', passed: false, details: err.message });
  } finally {
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
