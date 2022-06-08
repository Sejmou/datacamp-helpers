import { HTMLElementToMarkdown } from '../../../util/markdown-conversion.js';
import {
  getTextContent,
  getTextContents,
  selectSingleElement,
  selectElements,
} from '../../../util/dom.js';

export function dragDropExerciseCrawler(
  includeTaskAndSolutionHeadings,
  submitAnswerOnCopy
) {
  const exerciseTitle = `## ${getTextContent('.dc-panel__body h4')}`;

  const [descContainer, instructionsContainer] = selectElements(
    '.le-shared-sticky-header+div>div>div'
  );

  const exercisePars = selectElements('*', descContainer)
    .map(p => HTMLElementToMarkdown(p))
    .join('\n\n');

  const instructionsSubheading = includeTaskAndSolutionHeadings
    ? '### Instructions'
    : '';

  const exerciseInstructions = selectElements('li', instructionsContainer)
    .map(li => ' * ' + HTMLElementToMarkdown(li))
    .join('\n');

  const solutionSubheading = includeTaskAndSolutionHeadings
    ? '### Solution'
    : '';

  const dragdropExerciseContent = document.querySelector(
    '[data-cy*="order-exercise"]'
  )
    ? getDragIntoOrderContent()
    : getDragdropContent();

  const rMarkdown = [
    exerciseTitle,
    exercisePars,
    instructionsSubheading,
    exerciseInstructions,
    solutionSubheading,
    dragdropExerciseContent,
  ]
    .filter(l => l.length > 0)
    .join('\n\n');

  if (submitAnswerOnCopy) {
    const submitButton = document.querySelector('[data-cy="submit-button"]');
    submitButton?.click();
  }

  return rMarkdown;
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
    const contentContainer = h.parentNode;
    return Array.from(contentContainer.querySelector('div').children).map(div =>
      div.textContent.trim()
    );
  });

  const contentRows = twoDArrayFromColArrays(contentCols).map(col => {
    return stringArrToMarkdownTableRow(col);
  });
  return [headerRow, sep, ...contentRows].join('\n');
}

function getDragIntoOrderContent() {
  return (
    'The correct order is:\n\n' +
    getTextContents('[data-cy*="droppable-area"]>div')
      .map((str, i) => ` ${i + 1}. ${str}`)
      .join('\n')
  );
}

function stringArrToMarkdownTableRow(strArr) {
  return '| ' + strArr.join(' | ') + ' |';
}

function twoDArrayFromColArrays(colArrays) {
  let arrMaxLength = 0;
  colArrays.forEach(arr => {
    if (arr.length > arrMaxLength) {
      arrMaxLength = arr.length;
    }
  });

  const output = new Array(arrMaxLength);

  for (let row = 0; row < arrMaxLength; row++) {
    const rowValues = colArrays.map(arr => arr[row] || '     ').flat();
    output[row] = rowValues;
  }

  return output;
}
