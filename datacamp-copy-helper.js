// ==UserScript==
// @name         DataCamp copy helper
// @namespace    http://tampermonkey.net/
// @version      1.6.3
// @description  Copies content from DataCamp courses into your clipboard (via button or Ctrl + Shift + Insert)
// @author       You
// @include      *.datacamp.com*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=datacamp.com
// @grant        GM.setClipboard
// @downloadURL  https://raw.githubusercontent.com/Sejmou/userscripts/master/datacamp-copy-helper.js
// @updateURL    https://raw.githubusercontent.com/Sejmou/userscripts/master/datacamp-copy-helper.js
// ==/UserScript==

// config for code exercises
const copyRSessionCodeComments = false;
const copyEditorCodeFromConsoleOut = false; // whether editor code reappearing in the console output should also be copied
const copyOnlyConsoleOutOfCodeInEditor = true; // whether all previous output of the console that is not related to last execution of code currently in editor should be excluded when copying

async function run() {
  const currentPage = await getCurrentPage();
  if (currentPage === 'other') {
    // nothing interesting to copy, just return directly!
    return;
  }

  let elementsAddedToDocument = [];
  const addToDocumentBody = el => {
    document.body.appendChild(el);
    elementsAddedToDocument.push(el);
  };

  const initialExercise = getURLQueryParams().ex;
  if (initialExercise) {
    // only reached when on an exercise page
    const detectExerciseChange = function () {
      const currentExercise = getURLQueryParams().ex;
      if (currentExercise != initialExercise) {
        handleExerciseChange();
      }
    };

    const detectionTimer = setInterval(detectExerciseChange, 1000); // apparently there's no event-based way to detect change in URL query

    const handleExerciseChange = () => {
      // cleanup
      elementsAddedToDocument.forEach(el => el.remove());
      clearInterval(detectionTimer);
      // run script again to make sure elements relevant to new subpage are added
      run();
    };
  }

  const snackbar = createSnackbar(); // for showing messages to user

  const btn = createCopyButton();

  // on some pages we want to position the button differently
  // for this, we add a CSS class for the current page
  btn.classList.add(currentPage);

  if (currentPage === 'video-iframe') {
    addSlideImageViewFeatures();
  }

  let exerciseCrawlerFn = exerciseCrawler;
  let iFrameCrawlerFn = videoIframeCrawler;

  if (currentPage === 'exercise') {
    const checkboxContainer = createConsoleOutputToggleCheckbox();
    addToDocumentBody(checkboxContainer);

    exerciseCrawlerFn = () => {
      const includeConsoleOutput =
        checkboxContainer.querySelector('input').checked;
      return exerciseCrawler(includeConsoleOutput);
    };
  }

  if (currentPage === 'video-iframe') {
    const checkboxContainer = createConsoleOutputToggleCheckbox();
    addToDocumentBody(checkboxContainer);
    checkboxContainer.classList.add('video-iframe');
    checkboxContainer.querySelector('input').checked = true; // set true as default

    iFrameCrawlerFn = () => {
      const includeConsoleOutput =
        checkboxContainer.querySelector('input').checked;
      return videoIframeCrawler(includeConsoleOutput);
    };
  }

  const pageCrawlers = new Map([
    ['overview', overviewCrawler],
    ['exercise', exerciseCrawlerFn],
    ['dragdrop-exercise', dragDropExerciseCrawler],
    ['video', videoPageCrawler],
    ['video-iframe', iFrameCrawlerFn],
  ]);

  const copyFn = () => {
    const pageCrawler = pageCrawlers.get(currentPage);
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

  addToDocumentBody(btn);
  addToDocumentBody(snackbar);
}

async function getCurrentPage() {
  // Here, we figure out what page (or iframe) the script is running on - this was not so trivial as expected lol
  // The DataCamp course content is loaded inside iframes on the course overview page, essentially creating isolated DOMs
  // We cannot access the content/DOM of the iframe from script instances running on the main page due to CORS issues!
  // However, luckily, TamperMonkey can also be loaded into iframes directly, as long as the iframe URL matches any @include in the meta tags
  // This means that in case iframes from datacamp are also loaded, several script instances may be running at the same time

  // We need to make everything async because of the video page
  // we cannot be sure that we're looking at the video page until the document body is modified and a certain element becomes available

  return new Promise(resolve => {
    if (document.body.className.includes('js-application')) {
      resolve('overview');
    } else if (document.querySelector('.slides')) {
      resolve('video-iframe');
    } else if (document.querySelector('.drag-and-drop-exercise')) {
      resolve('dragdrop-exercise');
    } else if (document.querySelector('.exercise--sidebar-header')) {
      resolve('exercise');
    } else if (
      document.querySelector('[data-cy*="video-exercise"]')
      // video already loaded
    ) {
      resolve('video');
    } else if (
      document.body.className.includes('vsc-initialized')
      // page content not yet loaded
    ) {
      // wait for relevant DOM elments to appear
      new MutationObserver((_, obs) => {
        if (document.querySelector('[data-cy*="video-exercise"]')) {
          resolve('video');
          obs.disconnect();
        } else if (document.querySelector('.drag-and-drop-exercise')) {
          resolve('dragdrop-exercise');
          obs.disconnect();
        }
      }).observe(document.body, {
        childList: true,
        subtree: true,
      });
    } else {
      resolve('other');
    }
  });
}

function getURLQueryParams() {
  return new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
  });
}

function getTextContent(elementSelector, root = document, trim = true) {
  const textContent = selectSingleElement(elementSelector, root)?.textContent;
  if (trim) {
    return textContent?.trim();
  } else {
    return textContent;
  }
}

function getTextContents(elementSelector, root = document, trim = true) {
  return selectElements(elementSelector, root).map(el => {
    const textContent = el.textContent;
    if (trim) {
      return textContent?.trim();
    } else {
      return textContent;
    }
  });
}

function selectSingleElement(selector, root = document) {
  const matches = selectElements(selector, root);

  if (matches.length > 1) {
    alert(noLeadingWhitespace`Note to copy helper script developer:
      More than 1 element matches selector ${selector}!`);
  }

  return matches[0];
}

function selectElements(selector, root = document, warnIfNoMatch = false) {
  const queryRoot = root.nodeName === 'IFRAME' ? root.contentWindow : root;

  const matches = Array.from(queryRoot.querySelectorAll(selector));
  if (warnIfNoMatch && matches.length === 0) {
    alert(noLeadingWhitespace`Warning:
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

function replaceAllExceptLast(str, search, replace) {
  return str
    .split(search)
    .reduce(
      (prev, curr, i, substrs) =>
        prev + (i !== substrs.length - 1 ? replace : search) + curr
    );
}

function HTMLTextLinksCodeToMarkdown(el) {
  const childNodes = Array.from(el.childNodes);
  if (el.nodeName === 'PRE') {
    const textContent = el.textContent.trim();
    if (el.childNodes[0].nodeName === 'CODE') {
      return '```{r}\n' + `${textContent.replace(/ /g, ' ')}` + '\n```';
    } else {
      return textContent;
    }
  } else if (el.nodeName === 'TABLE') {
    return HTMLTableToMarkdown(el);
  } else if (el.nodeName === 'UL') {
    return HTMLListToMarkdown(el) + '\n';
  }
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

  return textNodes
    .join(' ')
    .replaceAll(/[`] [,\.\)]/g, m => m[0] + m[2])
    .replaceAll(/[\(] [`]/g, m => m[0] + m[2]);
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
date: "\`r Sys.setlocale('LC_TIME', 'en_GB.UTF-8'); format(Sys.time(), '%d %B, %Y')\`"
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

function exerciseCrawler(includeConsoleOutput = false) {
  const exerciseTitle = `## ${getTextContent('.exercise--title')}`;

  const exercisePars = selectElements('.exercise--assignment>div>*')
    .map(p => HTMLTextLinksCodeToMarkdown(p))
    .join('\n\n');

  const exerciseBeginning = [exerciseTitle, exercisePars].join('\n');

  const subExerciseBullets = selectElements('.progress-bullet__link');
  const subExerciseIdx = subExerciseBullets.findIndex(b =>
    b.className.includes('active-tab')
  );

  const exerciseInstructions = getExerciseInstructions(
    subExerciseBullets,
    subExerciseIdx
  );

  const codeEditors = selectElements('.monaco-editor');

  const codeCommentLines = [];

  const editorContentStrs = codeEditors.map(codeEditor =>
    getTextContents('.view-line', codeEditor, false)
      .map(l => l.replace(/ /g, ' ')) // instead of regular white space other char (ASCII code: 160 (decimal)) is used
      .filter(str => {
        const trimmed = str.trim();
        if (trimmed.startsWith('#')) {
          codeCommentLines.push(trimmed);
          return copyRSessionCodeComments;
        }
        return true;
      })
      .filter(str => str.trim().length > 0)
      .join('\n')
  );

  const editorLines = editorContentStrs.join('\n').split('\n');

  const RCodeBlocks = editorContentStrs
    .filter(linesStr => linesStr.trim().length > 0)
    .map(linesStr => {
      return (
        `\`\`\`{r${includeConsoleOutput ? ', eval=FALSE' : ''}}\n` +
        linesStr +
        '\n```'
      );
    })
    .join('\n\n');

  let RConsoleOutput = '';
  if (includeConsoleOutput) {
    let RConsoleOutputDivContents = getTextContents(
      '[data-cy="console-editor"]>div>div>div'
    );

    let lastIdxOfFirstCodeLineInConsoleOut = -1;
    RConsoleOutputDivContents.forEach((content, i) => {
      // goal: find last console output div whose first line starts with same line as first editor line
      // I assume, this is the most up-to-date console output for running the code that is currently in the editor
      const outputLines = content.split('\n');
      if (
        outputLines[0].includes(editorLines[0])

        // using 'includes' as if editor width becomes to small, lines can break
      ) {
        lastIdxOfFirstCodeLineInConsoleOut = i;
      }
    });

    if (lastIdxOfFirstCodeLineInConsoleOut === -1) {
      alert(
        'The code you wrote was not found in the console output. Did you forget to run it?'
      );
    }

    if (copyOnlyConsoleOutOfCodeInEditor) {
      RConsoleOutputDivContents = RConsoleOutputDivContents.slice(
        lastIdxOfFirstCodeLineInConsoleOut
      );
    }

    if (!copyEditorCodeFromConsoleOut) {
      RConsoleOutputDivContents = RConsoleOutputDivContents.filter(
        str =>
          str.trim().length == 0 || // keep empty lines in output to make it easier to differentiate what command produced what output
          !editorLines.includes(str.split('\n')[0])
      );
    }

    if (!copyRSessionCodeComments) {
      RConsoleOutputDivContents = RConsoleOutputDivContents.filter(
        str => !codeCommentLines.find(l => l === str.trim())
        // Note: solution misses e.g. comments inside a single assignment to some variable that spans multiple lines - not an issue if copyEditorCodeFromConsoleOut is false
      );
    }

    RConsoleOutput =
      'After running the code above in the R session on DataCamp we get:\n' +
      '```\n' +
      RConsoleOutputDivContents.filter((_, i, arr) => i != arr.length - 1) // remove last line (input for R console)
        .join('\n')
        .trim() + // trim because we don't need empty lines in beginning or end of console output
      '\n```';
  }

  const rMarkdown =
    [
      subExerciseIdx <= 0 ? exerciseBeginning : '', // we don't need beginning text again if we're copying one of subexercises != the first
      exerciseInstructions,
      RCodeBlocks,
      RConsoleOutput,
    ]
      .filter(str => str.length > 0)
      .join('\n\n') + '\n';

  return rMarkdown;
}

function getExerciseInstructions(subExerciseBullets, subExerciseIdx = 0) {
  if (subExerciseBullets.length > 0) {
    const instructions = selectElements('.exercise--instructions>*')
      .map(el => {
        return Array.from(el.children)
          .map(el => {
            const textContent = el.textContent.trim();
            if (el.nodeName === 'H4') return ''; //return `### ${textContent}`; This is usually the "Question" heading - probably irrelevant for copying
            if (el.nodeName === 'H5') return ''; //`#### ${textContent}`; This is usually "Possible answers" heading - also probably irrelevant
            if (el.nodeName === 'UL') return HTMLListToMarkdown(el) + '\n';
            if (el.className.includes('actions'))
              return ''; // actions are buttons etc. -> text is irrelevant
            else return textContent;
          })
          .filter(str => str.trim().length > 0)
          .join('\n');
      })
      .join('\n');

    return `### Subtask ${subExerciseIdx + 1}\n` + instructions;
  }

  return selectElements('.exercise--instructions li')
    .map(li => ' * ' + HTMLTextLinksCodeToMarkdown(li))
    .join('\n');
}

function dragDropExerciseCrawler() {
  const exerciseTitle = `## ${getTextContent('.dc-panel__body h4')}`;

  const [descContainer, instructionsContainer] = selectElements(
    '.le-shared-sticky-header+div>div>div'
  );

  const exercisePars = selectElements('*', descContainer)
    .map(p => HTMLTextLinksCodeToMarkdown(p))
    .join('\n\n');

  const exerciseInstructions = selectElements('li', instructionsContainer)
    .map(li => ' * ' + HTMLTextLinksCodeToMarkdown(li))
    .join('\n');

  const dragdropExerciseContent = document.querySelector(
    '[data-cy*="order-exercise"]'
  )
    ? getDragIntoOrderContent()
    : getDragdropContent();

  const rMarkdown =
    exerciseTitle +
    '\n' +
    [exercisePars, exerciseInstructions, dragdropExerciseContent].join('\n\n');

  return rMarkdown;
}

function videoPageCrawler() {
  const title = getTextContent('.exercise-area h1');
  const transcriptElements = selectElements(
    'section.vex-body>div[tabindex]>div>*',
    document,
    false
  );
  const transcriptContent = transcriptElements
    .map(el => {
      const textContentAsMarkdown = Array.from(el.childNodes)
        .map(child => {
          const textContent = child.textContent.trim();

          if (child.nodeName === 'H2') {
            return `### ${textContent}`;
          } else {
            return textContent + '\n';
          }
        })
        .join('\n');
      return textContentAsMarkdown;
    })
    .join('\n');

  return `## ${title}\n${transcriptContent}`;
}

function getDragdropContent() {
  const container = selectSingleElement('.drag-and-drop-exercise');
  if (!container) return null;

  const headings = selectElements('.droppable-container h5', container);
  const headerRow = stringArrToMarkdownTableRow(
    headings.map(h => '**' + h.textContent.trim() + '**')
  );

  const sep = stringArrToMarkdownTableRow(headings.map(() => '---'));

  const contentCols = headings.map(h => {
    contentContainer = h.parentNode;
    return Array.from(contentContainer.querySelector('div').children).map(div =>
      div.textContent.trim()
    );
  });

  const contentRows = twoDArrayFromColArrays(contentCols).map(col => {
    return stringArrToMarkdownTableRow(col);
  });
  return [headerRow, sep, ...contentRows].join('\n');
}

function stringArrToMarkdownTableRow(strArr) {
  return '| ' + strArr.join(' | ') + ' |';
}

function twoDArrayFromColArrays(...colArrays) {
  let arrMaxLength = 0;
  colArrays.forEach(arr => {
    if (arr.length > arrMaxLength) {
      arrMaxLength = arr.length;
    }
  });

  const output = new Array(arrMaxLength);

  for (i = 0; i < arrMaxLength; i++) {
    const row = colArrays.map(arr => arr[i]).flat();
    output[i] = row;
  }

  return output;
}

function getDragIntoOrderContent() {
  return (
    'The correct order is:\n\n' +
    getTextContents('[data-cy*="droppable-area"]>div')
      .map((str, i) => ` ${i + 1}. ${str}`)
      .join('\n')
  );
}

function videoIframeCrawler(includeConsoleOutput) {
  const slideContents = selectElements('.slide-content>div') //>*>div>div')
    .map(el => {
      const childNodes = Array.from(el.childNodes);
      const sectionHeadingSlideH1El = el.querySelector('h1');
      if (sectionHeadingSlideH1El) {
        // section heading slide - only relevant element is the slide title
        return `## ${sectionHeadingSlideH1El.textContent.trim()}`;
      } else {
        // regular slide
        return childNodes
          .map(c => {
            if (c.nodeName === 'H2') {
              // slide title
              return `### ${c.textContent.trim()}\n`;
            }
            if (c.nodeName === 'DIV') {
              // we can find actual slide content nested a few layers deeper
              const content = selectElements('.dc-slide-region>div>*', c);
              return content
                .map(el => {
                  if (
                    el.nodeName === 'PRE' // code is always inside <code> tag wrapped by <pre>
                  ) {
                    if (
                      includeConsoleOutput ||
                      !el.className.includes('lang-out')
                      //lang-out is for output code cells - we skip over them, except if explicitly included
                    ) {
                      return (
                        '```' +
                        `${
                          el.className.includes('lang-r')
                            ? `{r${includeConsoleOutput ? ', eval=FALSE' : ''}}`
                            : ''
                        }` +
                        '\n' +
                        el.textContent.trim() +
                        '\n```'
                      );
                    }
                    //lang-out is for output code cells - we skip over them, except if explicitly included
                    return '';
                  } else if (el.nodeName === 'UL') {
                    return HTMLListToMarkdown(el) + '\n'; // need additional line break after lists in Markdown!
                  } else {
                    return HTMLTextLinksCodeToMarkdown(el);
                  }
                })
                .join('\n');
            } else {
              // this should be the only two possible cases that are relevant/possible
              // each regular slide should only contain single h2 and single div with bunch of other nested divs
              return '';
            }
          })
          .join('');
      }
    })
    .filter((slide, i, slides) => slide !== slides[i - 1]) // remove slide pages that are exactly the same
    .map((slide, i, slides) => {
      const prevLines = slides[i - 1]?.split('\n');
      if (!prevLines) return slide;

      const currLines = slide.split('\n');
      // first line of each slide's markdown is the heading
      const headingsIdentical = prevLines[0] === currLines[0];

      if (headingsIdentical) {
        return currLines.slice(1).join('\n');
      }
      return slide;
    })
    .join('\n\n');

  return `${slideContents}`;
}

function HTMLListToMarkdown(ul, indentLevel = 0) {
  const childElements = Array.from(ul.children);
  return (
    '\n' +
    childElements
      .map(ulChild => {
        if (ulChild.nodeName === 'LI') {
          const liChildNodes = Array.from(ulChild.childNodes);
          return liChildNodes
            .map(liChild => {
              if (liChild.textContent.trim().length === 0) {
                return '';
              } else {
                if (liChild.nodeName === 'UL') {
                  return HTMLListToMarkdown(liChild, indentLevel + 1);
                } else {
                  const textContent = liChild.textContent;
                  if (liChild.nodeName === 'CODE')
                    return '`' + textContent + '`';
                  return liChild.textContent;
                }
              }
            })
            .filter(str => str.trim().length > 0)
            .join('')
            .replaceAll(' .', '.');
        } else {
          return ulChild.textContent.trim(); // should only be line breaks or empty text nodes
        }
      })
      .filter(str => str.length > 0)
      .map(str => '    '.repeat(indentLevel) + ' * ' + str)
      .join('\n')
  );
}

// adapted from: https://gist.github.com/styfle/c4bba2d29e6cb9b585de72207c006af7
function HTMLTableToMarkdown(el) {
  let outputStr = '| ';
  const thead = selectSingleElement('thead', el);
  const headcells = selectElements('th, td', thead);
  for (let i = 0; i < headcells.length; i++) {
    const cell = headcells[i];
    const cellText = cell.textContent.trim();
    // header cell text should always be bold
    outputStr += (cellText.length > 0 ? ' **' + cellText + '** ' : '') + '| ';
  }

  outputStr += '\n';

  for (let i = 0; i < headcells.length; i++) {
    outputStr += '|---------';
  }

  outputStr += '|\n';

  const tbody = selectSingleElement('tbody', el);
  const trs = selectElements('tr', tbody);
  for (let i = 0; i < trs.length; i++) {
    outputStr += '| ';
    const tr = trs[i];
    const tds = selectElements('td', tr);
    for (let j = 0; j < tds.length; j++) {
      const td = tds[j];
      const childNodes = Array.from(td.childNodes);
      const cellText = childNodes
        .map(node => {
          const textContent = node.textContent.trim();
          if (node.nodeName === 'STRONG') return ` **${textContent}** `;
          if (node.nodeName === 'CODE') return `\`${textContent}\``;
          return textContent;
        })
        .join('');
      outputStr += cellText + ' | ';
    }
    outputStr += '\n';
  }

  // adding empty line in the beginning to make sure markdown table is parsed correctly
  // e.g. if it follows heading directly, without empty line, Markdown output is incorrect (table is interpreted as part of the heading)
  return '\n' + outputStr;
}

function addSlideImageViewFeatures() {
  const imgs = selectElements(
    '.slide-content img:not([class]), .slide-content img[class=""]'
  ).map(img => img.cloneNode(true));

  const imgClass = 'copy-helper-slide-imgs';

  imgs.forEach(img => document.body.appendChild(img));

  if (imgs.length > 0) {
    const slideImgBtnClass = 'copy-helper-slide-images-btn';
    const visibleClass = 'visible';
    const prevSlideImgBtnId = 'copy-helper-prev-slide-image-btn';
    const nextSlideImgBtnId = 'copy-helper-next-slide-image-btn';
    // TODO: comment out once download actually works lol
    // const downloadSlideImgBtnId = 'copy-helper-slide--image-download-btn';

    const viewSlideImageToggleBtn = createButton(
      'view slide images',
      null,
      slideImgBtnClass
    );
    const prevSlideImgBtn = createButton('prev', prevSlideImgBtnId);
    const nextSlideImgBtn = createButton('next', nextSlideImgBtnId);
    // TODO: comment out once download actually works lol
    // const downloadSlideImgBtn = createButton(
    //   'download current image',
    //   downloadSlideImgBtnId
    // );

    const ctrlBtns = [prevSlideImgBtn, nextSlideImgBtn];

    const backgroundDiv = document.createElement('div');
    const backgroundDivId = 'copy-helper-slide-image-background';

    let currImgIdx = 0;
    let showSlideImgs = false;

    const incImgIdx = () => {
      if (currImgIdx < imgs.length - 1) currImgIdx++;
      imgs.forEach((img, i) => {
        img.className = i === currImgIdx ? imgClass : '';
      });
      imgs[currImgIdx].classList.add(imgClass);
      nextSlideImgBtn.disabled = currImgIdx >= imgs.length - 1;
      prevSlideImgBtn.disabled = currImgIdx <= 0;
    };

    const decImgIdx = () => {
      if (currImgIdx > 0) currImgIdx--;
      imgs.forEach((img, i) => {
        img.className = i === currImgIdx ? imgClass : '';
      });
      imgs[currImgIdx].classList.add(visibleClass);
      nextSlideImgBtn.disabled = currImgIdx >= imgs.length - 1;
      prevSlideImgBtn.disabled = currImgIdx <= 0;
    };

    prevSlideImgBtn.addEventListener('click', decImgIdx);
    nextSlideImgBtn.addEventListener('click', incImgIdx);

    viewSlideImageToggleBtn.addEventListener('click', () => {
      showSlideImgs = !showSlideImgs;
      imgs.forEach((img, i) => {
        img.className = showSlideImgs && i === currImgIdx ? imgClass : '';
      });

      ctrlBtns.forEach(btn => {
        btn.className =
          showSlideImgs && imgs.length > 1 ? slideImgBtnClass : '';
      });

      backgroundDiv.id = showSlideImgs ? backgroundDivId : '';

      // TODO: comment out once download actually works lol
      //downloadSlideImgBtn.id = showSlideImgs ? downloadSlideImgBtnId : '';

      viewSlideImageToggleBtn.innerText = !showSlideImgs
        ? 'view slide images'
        : 'close slide image view';

      if (showSlideImgs) {
        selectSingleElement('video').pause();
      }
    });

    // TODO: make this work if motivated
    // downloadSlideImgBtn.addEventListener('click', () => {
    //   if (showSlideImgs) {
    //     // slide images should actually always be visible if this button is clicked
    //     const downloadImg = imgSrc => {
    //       const link = document.createElement('a');
    //       const filename = replaceAllExceptLast(
    //         imgSrc.replace(/^.*[\\\/]/, ''), // https://stackoverflow.com/a/29182327/13727176
    //         '.',
    //         '_'
    //       );
    //       link.download = filename;
    //       link.href = imgSrc;
    //       link.click();
    //     };

    //     const currImg = imgs[currImgIdx];

    //     if (currImg.src.startsWith('http')) {
    //       // tried this to fetch images from other site and download
    //       // doesn't work due to CORS issues - script origin is https://projector.datacamp.com, data origin is https://assets.datacamp.com/
    //       // or is the issue that the client where javascript is executed has different origin? not sure
    //       fetch(currImg.src)
    //         .then(response => response.blob())
    //         .then(data => {
    //           const urlCreator = window.URL || window.webkitURL;
    //           const imageData = urlCreator.createObjectURL(data);
    //           console.log(imageData);
    //           currImg.src = imageData;
    //           downloadImg(currImg.src);
    //         });
    //     } else {
    //       downloadImg(currImg.src);
    //     }
    //   }
    // });

    document.body.addEventListener(
      'keydown',
      e => {
        const leftKey = 'ArrowLeft';
        const rightKey = 'ArrowRight';
        const arrowKeys = [leftKey, rightKey];
        if (showSlideImgs && arrowKeys.includes(e.key)) {
          e.stopPropagation();
          if (e.key == leftKey) {
            decImgIdx();
          }
          if (e.key == rightKey) {
            incImgIdx();
          }
        }
      },
      { capture: true }
    );

    document.body.appendChild(viewSlideImageToggleBtn);
    ctrlBtns.forEach(btn => document.body.appendChild(btn));
    document.body.appendChild(backgroundDiv);

    addStyle(`
  .${slideImgBtnClass} {
    position: fixed;
    top: 40px;
    right: 10px;
    z-index: 999;
    transition: 0.25s all;
  }

  .${slideImgBtnClass}:active {
    transform: scale(0.92);
    box-shadow: 3px 2px 22px 1px rgba(0, 0, 0, 0.24);
  }

  img.${imgClass} {
    z-index: 997 !important;
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    max-height: 85vh !important;
    max-width: 100vw !important;
    display: block;
    transform: translate(-50%, -50%);
  }

  #${backgroundDivId} {
    z-index: 996;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: #FFFFFF;
  }

  #${nextSlideImgBtnId} {
    top: unset;
    bottom: 10px;
    left: 51%;
    right: unset;
  }

  #${prevSlideImgBtnId} {
    top: unset;
    bottom: 10px;
    right: 51%;
    left: unset;
  }
  `);
    //TODO: add those styles once download actually works
    // #${downloadSlideImgBtnId} {
    //   /* if visible, displayed right above 'Copy to clipboard' button */
    //   top: 10px;
    //   right: 10px;
    //   z-index: 1000;
    // }
  }
}

function createCopyButton() {
  const btnId = 'copy-helper-btn';
  const btn = createButton('copy to clipboard', btnId);

  addStyle(`
  #${btnId} {
    position: fixed;
    top: 51px;
    right: 350px;
    z-index: 999;
    transition: 0.25s all;
  }

  #${btnId}:active {
    transform: scale(0.92);
    box-shadow: 3px 2px 22px 1px rgba(0, 0, 0, 0.24);
  }

  /*The following two classes help us position the button better for specific sites*/
  #${btnId}.overview { 
    top: 40px;
    right: 40px;
  }

  #${btnId}.video-iframe {
    top: 10px;
    right: 10px;
  }

  #${btnId}.video, #${btnId}.dragdrop-exercise {
    top: 70px;
    right: 70px;
  }
  `);

  return btn;
}

function createButton(text, id = null, className = null) {
  const btn = document.createElement('button');
  if (id) btn.id = id;
  if (className) btn.className = className;
  btn.innerText = text;
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
      opacity: 0.9;
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

function createConsoleOutputToggleCheckbox() {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  const checkboxId = 'datacamp-copy-helper-checkbox';
  checkbox.id = checkboxId;

  const label = document.createElement('label');
  label.htmlFor = checkboxId;
  label.appendChild(document.createTextNode('include code output?'));

  const container = document.createElement('div');
  const containerId = checkboxId + 'container';
  container.id = containerId;

  container.appendChild(checkbox);
  container.appendChild(label);

  addStyle(`
    #${containerId} {
      position: fixed;
      top: 51px;
      right: 140px;
      z-index: 999;
      color: white;
      display: flex;
      justify-content: center;
      height: 30px;
      align-items: center;
      gap: 10px;
    }

    #${containerId}.video-iframe {
      color: black;
      right: 164px;
      top: 7px;
    }
  
    #${containerId}:hover, #${containerId} *:hover {
      cursor: pointer;
    }
  `);

  return container;
}

window.addEventListener('load', run, { once: true });
