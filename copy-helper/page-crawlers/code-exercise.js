import {
  getExerciseContent,
  pasteSubExercisesTogether,
  submitAnswerOnCopy,
} from '../copy-helper.js';

export async function exerciseCrawler(includeConsoleOutput = false) {
  const exerciseContent = await getExerciseContent(
    includeConsoleOutput,
    pasteSubExercisesTogether,
    submitAnswerOnCopy
  );

  return exerciseContent;
}
