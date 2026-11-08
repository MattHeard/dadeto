/**
 * Contains the ASCII art banner for the blog header
 * @module title
 */

/**
 * ASCII art banner for the blog header
 * @returns {string} Header banner HTML.
 */
export function headerBanner() {
  return `<pre class="header-banner" aria-label="Matt Heard" role="heading" aria-level="1">
▗▖  ▗▖ ▗▄▖▗▄▄▄▖▗▄▄▄▖
▐▛▚▞▜▌▐▌ ▐▌ █    █
▐▌  ▐▌▐▛▀▜▌ █    █
▐▌  ▐▌▐▌ ▐▌ █    █
▗▖ ▗▖▗▄▄▄▖ ▗▄▖ ▗▄▄▖ ▗▄▄▄
▐▌ ▐▌▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌  █
▐▛▀▜▌▐▛▀▀▘▐▛▀▜▌▐▛▀▚▖▐▌  █
▐▌ ▐▌▐▙▄▄▖▐▌ ▐▌▐▌ ▐▌▐▙▄▄▀
</pre>`;
}

/**
 * Create the title wrapper handle.
 * @returns {{ headerBanner: typeof headerBanner }} Title exports.
 */
export function createTitleHandle() {
  return { headerBanner };
}
