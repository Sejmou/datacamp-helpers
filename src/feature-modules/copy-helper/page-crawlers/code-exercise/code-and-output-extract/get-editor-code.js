import { showWarning } from '../../../index.js';
import {
  selectSingleElement,
  selectElements,
  compareElementYPos,
  isAboveOrOverlapping,
} from '../../../../../util/dom.js';
import { removeCommentsFromCodeLines } from './util.js';

export async function getExerciseCodeMarkdown(
  addEvalFalseToCodeBlock,
  submitCodeInEditor,
  commentHandlingStrategy,
  copyEmptyLines
) {
  const editors = selectElements('.monaco-editor');

  if (editors.length > 1) {
    const editorLines = await getEditorCodeLines();
    const codeCompressed = editorLines.join('').replace(/\s/g, '');

    const codeLines = editorLines
      .filter(l => copyEmptyLines || l.trim().length > 0)
      .map(l => l.replaceAll(' ', ' '));

    const codeMarkdown = getCodeMarkdownFromLines(
      codeLines,
      commentHandlingStrategy,
      addEvalFalseToCodeBlock
    );

    if (submitCodeInEditor) {
      await submitAnswer();
    }

    return { codeMarkdown, codeCompressed };
  } else return '';
}

function getCodeMarkdownFromLines(
  codeLines,
  commentHandlingStrategy,
  addEvalFalse
) {
  switch (commentHandlingStrategy) {
    case 'keep':
      return getEditorCodeBlock(codeLines, addEvalFalse);
    case 'remove':
      return getEditorCodeBlock(
        removeCommentsFromCodeLines(codeLines),
        addEvalFalse
      );
    case 'unindented-to-text':
      return splitIntoCodeChunksWithUnindentedCommentTextBetween(
        codeLines,
        addEvalFalse
      );
    default:
      showWarning(
        `Illegal value '${commentHandlingStrategy}' for comment handling strategy, defaulting to 'drop'`
      );
      return getEditorCodeBlock(
        removeCommentsFromCodeLines(codeLines),
        addEvalFalse
      );
  }
}

// horrific function name I know lol
function splitIntoCodeChunksWithUnindentedCommentTextBetween(
  codeLines,
  addEvalFalse
) {
  const objs = codeLines.reduce(
    (prevObjsArr, currLine) => {
      const prevObj = prevObjsArr.at(-1);
      const currType = currLine.startsWith('#') ? 'comment' : 'code';
      const relevantContent =
        currType === 'comment' ? currLine.replace(/#\s*/, '') : currLine;

      if (prevObj.type === currType) {
        prevObj.lines.push(relevantContent);
        return prevObjsArr;
      } else {
        return [
          ...prevObjsArr,
          {
            type: currType,
            lines: [relevantContent],
          },
        ];
      }
    },
    [
      {
        type: 'comment',
        lines: [],
      },
    ]
  );

  return objs
    .filter(obj => obj.lines.length > 0)
    .map(obj => {
      if (obj.type === 'code') {
        return getEditorCodeBlock(
          removeCommentsFromCodeLines(obj.lines),
          addEvalFalse
        );
      } else {
        // comments converted to text -> output as is (not inside code block)
        return obj.lines.join('\n');
      }
    })
    .join('\n\n');
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

function getEditorCodeBlock(codeLines, addEvalFalse) {
  // filter out any repeated empty lines at end of codeLines
  let lastNonEmptyLineFound = false;
  const codeLinesWithoutEmptyLastLines = codeLines
    .reverse()
    .filter(l => {
      if (lastNonEmptyLineFound) return true;
      if (l.trim().length > 0) {
        lastNonEmptyLineFound = true;
        return true;
      }
      return false;
    })
    .reverse();

  const code = codeLinesWithoutEmptyLastLines.join('\n');
  const RCodeBlock =
    `\`\`\`{r${addEvalFalse ? ', eval=FALSE' : ''}}\n` + code + '\n```';

  return RCodeBlock;
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
        const completedObs = new MutationObserver((_, completedObs) => {
          if (document.querySelector('.dc-completed')) {
            completedObs.disconnect();
            obs.disconnect();
            resolve();
          }
        });
        completedObs.observe(document.body, { subtree: true, childList: true });

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
                  // "fun fact": checking with className.includes() fails for SVG elements, so we instead use classList.contains()
                  // reason: SVG elements have className property too, but it is defined differently: https://stackoverflow.com/a/37949156/13727176
                  if (el.classList.contains('view-line')) {
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
