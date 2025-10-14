import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const sharedLinks = [
  { name: 'New story', href: '/new-story.html' },
  { name: 'Moderate', href: '/mod.html' },
  { name: 'Stats', href: '/stats.html' },
  { name: 'About', href: '/about.html' },
];

const mobileGroups = [
  { heading: 'Write', links: [{ name: 'New story', href: '/new-story.html' }] },
  {
    heading: 'Moderation',
    links: [
      { name: 'Moderate', href: '/mod.html' },
      { name: 'Stats', href: '/stats.html' },
    ],
  },
  { heading: 'About', links: [{ name: 'About', href: '/about.html' }] },
];

export async function expectSharedChrome(page: Page) {
  const header = page.locator('header.site-header');
  await expect(header).toBeVisible();

  const brandLink = header.locator('a.brand');
  await expect(brandLink).toHaveAttribute('href', '/');
  await expect(brandLink).toContainText('Dendrite');

  const nav = header.locator('nav.nav-inline');
  for (const link of sharedLinks) {
    await expect(
      nav.getByRole('link', { name: link.name, exact: true }),
    ).toHaveAttribute('href', link.href);
  }

  const menuToggle = header.locator('button.menu-toggle');
  await expect(menuToggle).toHaveCount(1);

  const overlay = page.locator('#mobile-menu');
  await expect(overlay).toHaveAttribute('aria-hidden', 'true');

  for (const group of mobileGroups) {
    await expect(
      overlay.getByRole('heading', {
        level: 3,
        name: group.heading,
        includeHidden: true,
      }),
    ).toHaveCount(1);
    for (const link of group.links) {
      await expect(
        overlay.getByRole('link', { name: link.name, exact: true, includeHidden: true }),
      ).toHaveAttribute('href', link.href);
    }
  }

  await expect(
    overlay.getByRole('heading', { level: 3, name: 'Account', includeHidden: true }),
  ).toHaveCount(1);
}
