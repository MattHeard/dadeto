/** @typedef {import('./browser-core.js').DOMEventListener} DOMEventListener */
/** @typedef {(entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void} IntersectionObserverCallback */
/**
 * @callback ModuleSuccessHandler
 * @param {*} module - Loaded module.
 * @returns {void}
 */

/**
 * @callback ModuleErrorHandler
 * @param {*} error - Error from dynamic import.
 * @returns {void}
 */

/**
 * Helper describing the shared DOM helper contract backed by `src/browser/document.js`.
 * @typedef {object} DOMHelpers
 * @property {(modulePath: string, onSuccess: ModuleSuccessHandler, onError: ModuleErrorHandler) => void} importModule - Load a module by path.
 * @property {(callback: IntersectionObserverCallback) => IntersectionObserver} makeIntersectionObserver - Create a shared intersection observer.
 * @property {(element: HTMLInputElement | HTMLButtonElement, type: string) => void} setType - Set the input type.
 * @property {(element: HTMLInputElement | HTMLTextAreaElement, placeholder: string) => void} setPlaceholder - Update placeholder text.
 * @property {(element: HTMLElement, name: string, value: string) => void} setDataAttribute - Assign a data attribute.
 * @property {(element: HTMLElement, name: string) => string | undefined} getDataAttribute - Read a data attribute.
 * @property {(element: HTMLElement, className: string) => void} addClass - Add a class name.
 * @property {(element: HTMLElement, className: string) => void} removeClass - Remove a class name.
 * @property {(target: EventTarget, event: string, handler: DOMEventListener) => void} removeEventListener - Remove a listener by event.
 * @property {(options: { dom: DOMHelpers; el: EventTarget; event: string; handler: DOMEventListener }) => () => void} createRemoveListener - Build a disposer for listeners.
 * @property {(parentNode: Node, newChild: Node) => Node} appendChild - Append a child node.
 * @property {(value: string) => Text} createTextNode - Create a text node.
 * @property {(tagName: string) => HTMLCollection} getElementsByTagName - Fetch elements by tag.
 * @property {(selector: string) => NodeList} querySelectorAll - Query all matching elements.
 * @property {(el: Element) => string[]} getClasses - List class names.
 * @property {() => number} getRandomNumber - Return a random number.
 * @property {() => string} getCurrentTime - Return the current time string.
 * @property {(element: HTMLElement, cls: string) => boolean} hasClass - Check for a class name.
 * @property {(link: Element, cls: string) => boolean | undefined} hasNextSiblingClass - Check next sibling class.
 * @property {(element: HTMLElement) => void} hide - Hide an element.
 * @property {(parentNode: Node, newChild: Node, refChild: Node | null) => Node} insertBefore - Insert a node before a reference.
 * @property {(...args: unknown[]) => void} log - Log info output.
 * @property {(audio: HTMLMediaElement) => void} pauseAudio - Pause an audio element.
 * @property {(audio: HTMLMediaElement) => void} playAudio - Play an audio element.
 * @property {(tag: string) => HTMLElement} createElement - Create an element by tag.
 * @property {(audio: HTMLMediaElement) => void} removeControlsAttribute - Remove audio controls.
 * @property {(element: HTMLElement, className: string) => void} setClassName - Set the element class attribute.
 * @property {() => HTMLCollection} getAudioElements - Fetch audio elements.
 * @property {(element: HTMLElement, content: string) => void} setTextContent - Set text content.
 * @property {(event: Event) => void} stopDefault - Prevent default behavior.
 * @property {(parent: HTMLElement) => void} addWarning - Add a warning class.
 * @property {(element: EventTarget, event: string, func: (event: Event) => void) => void} addEventListener - Attach an event listener.
 * @property {(link: Element) => void} removeNextSibling - Remove a sibling element.
 * @property {(input: HTMLElement) => void} enable - Enable a control.
 * @property {(input: HTMLElement) => void} disable - Disable a control.
 * @property {(parentNode: Node, child: Node) => void} removeChild - Remove a child node.
 * @property {(outputElement: HTMLElement) => void} removeWarning - Remove warning styling.
 * @property {(el: HTMLElement, selector: string) => HTMLElement | null} querySelector - Query within a container.
 * @property {(observer: IntersectionObserver) => void} disconnectObserver - Disconnect an observer.
 * @property {(entry: IntersectionObserverEntry) => boolean} isIntersecting - Check entry visibility.
 * @property {(...args: unknown[]) => void} logError - Log error output.
 * @property {(...args: unknown[]) => void} error - Alias to error logging.
 * @property {(parent: Node, child: Node) => boolean} contains - Check descendant containment.
 * @property {(element: HTMLElement) => void} removeAllChildren - Remove all children.
 * @property {(event: Event) => EventTarget} getCurrentTarget - Read current event target.
 * @property {(element: Node) => Node | null} getNextSibling - Fetch the next sibling node.
 * @property {(element: Element) => Element | null} getParentElement - Fetch the parent element.
 * @property {(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLOptionElement, value: string | number | boolean | string[] | FileList) => void} setValue - Set input value.
 * @property {(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLOptionElement) => string | number | boolean | string[] | FileList} getValue - Read input value.
 * @property {(event: Event & { target: { value: string } }) => string} getTargetValue - Read target value.
 * @property {(event: Event & { target: { value: string } }, value: string) => void} setTargetValue - Write target value.
 * @property {() => boolean} hasBetaParam - Detect beta query param.
 * @property {(element: HTMLElement) => void} reveal - Reveal a hidden element.
 */

export {};
