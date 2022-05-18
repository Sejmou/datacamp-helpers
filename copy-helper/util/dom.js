import { noLeadingWhitespace } from './strings.js';

export function getTextContent(elementSelector, root = document, trim = true) {
  const textContent = selectSingleElement(elementSelector, root)?.textContent;
  if (trim) {
    return textContent?.trim();
  } else {
    return textContent;
  }
}

export function getTextContents(elementSelector, root = document, trim = true) {
  return selectElements(elementSelector, root).map(el => {
    const textContent = el.textContent;
    if (trim) {
      return textContent?.trim();
    } else {
      return textContent;
    }
  });
}

export function selectSingleElement(
  selector,
  root = document,
  warnIfNoMatch = true
) {
  const matches = selectElements(selector, root);

  if (matches.length > 1) {
    alert(noLeadingWhitespace`Note to copy helper script developer:
      More than 1 element matches selector ${selector}!`);
  }

  if (warnIfNoMatch && matches.length == 0) {
    alert(noLeadingWhitespace`Note to copy helper script developer:
      No element matches selector ${selector}!`);
  }

  return matches[0];
}

export function selectElements(
  selector,
  root = document,
  warnIfNoMatch = false
) {
  const queryRoot = root.nodeName === 'IFRAME' ? root.contentWindow : root;

  const matches = Array.from(queryRoot.querySelectorAll(selector));
  if (warnIfNoMatch && matches.length === 0) {
    alert(noLeadingWhitespace`Warning:
    No element matches selector ${selector}!`);
  }

  return matches;
}
