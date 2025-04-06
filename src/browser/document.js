// DOM helper functions
export const getElementById = (doc, id) => doc.getElementById(id);
export const querySelector = (el, selector) => el.querySelector(selector);
export const querySelectorAll = (docOrEl, selector) => docOrEl.querySelectorAll(selector);
export const getAudioElements = (doc) => querySelectorAll(doc, "audio");
export const removeControlsAttribute = (audio) => audio.removeAttribute("controls");
export const createElement = (doc, tag) => doc.createElement(tag);
export const createTextNode = (doc) => doc.createTextNode(" ");
export const addEventListener = (element, event, func) => element.addEventListener(event, func);
export const appendChild = (parentNode, newChild) => parentNode.appendChild(newChild);
export const insertBefore = (parentNode, newChild, refChild) => parentNode.insertBefore(newChild, refChild);

// Event handlers
export const stopDefault = (e) => e.preventDefault();
export const playAudio = (audio) => audio.play();
export const pauseAudio = (audio) => audio.pause();

// Console logging wrappers
export const log = (...args) => console.log(...args);
export const warn = (...args) => console.warn(...args);
export const error = (...args) => console.error(...args);

// DOM manipulation functions
export const addWarning = (outputElement) => {
  outputElement.parentElement.classList.add('warning');
};

export function hideArticlesByClass(className) {
  var articles = document.getElementsByTagName('article');
  for (var i = 0; i < articles.length; i++) {
    if (articles[i].classList.contains(className)) {
      articles[i].style.display = 'none';
    }
  }
}

export function toggleHideLink(link, className) {
  // Check if a span with the hide link already exists immediately after the link.
  if (link.nextElementSibling && link.nextElementSibling.classList.contains('hide-span')) {
    // Remove the span if it exists.
    link.nextElementSibling.remove();
  } else {
    // Create a new span element.
    var span = createElement(document, 'span');
    span.classList.add('hide-span');
    // Append the opening text node.
    appendChild(span, document.createTextNode(" ("));

    // Create the hide anchor element.
    var hideLink = createElement(document, 'a');
    hideLink.textContent = "hide";
    // Add click listener to trigger hideArticlesByClass.
    addEventListener(hideLink, 'click', function(event) {
      stopDefault(event);
      hideArticlesByClass(className);
    });
    appendChild(span, hideLink);
    // Append the closing text node.
    appendChild(span, document.createTextNode(")"));

    // Insert the span immediately after the link.
    insertBefore(link.parentNode, span, link.nextSibling);
  }
}


