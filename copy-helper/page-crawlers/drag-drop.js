import {
  HTMLTextLinksCodeToMarkdown,
  getDragIntoOrderContent,
  twoDArrayFromColArrays,
  stringArrToMarkdownTableRow,
} from '../copy-helper.js';
import {
  getTextContent,
  selectSingleElement,
  selectElements,
} from '../util/dom.js';

export function dragDropExerciseCrawler(
  includeTaskAndSolutionHeadings,
  submitAnswerOnCopy
) {
  const exerciseTitle = `## ${getTextContent('.dc-panel__body h4')}`;

  const [descContainer, instructionsContainer] = selectElements(
    '.le-shared-sticky-header+div>div>div'
  );

  const exercisePars = selectElements('*', descContainer)
    .map(p => HTMLTextLinksCodeToMarkdown(p))
    .join('\n\n');

  const instructionsSubheading = includeTaskAndSolutionHeadings
    ? '### Instructions'
    : '';

  const exerciseInstructions = selectElements('li', instructionsContainer)
    .map(li => ' * ' + HTMLTextLinksCodeToMarkdown(li))
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
