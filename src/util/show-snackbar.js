import { createSnackbar, showSnackbar } from './dom.js';

const infoSnackbarId = 'copy-helper-info-snackbar';
const warningSnackbarId = 'copy-helper-warning-snackbar';

export function showInfoSnackbar(msg) {
  let infoSnackbar = document.querySelector(infoSnackbarId);

  if (!infoSnackbar) {
    infoSnackbar = createSnackbar(infoSnackbarId);
    document.body.appendChild(infoSnackbar);
  }
  showSnackbar(infoSnackbar, msg);
}

export function showWarningSnackbar(msg) {
  let warningSnackbar = document.querySelector(warningSnackbarId);

  if (!warningSnackbar) {
    warningSnackbar = createSnackbar(
      warningSnackbarId,
      {
        top: '10%',
        left: '50%',
      },
      'yellow',
      5
    );
    document.body.appendChild(warningSnackbar);
  }

  showSnackbar(warningSnackbar, `Warning: ${msg}`);
}
