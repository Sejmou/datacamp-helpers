import { getExerciseCodeMarkdown } from './get-editor-code.js';
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
    commentHandlingStrategy,
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

  const { codeMarkdown, codeCompressed } = await getExerciseCodeMarkdown(
    includeConsoleOutput,
    submitCodeInEditor,
    commentHandlingStrategy,
    copyEmptyLines
  );
  const consoleOut = includeConsoleOutput
    ? getConsoleOutput(
        codeCompressed,
        commentHandlingStrategy,
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

  return [taskHeading, instructions, solutionHeading, codeMarkdown, consoleOut]
    .filter(str => str.length > 0)
    .join('\n\n');
}