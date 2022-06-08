import { showInfoSnackbar } from '../../util/show-snackbar.js';
import { addStyle, selectElements } from '../../util/dom.js';
import { copyToClipboard } from '../../util/other.js';

// config
const autoPaste = true;
let enabled = false;

let trackedCodeElements = [];
const tooltipClassName = 'datacamp-copy-helper-tooltip';

addStyle(`
.${tooltipClassName} {
  position:relative; /* making the .tooltip span a container for the tooltip text */
  white-space: nowrap;
  cursor: pointer;
}

.${tooltipClassName}:before {
  content: attr(data-text); /* here's the magic */
  position:absolute;
  
  /* vertically center */
  
  z-index: 999;
  top: 110%;
  left: 0%;
  
  
  /* basic styles */
  width: 120px;
  border-radius:2px;
  background:#000;
  color: #fff;
  text-align:center;
  white-space: nowrap;

  display:none; /* hide by default */
}

.${tooltipClassName}:hover:before {
  display:block;
}`);

const clickHandler = evt => {
  const el = evt.target;
  copyToClipboard(el.textContent);
  if (autoPaste) {
    selectElements('.inputarea.monaco-mouse-cursor-text')[0].focus();
    document.execCommand('paste');
    showInfoSnackbar('Code pasted and copied to clipboard!');
    evt.preventDefault();
  } else {
    showInfoSnackbar('Code copied to clipboard!');
  }
};

let sidebar;

function checkForSidebarChange() {
  const newSidebar = document.querySelector('.exercise--sidebar');
  if (newSidebar && newSidebar !== sidebar) {
    sidebar = newSidebar;
    sidebarObs.observe(sidebar, { childList: true, subtree: true });
    checkForAddedCode();
  }
}

function checkForAddedCode() {
  const codeElements = Array.from(sidebar?.querySelectorAll('code') || []);

  const newElements = codeElements.filter(
    el => !el.classList.contains(tooltipClassName)
  );

  if (enabled) {
    addCopyFunctionality(newElements);
  }

  trackedCodeElements = codeElements;
}

const bodyObs = new MutationObserver(checkForSidebarChange);
const sidebarObs = new MutationObserver(checkForAddedCode);

export function enableCodeQuickCopy() {
  console.log('code quick copy enabled');
  enabled = true;
  addCopyFunctionality(trackedCodeElements);
  bodyObs.observe(document.body, { childList: true, subtree: true });
  checkForSidebarChange();
}

export function disableCodeQuickCopy() {
  enabled = false;
  removeCopyFunctionality(trackedCodeElements);
  bodyObs.disconnect();
  sidebarObs.disconnect();
}

function addCopyFunctionality(codeElements) {
  codeElements.forEach(c => {
    c.addEventListener('click', clickHandler);
    c.dataset.text = autoPaste ? 'click to paste' : 'click to copy';
    c.classList.add(tooltipClassName);
  });
}

function removeCopyFunctionality(codeElements) {
  codeElements.forEach(c => {
    c.removeEventListener('click', clickHandler);
    c.classList.remove(tooltipClassName);
  });
}
