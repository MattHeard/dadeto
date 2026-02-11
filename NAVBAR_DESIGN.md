# mattheard.net Navbar Design

## Overview
Add a persistent navbar at the top of mattheard.net with three filter buttons: "Everything", "Blog", "Toys". The navbar remains visible as users scroll and allows filtering of the chronological feed.

## Design Constraints
- Must match existing design: dark theme (#121212), cyan accents (#00FFFF, #33CCFF), monospace font (Sono/Consolas)
- No localStorage/persistence - filters reset on page reload
- Reuse existing tag filter logic from `src/core/browser/tags.js`
- Follow existing code patterns and style

## HTML Structure

```html
<nav id="navbar">
  <div class="navbar-content">
    <button class="filter-button active" data-filter="all">Everything</button>
    <button class="filter-button" data-filter="blog">Blog</button>
    <button class="filter-button" data-filter="toys">Toys</button>
  </div>
</nav>
```

### Design Rationale
- `<nav>` semantic element indicates navigation
- `data-filter` attribute stores filter type for JavaScript handlers
- `active` class highlights current filter selection
- `.navbar-content` wrapper allows consistent max-width with page content
- Simple button structure without extra wrappers

## CSS Styling

### Navbar Container
```css
#navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: #121212;
  border-bottom: 2px solid #00FFFF;
  z-index: 1000;
  padding: 1em 0;
}

#navbar .navbar-content {
  max-width: 85rch;
  margin: 0 auto;
  padding: 0 0.5em;
  display: flex;
  gap: 1em;
}
```

### Filter Buttons
```css
.filter-button {
  background-color: #121212;
  border: 2px solid #33CCFF;
  color: #33CCFF;
  font-family: "Sono", Consolas, monospace;
  font-size: 16px;
  padding: 0.5em 1em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-button:hover {
  border-color: #00FFFF;
  color: #00FFFF;
  text-decoration: underline;
}

.filter-button.active {
  background-color: #00FFFF;
  border-color: #00FFFF;
  color: #121212;
  font-weight: bold;
}
```

### Page Body Adjustment
```css
body {
  padding-top: 4.5em;
}
```

## Design Features

### Visual Hierarchy
- **Inactive buttons**: Cyan border (#33CCFF) on dark background
- **Hover state**: Brightens to full cyan (#00FFFF), underline for emphasis
- **Active button**: Inverts colors - cyan background with dark text
- Matches existing hover patterns (links use same color scheme)

### Spacing & Layout
- Navbar width matches #container (85rch max-width)
- Consistent padding with rest of page (0.5em sides)
- 1em gap between buttons
- 1em vertical padding for accessible click target
- Body gets top padding to prevent content hiding under fixed navbar

### Behavior
- Always visible (fixed positioning)
- Scrolls away as user scrolls down (allows focus on content)
- Persists at top when user scrolls back up
- z-index: 1000 ensures it stays above all content

## Filter Logic Integration

### Filter Types & Behavior
| Filter | Function Called | Behavior |
|--------|-----------------|----------|
| Everything | None (reset) | Show all articles (remove all hide classes) |
| Blog | hideArticlesByClass() | Hide articles with `tag-toy` class |
| Toys | hideArticlesWithoutClass() | Show only articles with `tag-toy` class |

### Implementation
```javascript
function createFilterButtonHandler(filterType, dom) {
  return () => {
    // Remove 'active' from all buttons
    const buttons = document.querySelectorAll('.filter-button');
    buttons.forEach(btn => btn.classList.remove('active'));

    // Find and activate clicked button
    const activeBtn = document.querySelector(`[data-filter="${filterType}"]`);
    activeBtn.classList.add('active');

    // Apply filter
    switch (filterType) {
      case 'all':
        resetFilters(dom);  // Show all articles
        break;
      case 'blog':
        hideArticlesByClass('tag-toy', dom);
        break;
      case 'toys':
        hideArticlesWithoutClass('tag-toy', dom);
        break;
    }
  };
}
```

## Integration Points

### 1. CSS Addition (src/build/styles.js)
Add navbar styles to the bottom of the `styles()` function return string

### 2. Navbar HTML Generation (new file: src/build/navbar.js)
Create function to generate navbar HTML:
```javascript
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
```

### 3. Generator Integration (src/build/generator.js)
Import navbar in `createHeaderContentArray()`:
```javascript
import { createNavbar } from './navbar.js';

function createHeaderContentArray(headerElement) {
  return [
    headElement(),
    '<body>',
    createNavbar(),  // Add navbar before container
    createContainerDivOpen(),
    '<!-- Header -->',
    headerElement,
  ];
}
```

### 4. Browser Event Handler (src/browser/main.js)
Add after `handleTagLinks(dom)`:
```javascript
initializeFilterButtons(dom);

function initializeFilterButtons(dom) {
  const buttons = document.querySelectorAll('.filter-button');
  buttons.forEach(button => {
    button.addEventListener('click', createFilterButtonHandler(button.dataset.filter, dom));
  });
}
```

## File Changes Summary

| File | Change | Reason |
|------|--------|--------|
| src/build/styles.js | Add navbar CSS | Style the navbar and buttons |
| src/build/navbar.js | Create new file | Generate navbar HTML |
| src/build/generator.js | Import navbar, add to header | Inject navbar into page |
| src/browser/main.js | Add filter button handlers | Wire up filter button click events |

## Visual Mockup
```
┌────────────────────────────────────────────┐
│ [Everything] [Blog] [Toys]                 │  ← Navbar (fixed at top)
├────────────────────────────────────────────┤
│                                            │
│  TWOW1  Two-Way Door Architecture         │
│  tags: vibe-coding, software-design...    │
│                                            │
│  [Article content...]                      │
│                                            │
├────────────────────────────────────────────┤
│  BEYO1  Beyond Repetition                 │
│  tags: camus, ritual, absurdism...        │
│                                            │
│  [Article content...]                      │
│                                            │
└────────────────────────────────────────────┘
```

## Future Enhancements (Not in MVP)
- Highlight active filter in navbar
- Smooth scroll to top when clicking filter
- Keyboard shortcuts for filters (e.g., Alt+E for Everything)
- URL state persistence (e.g., ?filter=toys)
- Animation when articles appear/disappear
