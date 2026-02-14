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

/**
 * Generate the HTML for the external links bar using key/value entry style.
 * The links bar displays social and professional links:
 * - twitter: https://x.com/mattheard
 * - substack: https://somethinglikeamind.substack.com
 * - linkedin: https://www.linkedin.com/in/matthewjohnheard
 * - dott: https://ridedott.com
 *
 * @returns {string} HTML for the links bar component
 */
export function createLinksBar() {
  return `
    <div class="entry nav-entry">
      <div class="key">links</div>
      <p class="value metadata">
        <a href="https://x.com/mattheard" target="_blank" rel="noopener">twitter</a>,
        <a href="https://somethinglikeamind.substack.com" target="_blank" rel="noopener">substack</a>,
        <a href="https://www.linkedin.com/in/matthewjohnheard" target="_blank" rel="noopener">linkedin</a>,
        <a href="https://ridedott.com" target="_blank" rel="noopener">dott</a>
      </p>
    </div>
  `;
}
