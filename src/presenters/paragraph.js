function setParagraphText(paragraph, inputString, dom) {
  if (dom && typeof dom.setTextContent === 'function') {
    dom.setTextContent(paragraph, inputString);
  } else {
    paragraph.textContent = inputString;
  }
}

export function createParagraphElement(inputString, dom) {
  const paragraph = dom.createElement('p');
  if (paragraph) {
    setParagraphText(paragraph, inputString, dom);
  }
  return paragraph;
}