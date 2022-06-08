import { selectElements } from './dom.js';

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

export function dispatchKeyboardEvent(kbEvtInit) {
  const keyboardEvent = new KeyboardEvent('keydown', kbEvtInit);

  const activeElement = document.activeElement;
  document.body.focus();
  document.body.dispatchEvent(keyboardEvent);
  activeElement.focus();
}

export async function getCurrentPage() {
  // Here, we figure out what page (or iframe) the script is running on - this was not so trivial as expected lol
  // The DataCamp course content is loaded inside iframes on the course overview page, essentially creating isolated DOMs
  // We cannot access the content/DOM of the iframe from script instances running on the main page due to CORS issues!
  // However, luckily, TamperMonkey can also be loaded into iframes directly, as long as the iframe URL matches any @include in the meta tags
  // This means that in case iframes from datacamp are also loaded, several script instances may be running at the same time

  // We need to make everything async because of the video page
  // we cannot be sure that we're looking at the video page until the document body is modified and a certain element becomes available
  if (document.body.className.includes('js-application')) {
    return 'overview';
  } else if (document.querySelector('.slides')) {
    return 'video-iframe';
  } else if (document.querySelector('.drag-and-drop-exercise')) {
    return 'dragdrop-exercise';
  } else if (document.querySelector('.exercise--sidebar-header')) {
    return 'exercise';
  } else if (
    document.querySelector('[class*="dc-panel dc-u-h-100pc exercise__sidebar"]')
  ) {
    return 'mc-exercise';
  } else if (
    document.querySelector('[data-cy*="video-exercise"]')
    // video already loaded
  ) {
    return 'video';
  } else {
    return new Promise(resolve => {
      // page content not yet loaded
      // wait for relevant DOM elments to appear
      new MutationObserver((_, obs) => {
        if (document.querySelector('[data-cy*="video-exercise"]')) {
          resolve('video');
          obs.disconnect();
        } else if (document.querySelector('.drag-and-drop-exercise')) {
          resolve('dragdrop-exercise');
          obs.disconnect();
        } else if (
          document.querySelector(
            '[class*="dc-panel dc-u-h-100pc exercise__sidebar"]'
          )
        ) {
          resolve('mc-exercise');
          obs.disconnect();
        }
      }).observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
  }
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
