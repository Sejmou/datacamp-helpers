import { multipleChoiceExerciseCrawler } from './page-crawlers/multiple-choice.js';
import { dragDropExerciseCrawler } from './page-crawlers/drag-drop.js';
import { overviewCrawler } from './page-crawlers/course-overview.js';
import { videoPageCrawler } from './page-crawlers/video-page.js';
import { videoIframeCrawler } from './page-crawlers/video-iframe.js';
import { exerciseCrawler } from './page-crawlers/code-exercise/index.js';
import { addStyle, createButton } from '../../util/dom.js';
import { getCurrentPage, copyToClipboard } from '../../util/other.js';
import { showInfoSnackbar } from '../../util/show-snackbar.js';

// config for all types of exercises
const includeTaskAndSolutionHeadings = true; // whether fitting subheadings for differentiating between task and task solution should be added automatically when copying exercises
const submitAnswerOnCopy = true; // whether the answer should automatically be submitted before copying it

// config for code exercises
const codeExerciseConfig = {
  commentHandlingStrategy: 'unindented-to-text', // options: 'keep', 'remove', 'unindented-to-text'; the last option converts unindented comments to regular markdown text, splitting the code into several blocks, any other (indented) comments are removed
  copyEmptyLines: true,
  copyEditorCodeFromConsoleOut: true, // whether editor code reappearing in the console output should also be copied - useful to keep track of what code produced what output; effectively defaults to true if commentHandlingStrategy === 'unindented-to-text'
  copyOnlyConsoleOutOfCodeInEditor: true, // whether all previous output of the console that is not related to last execution of code currently in editor should be excluded when copying
  limitMaxLinesPerConsoleOut: true, // whether the maximum number of lines included when copying a single "thing" printed to the console should be limited when copying
  maxLinesPerConsoleOut: 20, // the maximum number of lines included when copying a single "thing" printed to the console (if limitMaxLinesPerConsoleOut true)
  pasteSubExercisesTogether: true, // CAUTION: possibly a bit buggy - try refreshing browser if it doesn't work first time! defines whether the instructions, code, and, optionally, output of all completed sub-exercises should be pasted together when copying (executing the code of each sub-exercise, too)
  includeConsoleOutInfoText: false, // Adds text indicating that the console output comes from R session on DataCamp, not local machine
  wideConsoleOutLinesStrategy: 'truncate', // specify how to deal with console output that is too wide; options: 'wrap', 'truncate', 'none'
  maxConsoleOutLineWidth: 90, // recommended: 90 -> should be exactly width of regular R Markdown code cells
};

export async function run() {
  console.log('copy helper running');
  const currentPage = await getCurrentPage();
  if (currentPage === 'other') {
    // nothing interesting to copy, just return directly!
    return;
  }

  const elementsAddedToDocument = [];
  const addToDocumentBody = el => {
    document.body.appendChild(el);
    elementsAddedToDocument.push(el);
  };

  const initialExercise = getURLQueryParams().ex;
  if (initialExercise) {
    // only reached when on an exercise page
    const detectExerciseChange = function () {
      const currentExercise = getURLQueryParams().ex;
      if (currentExercise != initialExercise) {
        handleExerciseChange();
      }
    };

    const detectionTimer = setInterval(detectExerciseChange, 1000); // apparently there's no event-based way to detect change in URL query

    const handleExerciseChange = () => {
      // cleanup
      elementsAddedToDocument.forEach(el => el.remove());

      // run script again to make sure elements relevant to new subpage are added
      run();
      clearInterval(detectionTimer); // after script was run on new page, remove exercise page change detection timer
    };
  }

  const btn = createCopyButton();

  // on some pages we want to position the button differently
  // for this, we add a CSS class for the current page
  btn.classList.add(currentPage);

  const checkboxId = 'datacamp-copy-helper-checkbox';

  if (currentPage === 'video-iframe' || currentPage === 'exercise') {
    const checkboxContainer = createConsoleOutputToggleCheckbox(checkboxId);
    addToDocumentBody(checkboxContainer);

    if (currentPage === 'video-iframe') {
      checkboxContainer.classList.add('video-iframe');
    }
  }

  const pageCrawlers = new Map([
    ['overview', overviewCrawler],
    [
      'exercise',
      async () => {
        const includeConsoleOutput =
          document.getElementById(checkboxId).checked;
        return exerciseCrawler(
          includeConsoleOutput,
          submitAnswerOnCopy,
          includeTaskAndSolutionHeadings,
          codeExerciseConfig
        );
      },
    ],
    [
      'dragdrop-exercise',
      () =>
        dragDropExerciseCrawler(
          includeTaskAndSolutionHeadings,
          submitAnswerOnCopy
        ),
    ],
    ['video', videoPageCrawler],
    [
      'video-iframe',
      () => {
        const includeCodeOutput = document.getElementById(checkboxId).checked;
        return videoIframeCrawler(includeCodeOutput);
      },
    ],
    [
      'mc-exercise',
      () =>
        multipleChoiceExerciseCrawler(
          submitAnswerOnCopy,
          includeTaskAndSolutionHeadings
        ),
    ],
  ]);

  const copyFn = async () => {
    const pageCrawler = pageCrawlers.get(currentPage);
    const clipboardContent = await pageCrawler();
    copyToClipboard(clipboardContent);
    showInfoSnackbar('Copied R markdown to clipboard!');
  };
  btn.addEventListener('click', copyFn);

  document.addEventListener(
    'keydown',
    event => {
      if (
        event.ctrlKey &&
        event.shiftKey &&
        !event.metaKey &&
        !event.altKey &&
        event.code === 'KeyC'
      ) {
        copyFn();
        event.preventDefault();
      }
    },
    { capture: true }
  );

  addToDocumentBody(btn);
}

function getURLQueryParams() {
  return new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
  });
}

function createCopyButton() {
  const btnId = 'copy-helper-btn';
  const btn = createButton('copy to clipboard', btnId);

  addStyle(`
  #${btnId} {
    position: fixed;
    top: 51px;
    right: 350px;
    z-index: 999;
    transition: 0.25s all;
  }

  #${btnId}:active {
    transform: scale(0.92);
    box-shadow: 3px 2px 22px 1px rgba(0, 0, 0, 0.24);
  }

  /*The following two classes help us position the button better for specific sites*/
  #${btnId}.overview { 
    top: 40px;
    right: 40px;
  }

  #${btnId}.video-iframe {
    top: 10px;
    right: 10px;
  }

  #${btnId}.video, #${btnId}.dragdrop-exercise, #${btnId}.mc-exercise {
    top: 70px;
    right: 70px;
  }
  `);

  return btn;
}

function createConsoleOutputToggleCheckbox(checkboxId) {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = checkboxId;
  checkbox.checked = true; // set to true initially, TODO: save this setting between re-runs of the script

  const label = document.createElement('label');
  label.htmlFor = checkboxId;
  label.appendChild(document.createTextNode('include code output?'));

  const container = document.createElement('div');
  const containerId = checkboxId + 'container';
  container.id = containerId;

  container.appendChild(checkbox);
  container.appendChild(label);

  addStyle(`
    #${containerId} {
      position: fixed;
      top: 51px;
      right: 140px;
      z-index: 999;
      color: white;
      display: flex;
      justify-content: center;
      height: 30px;
      align-items: center;
      gap: 10px;
    }

    #${containerId}.video-iframe {
      color: black;
      right: 164px;
      top: 7px;
    }
  
    #${containerId}:hover, #${containerId} *:hover {
      cursor: pointer;
    }
  `);

  return container;
}
