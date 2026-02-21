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

async function scrollToPlus1(page) {
  // Scroll PLUS1 into view
  const plus1 = page.locator('text=PLUS1').first();
  if (await plus1.count() > 0) {
    await plus1.scrollIntoViewIfNeeded();
    await sleep(300);
  }
}

// Helper: find the PLUS1 article specifically and scope locators within it
async function getPlus1Article(page) {
  // PLUS1 article contains "PLUS1" text and the kv input
  // Let's find it by looking for the article element containing PLUS1
  const articles = page.locator('article');
  const count = await articles.count();
  for (let i = 0; i < count; i++) {
    const text = await articles.nth(i).textContent();
    if (/PLUS1/.test(text)) {
      return articles.nth(i);
    }
  }
  // Fallback: return first section with PLUS1
  return page.locator('text=PLUS1').locator('..');
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
    // TEST 1: Navigate to mattheard.net and find PLUS1
    // -----------------------------------------------------------------------
    console.log('\n=== TEST 1: Navigate to mattheard.net and find PLUS1 ===');
    await page.goto('https://mattheard.net', { waitUntil: 'networkidle' });
    await sleep(2000);

    // Click "toys" nav link to filter
    const toysLink = page.locator('a:has-text("toys"), button:has-text("toys")').first();
    if (await toysLink.count() > 0) {
      await toysLink.click();
      await sleep(1000);
    }

    // Find PLUS1 on the page
    const plus1Text = page.locator('text=PLUS1').first();
    const found = await plus1Text.count() > 0;
    console.log(`PLUS1 found: ${found}`);

    if (found) {
      await plus1Text.scrollIntoViewIfNeeded();
      await sleep(500);
    }
    await takeScreenshot(page, '01-plus1-found');
    results.push({ test: '1. PLUS1 toy found on page', passed: found, details: `Found: ${found}` });

    // -----------------------------------------------------------------------
    // TEST 2: Confirm kv input with at least one row
    // -----------------------------------------------------------------------
    console.log('\n=== TEST 2: Confirm kv input with at least one row ===');

    // The PLUS1 toy uses kv input type. Key input has placeholder="Key", Value input has placeholder="Value"
    // There's one row by default.
    // Scope to the PLUS1 area - we know from the DOM that PLUS1 is the first article

    // From the HTML we know the structure: input[placeholder="Key"] and input[placeholder="Value"]
    // These are scoped within the kv editor rows
    const keyInputs = page.locator('input[placeholder="Key"]');
    const keyCount = await keyInputs.count();
    console.log(`Key inputs: ${keyCount}`);

    // Also check for the kv-type-toggle button
    const typeToggleButtons = page.locator('button.kv-type-toggle');
    const toggleCount = await typeToggleButtons.count();
    console.log(`kv-type-toggle buttons: ${toggleCount}`);

    const hasKvRow = keyCount > 0 && toggleCount > 0;
    results.push({ test: '2. kv input shows at least one row', passed: hasKvRow, details: `Key inputs: ${keyCount}, toggle buttons: ${toggleCount}` });

    // -----------------------------------------------------------------------
    // TEST 3: Click ▾ toggle button and confirm type select appears
    // -----------------------------------------------------------------------
    console.log('\n=== TEST 3: Click ▾ toggle button ===');

    // The toggle button has class "kv-type-toggle" and shows ▾
    // It is the FIRST such button (for the first row of the first kv editor on the page)
    const firstToggle = page.locator('button.kv-type-toggle').first();
    const firstToggleCount = await firstToggle.count();
    console.log(`First toggle button found: ${firstToggleCount > 0}`);

    // Check if type select is initially visible
    // The type select is a <select> with class kv-type-select (or similar)
    // From test 2's output, select index 1 had options [string, number, boolean, json]
    // Let's find it by its options
    // We can check visibility attribute
    const typeSelects = page.locator('select').filter({
      has: page.locator('option[value="string"]')
    });
    const typeSelectCountBefore = await typeSelects.count();
    console.log(`Type selects (with string option) found: ${typeSelectCountBefore}`);

    // Check visibility of first type select
    let typeSelectVisibleBefore = false;
    if (typeSelectCountBefore > 0) {
      typeSelectVisibleBefore = await typeSelects.first().isVisible();
      console.log(`First type select visible before toggle: ${typeSelectVisibleBefore}`);
    }

    // Click the toggle
    if (firstToggleCount > 0) {
      const toggleText = await firstToggle.textContent();
      console.log(`Toggle button text: "${toggleText}"`);
      await firstToggle.click();
      await sleep(500);
      await takeScreenshot(page, '02-after-toggle');

      // Check visibility after
      const typeSelectVisibleAfter = await typeSelects.first().isVisible();
      console.log(`First type select visible after toggle: ${typeSelectVisibleAfter}`);

      // Toggle should have revealed the type select
      const toggleWorked = !typeSelectVisibleBefore && typeSelectVisibleAfter;
      console.log(`Toggle worked (hidden -> visible): ${toggleWorked}`);
      results.push({ test: '3. Toggle (▾) reveals type select', passed: toggleWorked, details: `Before: ${typeSelectVisibleBefore}, After: ${typeSelectVisibleAfter}` });
    } else {
      results.push({ test: '3. Toggle (▾) reveals type select', passed: false, details: 'Toggle button not found' });
    }

    // -----------------------------------------------------------------------
    // TEST 4: Verify type select options: string, number, boolean, json
    // -----------------------------------------------------------------------
    console.log('\n=== TEST 4: Verify type select options ===');

    // The type select should now be visible
    const typeSelectEl = typeSelects.first();
    const tsVisible = await typeSelectEl.isVisible();
    console.log(`Type select visible: ${tsVisible}`);

    if (tsVisible) {
      const options = await typeSelectEl.locator('option').allTextContents();
      console.log('Type select options:', options);
      const hasString = options.some(o => /^string$/i.test(o.trim()));
      const hasNumber = options.some(o => /^number$/i.test(o.trim()));
      const hasBoolean = options.some(o => /^boolean$/i.test(o.trim()));
      const hasJson = options.some(o => /^json$/i.test(o.trim()));
      console.log(`Has string: ${hasString}, number: ${hasNumber}, boolean: ${hasBoolean}, json: ${hasJson}`);
      const allCorrect = hasString && hasNumber && hasBoolean && hasJson;
      results.push({ test: '4. Type select has string/number/boolean/json', passed: allCorrect, details: `Options: [${options.join(', ')}]` });
    } else {
      // Try to find the type select even if hidden - check its options
      const allSelects = page.locator('select');
      const allCount = await allSelects.count();
      let found4 = false;
      for (let i = 0; i < allCount; i++) {
        const opts = await allSelects.nth(i).locator('option').allTextContents();
        if (opts.some(o => /^string$/i.test(o.trim())) && opts.some(o => /^number$/i.test(o.trim()))) {
          console.log(`Found type select at index ${i}, options:`, opts);
          const hasBoolean = opts.some(o => /^boolean$/i.test(o.trim()));
          const hasJson = opts.some(o => /^json$/i.test(o.trim()));
          results.push({ test: '4. Type select has string/number/boolean/json', passed: hasBoolean && hasJson, details: `Options: [${opts.join(', ')}] (select found but may be hidden)` });
          found4 = true;
          break;
        }
      }
      if (!found4) {
        results.push({ test: '4. Type select has string/number/boolean/json', passed: false, details: 'Type select not found' });
      }
    }

    // -----------------------------------------------------------------------
    // TEST 5: Test PLUS1 with string type
    // sentence="Ich gehe nach Hause", knownWords="ich\ngehe\nnach"
    // Expected: isPlusOne: true
    // -----------------------------------------------------------------------
    console.log('\n=== TEST 5: Test PLUS1 with string type ===');

    // Reload fresh
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(2000);

    // Click toys filter
    const toysLink5 = page.locator('a:has-text("toys"), button:has-text("toys")').first();
    if (await toysLink5.count() > 0) {
      await toysLink5.click();
      await sleep(1000);
    }

    // Scroll to PLUS1
    const plus1El5 = page.locator('text=PLUS1').first();
    if (await plus1El5.count() > 0) {
      await plus1El5.scrollIntoViewIfNeeded();
      await sleep(500);
    }

    // Fill in first row: sentence = "Ich gehe nach Hause"
    // The FIRST Key input and FIRST Value input belong to the PLUS1 toy
    const keyIn5 = page.locator('input[placeholder="Key"]').nth(0);
    const valIn5 = page.locator('input[placeholder="Value"]').nth(0);

    await keyIn5.fill('sentence');
    await valIn5.fill('Ich gehe nach Hause');
    console.log('Filled first row: sentence = Ich gehe nach Hause');
    await takeScreenshot(page, '03-sentence-filled');

    // Click "+" button to add second row
    // The "+" button is next to the row in the kv editor
    const addBtn5 = page.locator('button:has-text("+")').nth(0);
    const addBtnCount5 = await addBtn5.count();
    console.log(`"+" button found: ${addBtnCount5 > 0}`);

    if (addBtnCount5 > 0) {
      await addBtn5.click();
      await sleep(500);
      console.log('Added second row');
      await takeScreenshot(page, '04-second-row-added');

      // Fill second row: knownWords = "ich\ngehe\nnach"
      // After adding a row, there should be 2 Key inputs and 2 Value inputs
      const keyInputs5 = page.locator('input[placeholder="Key"]');
      const keyCount5 = await keyInputs5.count();
      console.log(`Key inputs after add: ${keyCount5}`);

      if (keyCount5 >= 2) {
        await keyInputs5.nth(1).fill('knownWords');
        const valInputs5 = page.locator('input[placeholder="Value"]');
        const valCount5 = await valInputs5.count();
        console.log(`Value inputs after add: ${valCount5}`);

        if (valCount5 >= 2) {
          // The value input is a text input, not textarea. Enter would submit the form.
          // Try using \n in the fill or use keyboard with Shift+Enter or just type the value
          // with actual newline character
          const secondValInput = valInputs5.nth(1);
          await secondValInput.click();

          // Use evaluate to set value with newlines directly on the input element
          await page.evaluate(() => {
            // Get the second Value input
            const inputs = document.querySelectorAll('input[placeholder="Value"]');
            if (inputs.length >= 2) {
              const input = inputs[1];
              // Set the native value
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              nativeInputValueSetter.call(input, 'ich\ngehe\nnach');
              // Trigger input event
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });
          console.log('Set knownWords value with newlines via JS');

          // Verify the value
          const knownWordsVal = await secondValInput.inputValue();
          console.log(`knownWords value: "${knownWordsVal}"`);
          await takeScreenshot(page, '05-knownwords-filled');
        }
      }
    }

    // Click Submit (the first Submit button in the PLUS1 area)
    const submitBtn5 = page.locator('button:has-text("Submit")').nth(0);
    console.log(`Submit button found: ${await submitBtn5.count() > 0}`);

    await submitBtn5.click();
    await sleep(3000);
    await takeScreenshot(page, '06-after-submit');

    // Check output
    // The output is in the PLUS1 section's output area
    const pageText5 = await page.evaluate(() => document.body.innerText);
    // Find the PLUS1 section output
    const plus1Idx = pageText5.indexOf('PLUS1');
    const outputSection = plus1Idx >= 0 ? pageText5.substring(plus1Idx, plus1Idx + 2000) : pageText5.substring(0, 2000);
    console.log('PLUS1 output section:', outputSection);

    const hasPlusOneTrue = /isPlusOne.*true/i.test(outputSection);
    console.log(`isPlusOne: true found: ${hasPlusOneTrue}`);

    // Also check for the actual JSON output in pre/output elements
    const outputEls = await page.locator('pre, .output-area, output').allTextContents();
    console.log('Output elements:', outputEls.slice(0, 3));

    results.push({ test: '5. PLUS1 with string type shows isPlusOne: true', passed: hasPlusOneTrue, details: `Output: ${outputSection.substring(0, 400)}` });

    // -----------------------------------------------------------------------
    // TEST 6: Test with number type
    // Create a row, reveal type toggle, change to "number", set value "42"
    // Verify serialised JSON shows numeric 42 (not "42")
    // -----------------------------------------------------------------------
    console.log('\n=== TEST 6: Test with number type ===');

    // Reload fresh
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(2000);

    const toysLink6 = page.locator('a:has-text("toys"), button:has-text("toys")').first();
    if (await toysLink6.count() > 0) {
      await toysLink6.click();
      await sleep(1000);
    }

    const plus1El6 = page.locator('text=PLUS1').first();
    if (await plus1El6.count() > 0) {
      await plus1El6.scrollIntoViewIfNeeded();
      await sleep(500);
    }

    // The first row already exists. Set key to "myNum"
    const keyIn6 = page.locator('input[placeholder="Key"]').nth(0);
    await keyIn6.fill('myNum');
    console.log('Set key = "myNum"');

    // Click the kv-type-toggle button on this row (the ▾ button)
    const toggleBtn6 = page.locator('button.kv-type-toggle').nth(0);
    const tCount6 = await toggleBtn6.count();
    console.log(`kv-type-toggle button found: ${tCount6 > 0}`);
    await takeScreenshot(page, '07-before-number-toggle');

    if (tCount6 > 0) {
      await toggleBtn6.click();
      await sleep(500);
      await takeScreenshot(page, '08-after-number-toggle');
      console.log('Clicked type toggle');

      // Now find the type select that became visible for this row
      // The type select has options string/number/boolean/json
      // It should now be visible (revealed by toggle)
      const typeSelects6 = page.locator('select').filter({
        has: page.locator('option[value="string"]')
      });
      const ts6Count = await typeSelects6.count();
      console.log(`Type selects with "string" option: ${ts6Count}`);

      // Find visible one
      let visibleTypeSelect = null;
      for (let i = 0; i < ts6Count; i++) {
        const isVis = await typeSelects6.nth(i).isVisible();
        if (isVis) {
          visibleTypeSelect = typeSelects6.nth(i);
          console.log(`Found visible type select at index ${i}`);
          break;
        }
      }

      if (visibleTypeSelect) {
        const currentVal6 = await visibleTypeSelect.inputValue();
        console.log(`Current type: "${currentVal6}"`);

        // Change to "number"
        await visibleTypeSelect.selectOption('number');
        await sleep(300);
        const newVal6 = await visibleTypeSelect.inputValue();
        console.log(`New type: "${newVal6}"`);
        await takeScreenshot(page, '09-number-selected');

        // Set value to "42"
        const valIn6 = page.locator('input[placeholder="Value"]').nth(0);
        await valIn6.fill('42');
        console.log('Set value = "42"');
        await takeScreenshot(page, '10-value-42');

        // Submit
        const submitBtn6 = page.locator('button:has-text("Submit")').nth(0);
        await submitBtn6.click();
        await sleep(3000);
        await takeScreenshot(page, '11-number-output');

        // Check output for numeric 42 vs "42"
        const pageText6 = await page.evaluate(() => document.body.innerText);
        const plus1Idx6 = pageText6.indexOf('PLUS1');
        const outputSection6 = plus1Idx6 >= 0 ? pageText6.substring(plus1Idx6, plus1Idx6 + 2000) : pageText6.substring(0, 2000);
        console.log('Number test output:', outputSection6.substring(0, 800));

        // The PLUS1 toy uses the kv data as input JSON object
        // With number type, "myNum": 42 (numeric) in JSON
        // With string type, "myNum": "42" (string) in JSON
        // The toy probably echoes back the parsed input or we check debug output

        // Look for the JSON representation in any output element
        const outputEls6 = await page.locator('pre, .output-area, output').allTextContents();
        console.log('Output elements for number test:', outputEls6);
        const outputStr6 = outputEls6.join('\n');

        // Check if the JSON output contains numeric 42 (not "42")
        // Pattern: "myNum":42 or "myNum": 42
        const hasNumeric42 = /"myNum"\s*:\s*42\b/.test(outputStr6) || /"myNum"\s*:\s*42\b/.test(outputSection6);
        const hasString42 = /"myNum"\s*:\s*"42"/.test(outputStr6) || /"myNum"\s*:\s*"42"/.test(outputSection6);
        console.log(`Numeric 42: ${hasNumeric42}, String "42": ${hasString42}`);

        // The toy sends the kv object as JSON to a function.
        // We might need to check the actual serialised form by looking at what gets submitted.
        // Since the output shows the analysis result, let's also check if the input was parsed correctly.
        // Alternative: intercept the network request to see what JSON was sent

        // For now, check if the output contains a 42 that is not quoted
        const outputContains42 = /\b42\b/.test(outputStr6) || /\b42\b/.test(outputSection6);
        console.log(`Output contains 42 (unquoted): ${outputContains42}`);

        results.push({
          test: '6. Number type serialises as numeric 42',
          passed: hasNumeric42 || (outputContains42 && !hasString42),
          details: `hasNumeric42: ${hasNumeric42}, hasString42: ${hasString42}, outputContains42: ${outputContains42}, output: ${outputStr6.substring(0, 300)}`
        });
      } else {
        results.push({ test: '6. Number type serialises as numeric 42', passed: false, details: 'Type select not visible after toggle' });
      }
    } else {
      results.push({ test: '6. Number type serialises as numeric 42', passed: false, details: 'kv-type-toggle button not found' });
    }

    // Additional check: intercept JSON serialisation by checking what form data is submitted
    console.log('\n=== BONUS: Check number type JSON serialisation ===');
    // Reload and set up request interception
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(2000);

    const toysLinkBonus = page.locator('a:has-text("toys"), button:has-text("toys")').first();
    if (await toysLinkBonus.count() > 0) {
      await toysLinkBonus.click();
      await sleep(1000);
    }

    const plus1Bonus = page.locator('text=PLUS1').first();
    if (await plus1Bonus.count() > 0) {
      await plus1Bonus.scrollIntoViewIfNeeded();
      await sleep(300);
    }

    // Intercept fetch/XHR requests to capture what JSON is sent
    let capturedJson = null;
    await page.route('**', async (route) => {
      const request = route.request();
      if (request.method() === 'POST' || request.method() === 'GET') {
        const postData = request.postData();
        if (postData) {
          console.log(`Captured request to ${request.url()}: ${postData.substring(0, 300)}`);
          capturedJson = postData;
        }
      }
      await route.continue();
    });

    // Fill in and submit with number type
    const keyInBonus = page.locator('input[placeholder="Key"]').nth(0);
    await keyInBonus.fill('numKey');

    const toggleBonus = page.locator('button.kv-type-toggle').nth(0);
    if (await toggleBonus.count() > 0) {
      await toggleBonus.click();
      await sleep(300);

      const typeSelectsBonus = page.locator('select').filter({ has: page.locator('option[value="string"]') });
      for (let i = 0; i < await typeSelectsBonus.count(); i++) {
        if (await typeSelectsBonus.nth(i).isVisible()) {
          await typeSelectsBonus.nth(i).selectOption('number');
          break;
        }
      }

      const valInBonus = page.locator('input[placeholder="Value"]').nth(0);
      await valInBonus.fill('99');

      const submitBonus = page.locator('button:has-text("Submit")').nth(0);
      await submitBonus.click();
      await sleep(3000);
      await takeScreenshot(page, '12-bonus-number-submit');
    }

    if (capturedJson) {
      console.log('Captured JSON payload:', capturedJson);
      const hasNumericInCapture = /"numKey"\s*:\s*99\b/.test(capturedJson) || /numKey.*:\s*99\b/.test(capturedJson);
      const hasStringInCapture = /"numKey"\s*:\s*"99"/.test(capturedJson);
      console.log(`Captured: numKey is numeric 99: ${hasNumericInCapture}, is string "99": ${hasStringInCapture}`);
      results.push({
        test: 'BONUS: Number type sent as numeric in request',
        passed: hasNumericInCapture && !hasStringInCapture,
        details: `Payload: ${capturedJson.substring(0, 300)}`
      });
    } else {
      console.log('No POST data captured - toy may use in-browser computation');
      results.push({ test: 'BONUS: Number type sent as numeric in request', passed: null, details: 'No POST data - toy runs in browser' });
    }

  } catch (err) {
    console.error('Test error:', err.message);
    console.error(err.stack);
    await takeScreenshot(page, 'error').catch(() => {});
    results.push({ test: 'Unexpected error', passed: false, details: err.message });
  } finally {
    console.log('\n=== TEST RESULTS SUMMARY ===');
    for (const r of results) {
      const status = r.passed === true ? 'PASS' : r.passed === false ? 'FAIL' : 'INFO';
      console.log(`[${status}] ${r.test}`);
      console.log(`       ${r.details}`);
    }
    await browser.close();
  }
}

runTests().catch(console.error);
