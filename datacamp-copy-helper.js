// ==UserScript==
// @name         DataCamp copy helper
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Copies content from DataCamp courses into your clipboard (via button or Ctrl + Shift + Insert)
// @author       You
// @include      *.datacamp.com*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=datacamp.com
// @grant        GM.setClipboard
// ==/UserScript==

function run() {
  const currentPage = getCurrentPage();
  if (currentPage === 'other') {
    return;
  }

  const snackbar = createSnackbar(); // for showing messages to user

  const btn = createCopyButton(
    currentPage === 'exercise'
      ? {
          top: '51px',
          right: '118px',
        }
      : undefined
  );

  const pageCrawlers = new Map([
    ['overview', overviewCrawler],
    ['exercise', exerciseCrawler],
  ]);

  const pageCrawler = pageCrawlers.get(currentPage);
  const copyFn = () => {
    const clipboardContent = pageCrawler();
    GM.setClipboard(clipboardContent);
    showSnackbar('Copied R markdown to clipboard!');
  };
  btn.addEventListener('click', copyFn);

  document.addEventListener('keydown', event => {
    if (event.ctrlKey && event.shiftKey && event.key === 'Insert') {
      copyFn();
    }
  });

  document.body.appendChild(btn);
  document.body.appendChild(snackbar);

  // TODO: do proper "cleanup"
  // not sure how to do that currently, especially due to script also running in iframe in case of course overview
}

function getCurrentPage() {
  // Here, we figure out what page (or iframe) the script is running on - this was not so trivial as expected lol
  // The DataCamp course content is loaded inside iframes on the course overview page, essentially creating isolated DOMs
  // We cannot access the content/DOM of the iframe from script instances running on the main page due to CORS issues!
  // However, luckily, TamperMonkey can also be loaded into iframes directly, as long as the iframe URL matches any @include in the meta tags
  // This means that in case iframes from datacamp are also loaded, several script instances may be running at the same time

  if (document.body.className.includes('js-application')) {
    return 'overview';
  } else if (document.querySelector('main.exercise-area')) {
    return 'exercise';
  } else {
    return 'other';
  }
}

function getTextContent(elementSelector, root = document) {
  return selectSingleElement(elementSelector, root)?.textContent?.trim();
}

function getTextContents(elementSelector, root = document) {
  return selectElements(elementSelector, root).map(el =>
    el.textContent?.trim()
  );
}

function selectSingleElement(selector, root = document) {
  const matches = selectElements(selector, root);

  if (matches.length > 1) {
    alert(noLeadingWhitespace`Note to copy helper script developer:
      More than 1 element matches selector ${selector}!`);
  }

  return matches[0];
}

function selectElements(selector, root = document) {
  const queryRoot = root.nodeName === 'IFRAME' ? root.contentWindow : root;

  const matches = Array.from(queryRoot.querySelectorAll(selector));
  if (matches.length === 0) {
    alert(noLeadingWhitespace`Note to copy helper script developer:
    No element matches selector ${selector}!`);
  }

  return matches;
}

function addStyle(CSSText) {
  const style = document.createElement('style');
  style.appendChild(document.createTextNode(CSSText));
  document.querySelector('head').appendChild(style);
}

// for use with template strings
// copied from https://muffinresearch.co.uk/removing-leading-whitespace-in-es6-template-strings/
function singleLine(strings, ...values) {
  // Interweave the strings with the
  // substitution vars first.
  let output = '';
  for (let i = 0; i < values.length; i++) {
    output += strings[i] + values[i];
  }
  output += strings[values.length];

  // Split on newlines.
  let lines = output.split(/(?:\r\n|\n|\r)/);

  // Rip out the leading whitespace.
  return lines
    .map(line => {
      return line.replace(/^\s+/gm, '');
    })
    .join(' ')
    .trim();
}

// for use with template strings
// adapted from https://muffinresearch.co.uk/removing-leading-whitespace-in-es6-template-strings/
function noLeadingWhitespace(strings, ...values) {
  // Interweave the strings with the
  // substitution vars first.
  let output = '';
  for (let i = 0; i < values.length; i++) {
    output += strings[i] + values[i];
  }
  output += strings[values.length];

  // Split on newlines.
  let lines = output.split(/(?:\r\n|\n|\r)/);

  // Rip out the leading whitespace (except empty lines in beginning and end)
  return lines
    .map(line => {
      return line.replace(/^\s+/gm, '');
    })
    .join('\n')
    .trim();
}

function HTMLTextLinksCodeToMarkdown(el) {
  const childNodes = Array.from(el.childNodes);
  const textNodes = childNodes.map(c => {
    const textContent = c.textContent.trim();

    if (c.nodeName === 'A') {
      const childNode = c.childNodes[0]; // we don't expect more than one child note at this point
      if (childNode) {
        if (childNode.nodeName === 'CODE') {
          // in UI, this looks like inline code cell with link inside
          return `[\`${textContent}\`](${c.href})`;
        } else {
          //we expect childNode.nodeName === '#text', ignoring other possible cases
          //should be regular link
          return `[${textContent}](${c.href})`;
        }
      } else {
        // shouldn't be a possible case, but outputting is then probably safest option
        return textContent;
      }
    } else if (c.nodeName === 'CODE') {
      return `\`${textContent}\``;
    } else {
      // regular text node
      return textContent;
    }
  });

  return textNodes.join(' ');
}

function overviewCrawler() {
  let chapters = selectElements('.chapter');
  chapters = chapters.map(c => ({
    title: getTextContent('.chapter__title', c),
    description: getTextContent('.chapter__description', c),
  }));

  chapters = chapters.map(c => `# ${c.title}\n${c.description}`);

  chapters = chapters.join('\n\n\n\n\n\n');

  return `---
title: 'Data Acquisition and Survey Methods (2022S) Exercise X: ${getTextContent(
    '.header-hero__title'
  )}'
author: "Samo Kolter (1181909)"
date: "\`r Sys.Date()\`"
output: 
  pdf_document:
    toc: true # activate table of content
    toc_depth: 3
    number_sections: true
---

${getTextContent('.course__description')}

${chapters}
`;
}

function exerciseCrawler() {
  const codeEditor = selectElements('.monaco-editor')[0];
  const lines = getTextContents('.view-line', codeEditor).map(l =>
    l.replace(/ /g, ' ')
  ); // oddly enough instead of regular white space other char (ASCII code: 160 (decimal)) is used

  const exerciseTitle = getTextContent('.exercise--title');

  const exercisePars = selectElements('.exercise--assignment p')
    .map(p => HTMLTextLinksCodeToMarkdown(p))
    .join('\n\n');

  let exerciseInstructions = selectElements('.exercise--instructions li')
    .map(li => HTMLTextLinksCodeToMarkdown(li))
    .join('\n');

  const linesRCodeBlock = noLeadingWhitespace`\`\`\`{r}
                                              ${lines}
                                              \`\`\``;

  const rMarkdown = noLeadingWhitespace`## ${exerciseTitle}
                             ${exerciseInstructions}

                             ${exercisePars}

                             ${linesRCodeBlock}`;

  return rMarkdown;
}

function createCopyButton(pos = { top: '40px', right: '40px' }) {
  const btn = document.createElement('button');
  const btnId = 'copy-helper-btn';

  btn.id = btnId;
  addStyle(`
  #${btnId} {
    position: fixed;
    top: ${pos.top};
    right: ${pos.right};
    z-index: 999;
    transition: 0.25s all;
  }

  #${btnId}:active {
    transform: scale(0.92);
    box-shadow: 3px 2px 22px 1px rgba(0, 0, 0, 0.24);
  }
  `);

  btn.innerText = 'copy to clipboard';
  btn.type = 'button';

  return btn;
}

// copied from https://www.w3schools.com/howto/howto_js_snackbar.asp
function createSnackbar() {
  const snackbarId = 'copy-helper-snackbar';

  addStyle(`
  #${snackbarId} {
    display: none;
    background-color: #333;
    color: #fff;
    text-align: center;
    border-radius: 2px;
    padding: 16px;
    position: fixed;
    z-index: 9999;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }
  
  #${snackbarId}.visible {
    animation: fade-in-and-out 3s forwards;
    display: flex;
  }
  
  @keyframes fade-in-and-out {
    0%, 100% {
      opacity: 0;
    }
    15%, 85% {
      opacity: 1;
    }
  }

  `);

  const snackbar = document.createElement('div');
  snackbar.id = snackbarId;

  return snackbar;
}

function showSnackbar(text) {
  // Get the snackbar DIV
  const snackbar = document.getElementById('copy-helper-snackbar');

  snackbar.classList.add('visible');
  snackbar.innerText = text;

  setTimeout(function () {
    snackbar.classList.remove('visible');
  }, 3000);
}

run();
