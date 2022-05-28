import { selectElements, getTextContent } from '../../util/dom.js';
import { HTMLElementToMarkdown } from '../../util/markdown-conversion.js';
import { extractCodeWithInstructionsAndOutput } from './code-and-output-extract/index.js';
import {
  getSubExerciseIndex,
  getLinkToNextSubExercise,
} from './code-and-output-extract/get-instructions.js';

export async function exerciseCrawler(
  includeConsoleOutput,
  submitCodeInEditor,
  includeTaskAndSolutionHeadings,
  config
) {
  const exerciseTitle = `## ${getTextContent('.exercise--title')}`;

  const exercisePars = selectElements('.exercise--assignment>div>*')
    .map(p => HTMLElementToMarkdown(p))
    .join('\n\n');

  const exerciseIntro = [exerciseTitle, exercisePars].join('\n');

  let subExIdx = getSubExerciseIndex();
  const hasSubexercises = subExIdx !== -1;

  const exerciseContent = [];

  const configAll = {
    includeConsoleOutput,
    submitCodeInEditor,
    includeTaskAndSolutionHeadings,
    ...config,
  };

  if (!hasSubexercises) {
    exerciseContent.push(await extractCodeWithInstructionsAndOutput(configAll));
  } else {
    while (getLinkToNextSubExercise()) {
      exerciseContent.push(
        await extractCodeWithInstructionsAndOutput(configAll, subExIdx)
      );
      subExIdx++;
    }
    exerciseContent.push(
      await extractCodeWithInstructionsAndOutput(configAll, subExIdx)
    );
  }

  return [exerciseIntro, ...exerciseContent].join('\n\n');
}
