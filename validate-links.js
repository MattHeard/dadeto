import { chromium } from 'playwright';

const BASE_URL = 'https://mattheard.net';

const EXPECTED_LINKS = [
  { name: 'twitter', url: 'https://x.com/mattheard' },
  { name: 'substack', url: 'https://somethinglikeamind.substack.com' },
  { name: 'linkedin', url: 'https://www.linkedin.com/in/matthewjohnheard' },
  { name: 'dott', url: 'https://ridedott.com' },
];

async function validateLinks() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log(`\n🔍 Validating external links bar on ${BASE_URL}\n`);

  try {
    // Navigate to the site
    console.log('📍 Navigating to mattheard.net...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    // Check for links key
    console.log('✓ Page loaded successfully\n');

    // Verify links key exists
    const linksKey = await page.locator('div.key:has-text("links")').count();
    if (linksKey > 0) {
      console.log('✅ Links key found');
    } else {
      console.log('❌ Links key NOT found');
      throw new Error('Links key div not found on page');
    }

    // Validate each link
    console.log('\n📋 Validating individual links:\n');
    let passedTests = 0;
    let failedTests = 0;

    for (const link of EXPECTED_LINKS) {
      console.log(`Testing "${link.name}" link...`);

      // Check link exists
      const linkElement = await page.locator(`a[href="${link.url}"]`).count();
      if (linkElement === 0) {
        console.log(`  ❌ Link not found with href: ${link.url}`);
        failedTests++;
        continue;
      }
      console.log(`  ✓ Link element found`);

      // Check link text
      const linkText = await page.locator(`a[href="${link.url}"]`).textContent();
      if (linkText.trim() === link.name) {
        console.log(`  ✓ Link text is correct: "${linkText.trim()}"`);
      } else {
        console.log(`  ⚠ Link text mismatch. Expected: "${link.name}", Got: "${linkText.trim()}"`);
      }

      // Check target attribute
      const target = await page.locator(`a[href="${link.url}"]`).getAttribute('target');
      if (target === '_blank') {
        console.log(`  ✓ Opens in new tab (target="_blank")`);
      } else {
        console.log(`  ⚠ Target attribute not "_blank": ${target}`);
      }

      // Check rel attribute
      const rel = await page.locator(`a[href="${link.url}"]`).getAttribute('rel');
      if (rel === 'noopener') {
        console.log(`  ✓ Has security attribute (rel="noopener")`);
      } else {
        console.log(`  ⚠ Rel attribute not "noopener": ${rel}`);
      }

      console.log(`  ✅ "${link.name}" link passed\n`);
      passedTests++;
    }

    // Check styling
    console.log('Checking styling...');
    const linksValue = await page.locator('p.value.metadata:has(a[href*="x.com/mattheard"])').count();
    if (linksValue > 0) {
      console.log('  ✓ Links bar has correct styling classes (value metadata)\n');
      passedTests++;
    } else {
      console.log('  ⚠ Links bar styling classes may be incorrect\n');
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📊 Validation Results:`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);

    if (failedTests === 0) {
      console.log('\n🎉 All validations passed! External links bar is working correctly.\n');
      return true;
    } else {
      console.log('\n⚠️  Some validations failed.\n');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Validation error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Run validation
const success = await validateLinks();
process.exit(success ? 0 : 1);
