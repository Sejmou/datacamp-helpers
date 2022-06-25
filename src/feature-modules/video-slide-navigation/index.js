import { addStyle, createButton, selectSingleElement } from '../../util/dom.js';
import { addShortcut, FunctionShortcut } from '../keyboard-shortcuts/index.js';
import { SlideViewer } from './slide-viewer.js';

export function enable() {
  console.log(
    'slide navigation enabled (use Ctrl + Shift + J to jump to next slide or Ctrl + Shift + K to jump to previous one)'
  );

  const slideViewer = new SlideViewer(selectSingleElement('video'));
  addNavigationButtons(slideViewer);
  addNavigationShortcuts(slideViewer);
}

function addNavigationButtons(slideViewer) {
  const btnWrapperClass = 'copy-helper-slide-select-btn-wrapper';
  addStyle(
    `.${btnWrapperClass} {
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 990;
        transition: 0.25s all;
        display: flex;
        gap: 10px;
      }
    )`
  );

  const btnWrapper = document.createElement('div');
  btnWrapper.className = btnWrapperClass;

  const prevBtn = createButton('Prev. Slide');
  const nextBtn = createButton('Next Slide');
  btnWrapper.appendChild(prevBtn);
  btnWrapper.appendChild(nextBtn);
  document.body.appendChild(btnWrapper);
  prevBtn.addEventListener('click', () => slideViewer.previousSlide());
  nextBtn.addEventListener('click', () => slideViewer.nextSlide());
}

function addNavigationShortcuts(slideViewer) {
  // TODO: fix issue with keyboard mapping conflict (K is also used as hotkey for play/pause of video)
  // if last video slide is reached, play/pause of video is still triggered when actually pressing ctrl + shift + k
  addShortcut(
    new FunctionShortcut(
      {
        code: 'KeyK',
        ctrlKey: true,
        shiftKey: true,
      },
      () => slideViewer.nextSlide(),
      true
    )
  );

  addShortcut(
    new FunctionShortcut(
      {
        code: 'KeyJ',
        ctrlKey: true,
        shiftKey: true,
      },
      () => slideViewer.previousSlide(),
      true
    )
  );

  // either show video or only slides
  let showSlidesOnly = false;

  addShortcut(
    new FunctionShortcut(
      {
        code: 'KeyV',
      },
      () => {
        showSlidesOnly = !showSlidesOnly;
        console.log('test');
        if (showSlidesOnly) {
          slideViewer.showSlides();
        } else {
          slideViewer.returnToVideo();
        }
      },
      true
    )
  );
}
