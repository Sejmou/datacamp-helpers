import { getTextContents } from '../../../util/dom.js';
import { showWarning } from '../../../copy-helper.js';
import { removeCommentsFromCodeLines } from './util.js';

export function getConsoleOutput(
  editorCodeCompressed = '',
  commentHandlingStrategy,
  copyEditorCodeFromConsoleOut,
  copyOnlyConsoleOutOfCodeInEditor,
  limitMaxLinesPerConsoleOut,
  maxLinesPerConsoleOut,
  wideConsoleOutLinesStrategy,
  maxConsoleOutLineWidth,
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
      type: 'output', // will be updated with correct in processEditorCode
    }));

  coutObjs = processEditorCode(
    coutObjs,
    editorCodeCompressed,
    copyOnlyConsoleOutOfCodeInEditor
  );

  applyWrappingStrategy(
    coutObjs,
    wideConsoleOutLinesStrategy,
    limitMaxLinesPerConsoleOut,
    maxLinesPerConsoleOut,
    maxConsoleOutLineWidth
  );

  const coutCodeBlockStrs = createConsoleOutBlockStrs(
    coutObjs,
    commentHandlingStrategy,
    copyEditorCodeFromConsoleOut
  );

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
      coutObjs[i].type = 'code';
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

  if (editorCodeCompressed.startsWith('DM.result')) {
    // DataCamp adds such a line into code editor when submitting an answer to some MC question
    // code editor content (and console output) is therefore irrelevant!
    // set idxOfObjMarkingStartOfLastCodeOutput to length of coutObjs array to effectively not copy anything
    idxOfObjMarkingStartOfLastCodeOutput = coutObjs.length;
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

function createConsoleOutBlockStrs(
  coutObjs,
  commentHandlingStrategy,
  copyEditorCodeFromConsoleOut
) {
  // goal: group into consecutive blocks of code/non-code blocks
  const coutObjsGrouped = [];

  coutObjs.forEach(obj => {
    if (
      commentHandlingStrategy === 'unindented-to-text' &&
      obj.type === 'code' &&
      obj.content.startsWith('#')
    ) {
      obj.content = obj.content.replace(/#\s*/, '');
      obj.type = 'text';
    }

    const prevObj = coutObjsGrouped.at(-1);
    if (!prevObj) {
      coutObjsGrouped.push(obj);
      return;
    }

    const prevType = prevObj.type;
    console.log(obj.type, prevType);
    if (obj.type === prevType) {
      prevObj.content += (obj.type === 'output' ? '\n\n' : '\n') + obj.content;
    } else {
      coutObjsGrouped.push(obj);
    }
  });

  return coutObjsGrouped
    .filter(obj => copyEditorCodeFromConsoleOut || !obj.type === 'code')
    .map(obj => {
      if (obj.type === 'text') {
        return obj.content;
      } else {
        // code
        const content =
          commentHandlingStrategy !== 'keep'
            ? removeCommentsFromCodeLines(obj.content.split('\n')).join('\n')
            : obj.content;

        return (
          '```' +
          (obj.type === 'code' ? '{r, eval = FALSE}' : '') +
          '\n' +
          content +
          '\n```'
        );
      }
    })
    .join('\n\n');
}
