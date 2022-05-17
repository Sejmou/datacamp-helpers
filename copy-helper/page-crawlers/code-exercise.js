import { getExerciseContent } from '../copy-helper.js';

export async function exerciseCrawler(
  includeConsoleOutput,
  pasteSubExercisesTogether,
  submitAnswerOnCopy,
  includeTaskAndSolutionHeadings
) {
  const exerciseContent = await getExerciseContent(
    includeConsoleOutput,
    pasteSubExercisesTogether,
    submitAnswerOnCopy,
    includeTaskAndSolutionHeadings
  );

  return exerciseContent;
}
