(async () => {
  const copyHelperSrc = chrome.extension.getURL(
    'src/feature-modules/copy-helper/copy-helper.js'
  );
  const copyHelperModule = await import(copyHelperSrc);
  copyHelperModule.run();

  const keyboardShortcutSrc = chrome.extension.getURL(
    'src/feature-modules/keyboard-shortcuts/keyboard-shortcuts.js'
  );
  const keyboardShortcutModule = await import(keyboardShortcutSrc);
  keyboardShortcutModule.addKeyboardShortcuts();
})();
