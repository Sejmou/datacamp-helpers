import {
  selectElements,
  selectSingleElement,
  getTextContent,
  getTextContents,
} from '../../util/dom.js';
import {
  HTMLTextLinksCodeToMarkdown,
  HTMLListToMarkdown,
} from '../../util/markdown-conversion.js';
import { showWarning } from '../../copy-helper.js';

export async function exerciseCrawler(
  includeConsoleOutput,
  submitCodeInEditor,
  includeTaskAndSolutionHeadings,
  config
) {
  const {
    copyRSessionCodeComments,
    copyEmptyLines,
    copyEditorCodeFromConsoleOut,
    copyOnlyConsoleOutOfCodeInEditor,
    limitMaxLinesPerConsoleOut,
    maxLinesPerConsoleOut,
    pasteSubExercisesTogether,
    includeConsoleOutInfoText,
    wideConsoleOutLinesStrategy,
    maxConsoleOutLineWidth,
    splitConsoleOutOnProducedResult,
  } = config;

  const exerciseTitle = `## ${getTextContent('.exercise--title')}${
    includeTaskAndSolutionHeadings ? '\n### Exercise description' : ''
  }`;

  const exercisePars = selectElements('.exercise--assignment>div>*')
    .map(p => HTMLTextLinksCodeToMarkdown(p))
    .join('\n\n');

  const exerciseIntro = [exerciseTitle, exercisePars].join('\n');

  let exerciseBody = '';

  let subExIdx = getSubExerciseIndex();
  const hasSubexercises = subExIdx !== -1;

  if (!hasSubexercises) {
    if (includeTaskAndSolutionHeadings) exerciseBody += '### Task';
    exerciseBody += getExerciseInstructions();
    if (includeTaskAndSolutionHeadings) exerciseBody += '### Solution\n\n';
    exerciseBody += await getExerciseCode(
      includeConsoleOutput,
      submitCodeInEditor,
      copyRSessionCodeComments,
      copyEmptyLines,
      copyEditorCodeFromConsoleOut,
      copyOnlyConsoleOutOfCodeInEditor,
      limitMaxLinesPerConsoleOut,
      maxLinesPerConsoleOut,
      wideConsoleOutLinesStrategy,
      maxConsoleOutLineWidth,
      splitConsoleOutOnProducedResult,
      includeConsoleOutInfoText
    );
  } else {
    if (includeTaskAndSolutionHeadings) exerciseBody += '### Tasks';
    if (pasteSubExercisesTogether) {
      while (getLinkToNextSubExercise()) {
        exerciseBody += getSubExerciseInstructions(subExIdx);
        exerciseBody += await getExerciseCode(
          includeConsoleOutput,
          submitCodeInEditor,
          copyRSessionCodeComments,
          copyEmptyLines,
          copyEditorCodeFromConsoleOut,
          copyOnlyConsoleOutOfCodeInEditor,
          limitMaxLinesPerConsoleOut,
          maxLinesPerConsoleOut,
          wideConsoleOutLinesStrategy,
          maxConsoleOutLineWidth,
          splitConsoleOutOnProducedResult,
          includeConsoleOutInfoText
        );
        subExIdx++;
      }
    }

    exerciseBody += getSubExerciseInstructions(subExIdx);
    exerciseBody += await getExerciseCode(
      includeConsoleOutput,
      submitCodeInEditor,
      copyRSessionCodeComments,
      copyEmptyLines,
      copyEditorCodeFromConsoleOut,
      copyOnlyConsoleOutOfCodeInEditor,
      limitMaxLinesPerConsoleOut,
      maxLinesPerConsoleOut,
      wideConsoleOutLinesStrategy,
      maxConsoleOutLineWidth,
      splitConsoleOutOnProducedResult,
      includeConsoleOutInfoText
    );
  }

  return exerciseIntro + '\n\n' + exerciseBody;
}

async function getExerciseCode(
  includeConsoleOutput,
  submitCodeInEditor,
  copyRSessionCodeComments,
  copyEmptyLines,
  copyEditorCodeFromConsoleOut,
  copyOnlyConsoleOutOfCodeInEditor,
  limitMaxLinesPerConsoleOut,
  maxLinesPerConsoleOut,
  wideConsoleOutLinesStrategy,
  maxConsoleOutLineWidth,
  splitConsoleOutOnProducedResult,
  includeConsoleOutInfoText
) {
  const editors = selectElements('.monaco-editor');

  if (editors.length > 1) {
    const editorLines = await getEditorCodeLines();
    const editorCodeCompressed = editorLines.join('').replace(/\s/g, '');

    const codeWithComments = getEditorCodeBlock(
      editorLines
        .filter(l => copyEmptyLines || l.trim().length > 0)
        .join('\n')
        .replaceAll(' ', ' '), // for some reason, some weird ASCII character is used for spaces in code -> replace with regular space
      includeConsoleOutput
    );

    const code = copyRSessionCodeComments
      ? codeWithComments
      : removeCommentsLinesStr(codeWithComments);

    if (submitCodeInEditor) {
      await submitAnswer();
    }

    if (includeConsoleOutput) {
      const codeOutput = getConsoleOutput(
        editorCodeCompressed,
        copyRSessionCodeComments,
        copyEditorCodeFromConsoleOut,
        copyOnlyConsoleOutOfCodeInEditor,
        limitMaxLinesPerConsoleOut,
        maxLinesPerConsoleOut,
        wideConsoleOutLinesStrategy,
        maxConsoleOutLineWidth,
        splitConsoleOutOnProducedResult,
        includeConsoleOutInfoText
      );
      return (
        [code, codeOutput].filter(str => str.length > 0).join('\n\n') + '\n\n'
      );
    } else return code + '\n\n';
  } else {
    if (includeConsoleOutput) {
      const consoleOutput = getConsoleOutput(
        '',
        copyRSessionCodeComments,
        copyEditorCodeFromConsoleOut,
        copyOnlyConsoleOutOfCodeInEditor,
        limitMaxLinesPerConsoleOut,
        maxLinesPerConsoleOut,
        wideConsoleOutLinesStrategy,
        maxConsoleOutLineWidth,
        splitConsoleOutOnProducedResult,
        includeConsoleOutInfoText
      );
      return consoleOutput + '\n\n';
    }
  }
}

async function getEditorCodeLines() {
  // Annoying issue #1: not all editor code is added to DOM right away, only the part of it that is currently visible is added to DOM
  // Furthermore, every line marker and code line that moves out of the viewport is removed from the DOM
  // New DOM nodes are inserted once code scrolls back into view!

  // Annoying issue #2: code can be too long to fit into viewport width
  // The editor then does NOT add a horizontal scrollbar
  // Instead, an "artificial line break" is added, but the code line still remains the same

  // Annoying issue #3: line markers and code lines in the DOM are NOT necessarily sorted by their y-position
  // We have to sort them ourselves

  // That's why all this weird code is necessary...

  const lineMarkerContainer = selectElements('.margin-view-overlays')[0];

  const lineMarkers = Array.from(lineMarkerContainer.children);
  lineMarkers.sort(compareElementYPos);

  const extractLineNumbersFromLineMarkers = lineMarkers => {
    const lineNumbers = new Array(lineMarkers.length);
    for (let i = 0; i < lineNumbers.length; i++) {
      // textContent of lineMarker can either be valid line number string (>= 1), or empty
      // if we get back 0, we know that we actually observed an empty string
      // in this case, we know that this "artificially generated line" actually belongs to the previous observed code line
      const number = +lineMarkers[i].textContent.trim();
      lineNumbers[i] = !number ? lineNumbers[i - 1] : number;
    }

    return lineNumbers;
  };

  let lineNumbers = extractLineNumbersFromLineMarkers(lineMarkers);
  // As code lines are removed from the editor DOM content once it is scrolled down, the first few lines might be missing
  // could not figure out how to scroll up in editor (only scrolling down works lol), so best I can do is show a warning
  if (!(lineNumbers[0] <= 1)) {
    showWarning(
      `Editor not scrolled to top, code before line ${lineNumbers[0]} will not be copied`
    );
  }

  const linesContainer = selectElements('.view-lines')[0];
  const editorLines =
    lineNumbers.length == 0 ? [] : new Array(lineNumbers.at(-1) + 1).fill('');

  // the lines in the editor might contain "artificial line breaks", as explained above
  // we need to assign them to the correct "actual editor lines"
  const editorLinesUnprocessed = Array.from(linesContainer.children);
  editorLinesUnprocessed.sort(compareElementYPos);

  // divider between code editor and console -> lower border for the code editor viewport
  const editorViewportBottom = selectSingleElement(
    '.lm_splitter.lm_vertical .lm_drag_handle'
  );

  const editorWindow = selectElements('.overflow-guard')[0];

  if (isAboveOrOverlapping(editorViewportBottom, lineMarkers.at(-1))) {
    // some parts of the code are still "unseen" -> we need to scroll all the remaining stuff into view
    let y = 0;

    while (isAboveOrOverlapping(editorViewportBottom, lineMarkers.at(-1))) {
      y += 50;
      editorWindow.scrollTop = y;

      // TODO: think about better approach for this
      const newLineNumbersAdded = () =>
        new Promise(resolve => {
          const newLineMarkerObs = new MutationObserver((recs, obs) => {
            recs.forEach(rec => {
              const newLineMarkers = Array.from(rec.addedNodes);
              if (newLineMarkers.length > 0) {
                lineMarkers.push(...newLineMarkers); // don't forget to destructure lol
                lineMarkers.sort(compareElementYPos);
                lineNumbers = extractLineNumbersFromLineMarkers(lineMarkers);
              }
            });
            obs.disconnect();
            resolve();
          });

          newLineMarkerObs.observe(lineMarkerContainer, { childList: true });
        });

      const newLinesAdded = () =>
        new Promise(resolve => {
          const newLineObs = new MutationObserver((recs, obs) => {
            recs.forEach(rec => {
              const newLines = Array.from(rec.addedNodes);
              if (newLines.length > 0) {
                editorLinesUnprocessed.push(...newLines);
                editorLinesUnprocessed.sort(compareElementYPos);
              }
            });
            obs.disconnect();
            resolve();
          });

          newLineObs.observe(linesContainer, { childList: true });
        });

      await Promise.all([newLineNumbersAdded(), newLinesAdded()]);
    }
  }

  const addToEditorLines = (viewLine, viewLineIdx) => {
    const lineContent = viewLine.textContent;
    const codeLineIdx = lineNumbers[viewLineIdx] - 1; // subtract 1 as codeLines begin with 1 but array indices start with 0
    if (editorLines[codeLineIdx] === undefined) {
      editorLines[codeLineIdx] = '';
    }
    editorLines[codeLineIdx] += lineContent;
  };

  editorLinesUnprocessed.forEach(addToEditorLines);

  return editorLines;
}

// useful when DOM element ordering does NOT correspond to vertical position on page
// e.g. as argument to Array.prototype.sort()
function compareElementYPos(a, b) {
  return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
}

function isAboveOrOverlapping(domElementA, domElementB) {
  const [a, b] = [domElementA, domElementB];
  const aTop = a.getBoundingClientRect().top;
  const bBottom = b.getBoundingClientRect().bottom;
  return aTop <= bBottom;
}

function getLinkToNextSubExercise() {
  return getCodeSubExerciseLink(1);
}

function getSubExerciseIndex() {
  const subExerciseBullets = selectElements(
    // selectors for horizontally and vertically arranged bullets
    '.progress-bullet__link, .bullet-instructions-list .bullet-instruction'
  );

  const currSubExerciseIdx = subExerciseBullets.findIndex(b =>
    b.className.includes('active')
  );

  return currSubExerciseIdx;
}

function getCodeSubExerciseLink(offsetFromCurrent) {
  const subExerciseBullets = selectElements(
    // selectors for horizontally and vertically arranged bullets
    '.progress-bullet__link, .bullet-instructions-list .bullet-instruction'
  );

  const currSubExerciseIdx = subExerciseBullets.findIndex(b =>
    b.className.includes('active')
  );

  return subExerciseBullets[currSubExerciseIdx + offsetFromCurrent];
}

function getEditorCodeBlock(code, evaluate) {
  const RCodeBlock =
    `\`\`\`{r${evaluate ? ', eval=FALSE' : ''}}\n` + code + '\n```';

  return RCodeBlock;
}

function getConsoleOutput(
  editorCodeCompressed = '',
  copyRSessionCodeComments,
  copyEditorCodeFromConsoleOut,
  copyOnlyConsoleOutOfCodeInEditor,
  limitMaxLinesPerConsoleOut,
  maxLinesPerConsoleOut,
  wideConsoleOutLinesStrategy,
  maxConsoleOutLineWidth,
  splitConsoleOutOnProducedResult,
  includeConsoleOutInfoText
) {
  const consoleOutDivContents = getTextContents(
    '[data-cy="console-editor"]>div>div>div'
  );

  let coutObjs = consoleOutDivContents
    .filter(
      (content, i, arr) =>
        // filter out empty lines
        !!content &&
        // sometimes (but for some reason not always!?), final line (input for new code) without output is also included -> remove
        !(content.startsWith('>') && i === arr.length - 1)
    )
    .map(content => ({
      content,
      contentCompressed: content.replace(/\s/g, ''),
      containsEditorCode: false,
    }));

  coutObjs = processEditorCode(
    coutObjs,
    editorCodeCompressed,
    copyOnlyConsoleOutOfCodeInEditor
  );

  if (!copyRSessionCodeComments) {
    coutObjs = removeConsoleComments(coutObjs);
  }

  if (copyEditorCodeFromConsoleOut) {
    // mark code that comes from editor (is input to console) with '> '
    coutObjs.forEach(obj => {
      if (obj.containsEditorCode) {
        obj.content = '> ' + obj.content;
      }
    });
  } else {
    coutObjs = coutObjs.filter(obj => !obj.containsEditorCode);
  }

  applyWrappingStrategy(
    coutObjs,
    wideConsoleOutLinesStrategy,
    limitMaxLinesPerConsoleOut,
    maxLinesPerConsoleOut,
    maxConsoleOutLineWidth
  );

  const coutStrs = createConsoleOutStrs(
    coutObjs,
    splitConsoleOutOnProducedResult
  );

  const coutCodeBlockStrs = coutStrs
    .map(coutStr => (coutStr.length > 0 ? '```\n' + coutStr + '\n```' : ''))
    .join('\n\n');

  const consoleOutInfoText = includeConsoleOutInfoText
    ? 'The following output was produced in the R Session on DataCamp:\n'
    : '';

  // if ggplot() is used in the plot, mention plot output that should be produced
  // TODO: if very motivated, check if ggplot() is actually called in the code, not just mentioned anywhere in the code (including comments)
  const plotInfoText = editorCodeCompressed.includes('ggplot(')
    ? 'The code creates the following plot:'
    : '';

  return [consoleOutInfoText, coutCodeBlockStrs, plotInfoText]
    .filter(str => str.length > 0)
    .join('\n\n');
}

function createConsoleOutStrs(coutObjs, split) {
  if (!split) {
    return [coutObjs.map(obj => obj.content).join('\n\n')];
  }

  const coutStrs = [];

  let i = 0;
  coutObjs.forEach((obj, j, arr) => {
    if (
      arr[j - 1] &&
      !arr[j - 1].containsEditorCode &&
      obj.containsEditorCode
    ) {
      i++;
    }

    if (!coutStrs[i]) {
      coutStrs[i] = obj.content;
    } else {
      coutStrs[i] += '\n\n' + obj.content;
    }
  });

  return coutStrs;
}

function removeConsoleComments(coutObjs) {
  return coutObjs.filter(obj => {
    HTMLListToMarkdown;
    // we need to check for comments in the editor code from the console and filter them out
    if (obj.containsEditorCode) {
      obj.content = removeComments(obj.content);
      // include output only if content not empty after removing comments
      return obj.content.trim().length > 0;
    }

    // regular console output should always be included
    return true;
  });
}

function processEditorCode(coutObjs, editorCodeCompressed, filter = true) {
  // goal: Find index of last console output content that is relevant for copying and slice coutObjs accordingly, if filter is true
  // if we don't find that index, we can also warn the user that the code was not found in the output

  // For content to be relevant, it must satisfy the following conditions:
  // 1. content is identical to the beginning of the code in the editor (if whitespace and comments are removed in both) - only code from this line onwards can be relevant
  // 2. all editor lines should be included in the content of the console content following the content that was found
  let idxOfObjMarkingStartOfLastCodeOutput = -1; // -1 indicates "not found"

  let remainingEditorCode = editorCodeCompressed;

  for (let i = coutObjs.length - 1; i >= 0; i--) {
    const contentCompressed = coutObjs[i].contentCompressed;
    if (remainingEditorCode.endsWith(contentCompressed)) {
      coutObjs[i].containsEditorCode = true;
      remainingEditorCode = remainingEditorCode.substring(
        0,
        remainingEditorCode.lastIndexOf(contentCompressed)
      );
      if (!remainingEditorCode) {
        idxOfObjMarkingStartOfLastCodeOutput = i;
        break;
      }
    }
  }

  if (editorCodeCompressed && idxOfObjMarkingStartOfLastCodeOutput === -1) {
    showWarning(
      'The code you wrote was not found in the console output. Did you forget to run it?'
    );
  }

  if (filter && idxOfObjMarkingStartOfLastCodeOutput >= 0) {
    return coutObjs.slice(idxOfObjMarkingStartOfLastCodeOutput);
  }

  return coutObjs;
}

function applyWrappingStrategy(
  coutObjs,
  strategy,
  limitMaxLinesPerConsoleOut,
  maxLinesPerConsoleOut,
  maxConsoleOutLineWidth
) {
  let linesWereTruncated = false;

  coutObjs.forEach(obj => {
    if (strategy === 'wrap') {
      // split too wide lines across multiple lines
      obj.content = wrapTooWideLines(obj.content, maxConsoleOutLineWidth);
    } else if (strategy === 'truncate') {
      obj.content = truncateTooWideLines(obj.content, maxConsoleOutLineWidth);
    }

    if (limitMaxLinesPerConsoleOut) {
      const lines = obj.content.split('\n');
      const truncatedLines = lines.slice(0, maxLinesPerConsoleOut);
      const removedLineCount = lines.length - truncatedLines.length;
      if (removedLineCount > 0) {
        linesWereTruncated = true;
        truncatedLines.push(
          `... (${removedLineCount} lines removed for readability reasons)`
        );
      }
      obj.content = truncatedLines.join('\n');
    }
  });

  return linesWereTruncated;
}

function wrapTooWideLines(linesStr, maxWidth) {
  return linesStr
    .split('\n')
    .map(l => {
      if (l.length <= maxWidth) {
        return l;
      }

      const chunks = [];

      for (let i = 0, lLength = l.length; i < lLength; i += maxWidth) {
        chunks.push(l.substring(i, i + maxWidth));
      }

      return chunks.join('\n');
    })
    .join('\n');
}

function truncateTooWideLines(linesStr, maxWidth) {
  return linesStr
    .split('\n')
    .map(l => {
      if (l.length <= maxWidth) {
        return l;
      }
      return l.substring(0, maxWidth + 1) + ' ...';
    })
    .join('\n');
}

function getExerciseInstructions() {
  const instructions = selectElements('.exercise--instructions>*')
    .map(el => {
      return Array.from(el.children)
        .map(el => {
          const textContent = el.textContent.trim();
          if (el.nodeName === 'H4') return `### ${textContent}`; // This is usually the "Question" heading - probably irrelevant for copying
          if (el.nodeName === 'H5') return `#### ${textContent}`; // This is usually "Possible answers" heading - also probably irrelevant
          if (el.nodeName === 'UL') return HTMLListToMarkdown(el) + '\n';
          if (
            el.className.includes('actions') ||
            el.className.includes('feedback')
          )
            return ''; // actions are buttons etc. -> text is irrelevant
          else return textContent;
        })
        .filter(str => str.trim().length > 0)
        .join('\n');
    })
    .join('\n');

  return '\n' + instructions;
}

function getSubExerciseInstructions(idx = 0) {
  // two "sub-exercise layouts" are possible:
  // 1. instructions for every step are listed in containers (one after the other)
  // 2. only instructions for the current step are listed
  //   to see instructions for next step:
  //    * complete current exercise OR
  //    * click link to next exercise (if available)

  // if this container exists, we're dealing with case 1
  const instructionsContainer = document.querySelector(
    '.bullet-instructions-list'
  );

  const currentInstructionEls = instructionsContainer
    ? Array.from(
        document.querySelectorAll(
          '.bullet-instructions-list__instruction-content .exercise--instructions__content'
        )[idx]?.children || []
      )
    : selectElements('.exercise--instructions__content>*');

  const currentInstructions = currentInstructionEls
    .map(HTMLTextLinksCodeToMarkdown)
    .join('\n');

  return (
    ` ${idx + 1}.\n` +
    currentInstructions
      .split('\n')
      .map(line => '    ' + line)
      .join('\n')
  );
}

function removeComments(line) {
  const matchRes = line.match(/(.*(?<!["']))(#.*)/);
  if (!matchRes) {
    // line includes no comment
    return line;
  }
  const code = matchRes[1];
  return code;
}

function removeCommentsLinesStr(linesStr) {
  const noCommentLines = linesStr.split('\n').map(line => {
    if (line.trim().length === 0) {
      // keep regular empty lines
      return line;
    } else {
      const noCommentsLine = removeComments(line);
      // if line consists of only comments, we get back empty string
      if (noCommentsLine.trim().length === 0) {
        // use null as indicator that line should be removed!
        return null;
      }
      return noCommentsLine;
    }
  });

  return noCommentLines.filter(l => l !== null).join('\n');
}

function extractComments(line) {
  const matchRes = line.match(/(.*(?<!["']))(#.*)/);
  if (!matchRes) {
    // line includes no comment
    return '';
  }
  const comment = matchRes[2];
  return comment;
}

async function answerSubmitted() {
  const consoleWrapper = document.querySelector('.console--wrapper');
  const submitAnswerButton = document.querySelector(
    '[data-cy="submit-button"]'
  );

  if (consoleWrapper) {
    return new Promise(resolve => {
      const submitButtonObs = new MutationObserver((recs, obs) => {
        // submit button is disabled once answer is submitted (but not immediately after submitting)

        // if the current exercise is an exercise without subexercises (or the last subexercise), we need to wait for the "continue" button to appear on the site
        if (document.querySelector('.dc-completed__continue')) {
          obs.disconnect();
          resolve();
        }

        // otherwise, (if the submitted exercise is a subexercise, but not the last one), we need to wait for the button to become available again
        // only then the current exercise is submitted completely and the relevant output is in the console
        const isEnabled = !submitAnswerButton.disabled;

        if (isEnabled) {
          obs.disconnect();

          const editorWrapper = selectSingleElement('[id*=editorTab]');

          // editor code for next exercise is not available immediately, it is added later
          // we need to wait for all code lines to appear
          // line numbers appear first, lines (.view-line containers) appear later, one-by-one
          let totalLineCount = Number.MAX_VALUE;
          let addedLinesCount = 0;
          const editorWrapperObs = new MutationObserver((recs, obs) => {
            if (addedLinesCount == totalLineCount) {
              obs.disconnect();
              resolve();
              return;
            }
            recs.forEach(rec => {
              if (rec.addedNodes?.length > 0) {
                const lineNumbersAdded =
                  rec.addedNodes[0].textContent.trim() === '1';
                if (lineNumbersAdded) {
                  totalLineCount = rec.addedNodes.length;
                }
                rec.addedNodes.forEach(el => {
                  if (el.className.includes('view-line')) {
                    addedLinesCount++;
                    if (addedLinesCount === totalLineCount) {
                      // for some reason, this line seems to never be reached in practice!?
                      obs.disconnect();
                      resolve();
                      return;
                    }
                  }
                });
              }
            });
          });

          editorWrapperObs.observe(editorWrapper, {
            childList: true,
            subtree: true,
          });
        }
      });
      submitButtonObs.observe(submitAnswerButton, {
        attributes: true,
        attributeFilter: ['disabled'],
      });
    });
  }
}

async function submitAnswer() {
  const kbEvtInit = {
    key: 'Enter',
    code: 'Enter',
    location: 0,
    ctrlKey: true,
    shiftKey: true,
    altKey: false,
    metaKey: false,
    repeat: false,
    isComposing: false,
    charCode: 0,
    keyCode: 13,
    which: 13,
    detail: 0,
    bubbles: true,
    cancelable: true,
    composed: true,
  };
  dispatchKeyboardEvent(kbEvtInit);

  console.log('submitting answer');
  await answerSubmitted();
  console.log('answer submitted');
}

function dispatchKeyboardEvent(kbEvtInit) {
  const keyboardEvent = new KeyboardEvent('keydown', kbEvtInit);

  const activeElement = document.activeElement;
  document.body.focus();
  document.body.dispatchEvent(keyboardEvent);
  activeElement.focus();
}
