import { getExerciseCode } from './get-editor-code.js';
import { getConsoleOutput } from './get-console-out.js';
import {
  getSubExerciseInstructions,
  getExerciseInstructions,
} from './get-instructions.js';

export async function extractCodeWithInstructionsAndOutput(
  config,
  subExIdx = null
) {
  const {
    includeConsoleOutput,
    submitCodeInEditor,
    includeTaskAndSolutionHeadings,
    copyRSessionCodeComments,
    copyEmptyLines,
    copyEditorCodeFromConsoleOut,
    copyOnlyConsoleOutOfCodeInEditor,
    limitMaxLinesPerConsoleOut,
    maxLinesPerConsoleOut,
    wideConsoleOutLinesStrategy,
    maxConsoleOutLineWidth,
    splitConsoleOutOnProducedResult,
    includeConsoleOutInfoText,
  } = config;

  const taskHeading =
    includeTaskAndSolutionHeadings && subExIdx !== null ? '### Task' : '';

  const instructions =
    subExIdx !== null
      ? getSubExerciseInstructions(subExIdx)
      : getExerciseInstructions();

  const solutionHeading =
    includeTaskAndSolutionHeadings && subExIdx !== null ? '### Solution' : '';

  const { code, codeCompressed } = await getExerciseCode(
    includeConsoleOutput,
    submitCodeInEditor,
    copyRSessionCodeComments,
    copyEmptyLines
  );
  const consoleOut = includeConsoleOutput
    ? getConsoleOutput(
        codeCompressed,
        copyRSessionCodeComments,
        copyEditorCodeFromConsoleOut,
        copyOnlyConsoleOutOfCodeInEditor,
        limitMaxLinesPerConsoleOut,
        maxLinesPerConsoleOut,
        wideConsoleOutLinesStrategy,
        maxConsoleOutLineWidth,
        splitConsoleOutOnProducedResult,
        includeConsoleOutInfoText
      )
    : '';

  return [taskHeading, instructions, solutionHeading, code, consoleOut]
    .filter(str => str.length > 0)
    .join('\n\n');
}
