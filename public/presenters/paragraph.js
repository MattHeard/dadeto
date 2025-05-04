function setParagraphText(paragraph, inputString, dom) {
  dom.setTextContent(paragraph, inputString);
}

export function createParagraphElement(inputString, dom) {
  const paragraph = dom.createElement('p');
  setParagraphText(paragraph, inputString, dom);
  return paragraph;
}