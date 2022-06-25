import { addStyle, createButton, selectSingleElement } from '../../util/dom.js';
import { addShortcut, FunctionShortcut } from '../keyboard-shortcuts/index.js';
import { SlideViewer } from './slide-viewer.js';

export function enable() {
  console.log(
    'slide navigation enabled (use Ctrl + Shift + J to jump to next slide or Ctrl + Shift + K to jump to previous one)'
  );

  const slideViewer = new SlideViewer(selectSingleElement('video'));
  addUIControls(slideViewer);
  addNavigationShortcuts(slideViewer);
}

function addUIControls(slideViewer) {
  const uiWrapperClass = 'copy-helper-slide-select-btn-wrapper';
  addStyle(
    `.${uiWrapperClass} {
        position: fixed;
        top: 5px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 990;
        transition: 0.25s all;
        display: flex;
        gap: 10px;
      }
    )`
  );

  const uiWrapper = document.createElement('div');
  uiWrapper.className = uiWrapperClass;

  const { prevBtn, nextBtn } = createNavigationButtons(slideViewer);
  const { checkbox, checkboxContainer } = createModeSwitchCheckbox(slideViewer);
  slideViewer.addDisplayModeCheckbox(checkbox); // fckin state synchronization, I'm such an idiot for not using React or anything similar lol

  const uiElements = [prevBtn, nextBtn, checkboxContainer];

  uiElements.forEach(el => uiWrapper.appendChild(el));

  document.body.appendChild(uiWrapper);
}

function createModeSwitchCheckbox(slideViewer) {
  const { checkbox, container: checkboxContainer } = createCheckboxAndContainer(
    'datacamp-helpers-slide-viewer-checkbox',
    'view slides only?'
  );
  checkboxContainer.checked = false; // set to false initially, TODO: save this setting between re-runs of the script
  checkbox.addEventListener('change', () => {
    checkbox.checked ? slideViewer.showSlides() : slideViewer.returnToVideo();
  });

  return { checkbox, checkboxContainer };
}

function createCheckboxAndContainer(checkboxId, labelText) {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = false;
  checkbox.id = checkboxId;

  const label = document.createElement('label');
  label.htmlFor = checkboxId;
  label.appendChild(document.createTextNode(labelText));
  label.style.userSelect = 'none';

  const container = document.createElement('div');
  const containerId = checkboxId + 'container';
  container.id = containerId;

  container.appendChild(checkbox);
  container.appendChild(label);

  addStyle(`
      #${containerId} {
        display: flex;
        justify-content: center;
        height: 30px;
        align-items: center;
        gap: 10px;
        color: black;
      }
    
      #${containerId}:hover, #${containerId} *:hover {
        cursor: pointer;
      }
    `);

  return { container, checkbox };
}

function createNavigationButtons(slideViewer) {
  const prevBtn = createButton('Prev. Slide');
  const nextBtn = createButton('Next Slide');
  prevBtn.addEventListener('click', () => slideViewer.previousSlide());
  nextBtn.addEventListener('click', () => slideViewer.nextSlide());

  return { prevBtn, nextBtn };
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
