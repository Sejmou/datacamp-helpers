import { showInfo } from '../copy-helper.js';
import { addStyle } from '../util/dom.js';
import { copyToClipboard } from '../util/other.js';

const trackedCodeElements = [];
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
  width: 115px;
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
  showInfo('Code copied to clipboard!');
};

function addCopyFunctionalityToAddedCode(mutationRecords) {
  mutationRecords.forEach(rec =>
    rec.addedNodes.forEach(n => {
      if (!(n instanceof HTMLElement)) {
        return;
      }
      const addedCode = n.querySelectorAll('code') || [];
      addedCode.forEach(c => {
        if (trackedCodeElements.includes(c)) {
          return;
        }

        c.addEventListener('click', clickHandler);
        c.dataset.text = 'click to copy';
        c.classList.add(tooltipClassName);

        trackedCodeElements.push(c);
      });
    })
  );
}

const codeAddedObs = new MutationObserver(addCopyFunctionalityToAddedCode);

export function enableCodeQuickCopy() {
  trackedCodeElements.forEach(c => c.addEventListener('click', clickHandler));
  codeAddedObs.observe(document.body, { childList: true, subtree: true });
}

export function disableCodeQuickCopy() {
  trackedCodeElements.forEach(c => {
    c.removeEventListener('click', clickHandler);
    c.classList.remove(tooltipClassName);
  });
  codeAddedObs.disconnect();
}
