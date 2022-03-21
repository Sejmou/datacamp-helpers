// ==UserScript==
// @name         DataCamp copy helper
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Copies content from DataCamp courses into your clipboard, making it easier to create reports for University assignments
// @author       You
// @include      *.datacamp.com*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=datacamp.com
// @grant        GM_setClipboard
// ==/UserScript==

function run() {
  const currentPage = getCurrentPage();
  const pageCrawler = pageCrawlers.get(currentPage);

  let btnPos;

  if (currentPage === 'exercise') {
    btnPos = {
      top: '51px',
      right: '118px',
    };
  }

  addCopyButton(pageCrawler, btnPos);
}

function addCopyButton(pageCrawlFn, pos = { top: '40px', right: '40px' }) {
  const btn = document.createElement('button');

  btn.style.position = 'fixed';
  btn.style.top = pos.top;
  btn.style.right = pos.right;
  btn.style.zIndex = '999';

  btn.innerText = 'copy to clipboard';

  btn.id = 'copy-helper-btn';

  btn.addEventListener('click', () => {
    const clipboardContent = pageCrawlFn();
    GM_setClipboard(clipboardContent);
  });
  document.body.appendChild(btn);
}

const pageCrawlers = new Map([
  ['overview', overviewCrawler],
  ['exercise', exerciseCrawler],
]);

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

  return noLeadingWhitespace`## ${exerciseTitle}
                             ${exerciseInstructions}

                             ${exercisePars}

                             ${linesRCodeBlock}`;
}

run();
