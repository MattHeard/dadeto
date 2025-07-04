/**
 *
 * @param inputString
 * @param dom
 */
export function createParagraphElement(inputString, dom) {
  const paragraph = dom.createElement('p');
  dom.setTextContent(paragraph, inputString);
  return paragraph;
}
