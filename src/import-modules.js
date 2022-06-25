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
  keyboardShortcutModule.enable();

  const otherUtilsModule = await import('./util/other.js');
  const currentPage = await otherUtilsModule.getCurrentPage();

  if (currentPage === 'video-iframe') {
    // caution! depends on keyboardShortcutModule
    const videoSlideHelpersModule = await importFeatureModule(
      'video-slide-helpers'
    );
    videoSlideHelpersModule.enable();
  } else {
    const codeQuickCopyModule = await importFeatureModule('code-quick-copy');
    codeQuickCopyModule.enableCodeQuickCopy();
  }
})();
