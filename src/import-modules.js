async function importFeatureModule(name) {
  const src = chrome.runtime.getURL(`src/feature-modules/${name}/index.js`);
  const module = await import(src);
  return module;
}

(async () => {
  const copyHelperModule = await importFeatureModule('copy-helper');
  copyHelperModule.run();

  const keyboardShortcutModule = await importFeatureModule(
    'keyboard-shortcuts'
  );
  keyboardShortcutModule.addKeyboardShortcuts();
})();
