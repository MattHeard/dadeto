const ESCAPE_KEY = 'Escape';

/**
 * Detect an Escape keydown event.
 * @param {KeyboardEvent} event - Event to inspect.
 * @returns {boolean} True when the event is an Escape keydown.
 */
function isEscapeKeydown(event) {
  return event.type === 'keydown' && event.key === ESCAPE_KEY;
}

export { ESCAPE_KEY, isEscapeKeydown };
