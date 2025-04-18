export function createParagraphElement(inputString, dom) {
  const paragraph = dom.createElement('p');
  if (paragraph) {
    if (dom && typeof dom.setTextContent === 'function') {
      dom.setTextContent(paragraph, inputString);
    } else {
      paragraph.textContent = inputString;
    }
  }
  return paragraph;
}