import { noLeadingWhitespace } from './strings.js';

// --- DOM ---- element creation

export function createButton(text, id = null, className = null) {
  const btn = document.createElement('button');
  if (id) btn.id = id;
  if (className) btn.className = className;
  btn.innerText = text;
  btn.type = 'button';
  return btn;
}

export function createSnackbar(
  id,
  pos = { top: '50%', left: '50%' },
  textColor = 'white',
  animationDuration = 3
) {
  const posCss = createObjWithTruthyValuesForProps(
    ['top', 'right', 'bottom', 'left'],
    pos
  );

  addStyle(`
  #${id} {
    display: none;
    background-color: #333;
    color: ${textColor};
    text-align: center;
    border-radius: 2px;
    padding: 16px;
    position: fixed;
    z-index: 9999;
    ${objToCssPropsAndValsStr(posCss)}
    transform: translate(-50%, -50%);
  }
  
  #${id}.visible {
    /* https://stackoverflow.com/a/49546937/13727176 */
    animation-fill-mode: forwards;
    animation-name: fade-in, fade-out;
    animation-delay: 0s, ${animationDuration - 0.25}s;
    animation-duration: 0.25s; /* same for both */
    display: flex;
  }
  
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 0.9;
    }
  }

  @keyframes fade-out {
    to {
      opacity: 0;
    }
  }

  `);

  const snackbar = document.createElement('div');
  snackbar.id = id;

  return snackbar;
}

export function showSnackbar(id, text) {
  const snackbar = document?.getElementById(id);
  snackbar.remove();
  document.body.appendChild(snackbar);

  if (snackbar) {
    snackbar.innerText = text;
    snackbar.classList.add('visible');
  } else {
    console.warn('Snackbar with ID', id, 'not found!');
  }
}

// --- DOM ---- element selection

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

// --- Other ----

export function addStyle(CSSText) {
  const style = document.createElement('style');
  style.appendChild(document.createTextNode(CSSText));
  document.querySelector('head').appendChild(style);
}

// useful when DOM element ordering does NOT correspond to vertical position on page
// e.g. as argument to Array.prototype.sort()
export function compareElementYPos(a, b) {
  return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
}
export function isAboveOrOverlapping(domElementA, domElementB) {
  const [a, b] = [domElementA, domElementB];
  const aTop = a.getBoundingClientRect().top;
  const bBottom = b.getBoundingClientRect().bottom;
  return aTop <= bBottom;
}

// --- Internal ---

// creates new object from inputObj with only those props that are in the given array of props and have a truthy value in inputObj
function createObjWithTruthyValuesForProps(props, inputObj) {
  return props.reduce((prev, propName) => {
    const propVal = inputObj[propName];
    if (propVal) {
      return { ...prev, [propName]: propVal };
    }
    return prev;
  }, {});
}

function objToCssPropsAndValsStr(obj) {
  return Object.entries(obj)
    .map(([prop, val]) => `${prop}: ${val};`)
    .join('\n');
}
