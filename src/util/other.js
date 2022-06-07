// apparently only working solution to copy to clipboard from Chrome Extension: https://stackoverflow.com/a/22702538 https://stackoverflow.com/a/60349158
export function copyToClipboard(text) {
  const ta = document.createElement('textarea');
  ta.style.cssText =
    'opacity:0; position:fixed; width:1px; height:1px; top:0; left:0;';
  ta.value = text;
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand('copy');
  ta.remove();
}

export function getCodeSubExerciseLink(offsetFromCurrent) {
  const subExerciseBullets = selectElements(
    // selectors for horizontally and vertically arranged bullets
    '.progress-bullet__link, .bullet-instructions-list .bullet-instruction'
  );

  const currSubExerciseIdx = subExerciseBullets.findIndex(b =>
    b.className.includes('active')
  );

  return subExerciseBullets[currSubExerciseIdx + offsetFromCurrent];
}
