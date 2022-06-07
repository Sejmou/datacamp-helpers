import { selectElements } from '../../../../../util/dom.js';
import {
  HTMLElementToMarkdown,
  HTMLListToMarkdown,
} from '../../../../../util/markdown-conversion.js';
import { getCodeSubExerciseLink } from '../../../../../util/other.js';

export function getExerciseInstructions() {
  const instructions = selectElements('.exercise--instructions>*')
    .map(el => {
      return Array.from(el.children)
        .map(el => {
          const textContent = el.textContent.trim();
          if (el.nodeName === 'H4') return `### ${textContent}{-}`; // This is usually the "Question" heading (add "{-}" to disable numbering)
          if (el.nodeName === 'H5') return `#### ${textContent}{-}`; // This is usually "Possible answers" heading
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

export function getSubExerciseInstructions(idx, addHeading) {
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
    : selectElements('.exercise--instructions>*>*').filter(
        el =>
          !(
            el.className.includes('actions') ||
            el.className.includes('dc-sct-feedback')
          )
      ); // filter out e.g. multiple choice actions (containing submit button, no relevant content) or feedback for incorrect submissions

  const currentInstructions = currentInstructionEls
    .map(HTMLElementToMarkdown)
    // add additional nesting to headings, suppress numbering (by adding {-} to the end)
    .map(mdStr => (mdStr.startsWith('#') ? '#' + mdStr + '{-}' : mdStr))
    .join('\n\n');

  return (
    (addHeading ? `### Subtask ${idx + 1}{-}\n` : '') + currentInstructions
  );
}

export function getLinkToNextSubExercise() {
  return getCodeSubExerciseLink(1);
}

export function getSubExerciseIndex() {
  const subExerciseBullets = selectElements(
    // selectors for horizontally and vertically arranged bullets
    '.progress-bullet__link, .bullet-instructions-list .bullet-instruction'
  );

  const currSubExerciseIdx = subExerciseBullets.findIndex(b =>
    b.className.includes('active')
  );

  return currSubExerciseIdx;
}
