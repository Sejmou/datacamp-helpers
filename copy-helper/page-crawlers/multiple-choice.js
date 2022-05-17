import { HTMLTextLinksCodeToMarkdown, selectElements } from '../copy-helper.js';

export function multipleChoiceExerciseCrawler(
  submitAnswerOnCopy,
  includeTaskAndSolutionHeadings
) {
  const headingEl = document.querySelector('h1');
  const heading = headingEl ? `## ${headingEl?.textContent}` : '';
  const descriptionParts = Array.from(headingEl?.nextSibling?.children || [])
    .map(el => HTMLTextLinksCodeToMarkdown(el))
    .join('\n\n');

  const options = selectElements('.dc-panel__body>*')
    .map(el => {
      if (el.nodeName !== 'UL') return el;
      const copy = el.cloneNode(true);
      // ul may have press [1], press [2] etc. option texts - irrelevant when copying!
      copy.querySelectorAll('.dc-u-ifx').forEach(c => c.remove());
      return copy;
    })
    .filter(el => !el.querySelector('[data-cy="submit-button"]')) // if query selector matches, element is container for 'submit answer' button - irrelevant when copying
    .map(el => HTMLTextLinksCodeToMarkdown(el))
    .join('\n');

  const solutionHeading = includeTaskAndSolutionHeadings ? '### Solution' : '';

  if (submitAnswerOnCopy) {
    const submitButton = document.querySelector('[data-cy="submit-button"]');
    submitButton?.click();
  }

  return (
    [heading, descriptionParts, options, solutionHeading]
      .filter(l => l.length > 0)
      .join('\n\n') + '\n'
  );
}
