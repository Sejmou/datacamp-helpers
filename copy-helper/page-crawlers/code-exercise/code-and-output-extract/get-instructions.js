import { selectElements } from '../../../util/dom.js';
import {
  HTMLTextLinksCodeToMarkdown,
  HTMLListToMarkdown,
} from '../../../util/markdown-conversion.js';

export function getExerciseInstructions() {
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

export function getSubExerciseInstructions(idx) {
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
    : [
        ...selectElements('.exercise--instructions__content>*'),
        ...selectElements('.exercise--instructions>*>*'),
      ].filter(el => !el.className.includes('actions')); // filter out e.g. multiple choice actions (containing submit button, no relevant content)

  console.log('instruction elements', currentInstructionEls);

  const currentInstructions = currentInstructionEls
    .map(HTMLTextLinksCodeToMarkdown)
    .map(mdString =>
      // Markdown headings don't work inside sub exercise instructions (as they are inside numbered list)
      // replace them with bold text
      mdString.replace(/#*(\s*)(.*)/, (str, spaceCapture, restCapture) =>
        str.length === spaceCapture.length + restCapture.length
          ? str
          : `**${restCapture}**`
      )
    )
    .join('\n\n');

  return (
    ` ${idx + 1}.\n` +
    currentInstructions
      .split('\n')
      .map(line => '    ' + line)
      .join('\n')
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
