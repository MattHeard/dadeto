/**
 * Generate the HTML for the filter navbar using key/value entry style.
 * The navbar provides three filter options:
 * - everything: Shows all articles
 * - blog: Shows only blog posts (hides toys with tag-toy)
 * - toys: Shows only interactive toys
 *
 * @returns {string} HTML for the navbar component
 */
export function createNavbar() {
  return `
    <div class="entry nav-entry">
      <div class="key">nav</div>
      <p class="value metadata">
        <a class="filter-button active" data-filter="all">everything</a>,
        <a class="filter-button" data-filter="blog">blog</a>,
        <a class="filter-button" data-filter="toys">toys</a>
      </p>
    </div>
  `;
}
