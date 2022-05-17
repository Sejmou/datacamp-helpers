import {
  getTextContent,
  selectElements,
  HTMLTextLinksCodeToMarkdown,
  getDragIntoOrderContent,
  getDragdropContent,
} from '../copy-helper.js';

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
