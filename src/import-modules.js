(async () => {
  const copyHelperSrc = chrome.extension.getURL(
    'src/copy-helper/copy-helper.js'
  );
  const copyHelperModule = await import(copyHelperSrc);
  copyHelperModule.run();

  const keyboardShortcutSrc = chrome.extension.getURL(
    'src/keyboard-shortcuts/keyboard-shortcuts.js'
  );
  const keyboardShortcutModule = await import(keyboardShortcutSrc);
  keyboardShortcutModule.addKeyboardShortcuts();
})();
