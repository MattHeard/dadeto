/**
 * Generate the HTML for the filter navbar.
 * The navbar provides three filter options:
 * - Everything: Shows all articles
 * - Blog: Shows only blog posts (hides toys with tag-toy)
 * - Toys: Shows only interactive toys
 *
 * @returns {string} HTML for the navbar component
 */
export function createNavbar() {
  return `
    <nav id="navbar">
      <div class="navbar-content">
        <button class="filter-button active" data-filter="all">Everything</button>
        <button class="filter-button" data-filter="blog">Blog</button>
        <button class="filter-button" data-filter="toys">Toys</button>
      </div>
    </nav>
  `;
}
