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

// The DataCamp course content is generally loaded inside iframes, essentially creating isolated DOMs
// We cannot access the content/DOM of the iframe from the main page due to CORS issues!
// However, luckily, TamperMonkey scripts can also be loaded into iframes directly
// It seems like we can't really figure out what iframe a script has been loaded into in order to figure out what code to run (if any)
// My current "best" approach is checking the classes of the iframes document.body to get a better idea
// took me ages to figure out how that works lol

function run() {
  const currentPage = getCurrentPage();

  if (currentPage !== 'other') {
    // debug only
    // alert(`Current page: ${currentPage}`);

    const pageCrawler = pageCrawlers.get(currentPage);
    addPasteButton(pageCrawler);
  }
}

function addPasteButton(pageCrawlFn) {
  const btn = document.createElement('button');
  btn.style.position = 'fixed';
  btn.style.top = '40px';
  btn.style.right = '40px';
  btn.innerText = 'paste to clipboard';
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
  // debug only
  // if (!document.body.className) {
  //   alert('No classes attached to body');
  // }
  // if (!document.body.className.includes('mfe-composer-body')) {
  //   alert(`body has the following classes:\n${document.body.className}`);
  // }

  if (document.body.className.includes('js-application')) {
    return 'overview';
  } else {
    return 'other';
  }
}

function getTextContent(elementSelector) {
  return selectSingleElement(elementSelector).textContent;
}

function selectSingleElement(selector, iframe = null) {
  const matches = selectElements(selector, iframe);

  if (matches.length > 1) {
    alert(`Note to copy helper script developer:
    More than 1 element matches selector ${selector}!`);
  }

  return matches[0];
}

function selectElements(selector, iframe = null) {
  const root = iframe ? iframe.contentWindow : document;

  const matches = Array.from(root.querySelectorAll(selector));
  if (matches.length === 0) {
    alert(`Note to copy helper script developer:
    No element matches selector ${selector}!`);
  }

  return matches;
}

function overviewCrawler() {
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

`;
}

function exerciseCrawler() {}

run();
