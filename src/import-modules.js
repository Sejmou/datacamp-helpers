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
    const slideImageViewerModule = await importFeatureModule(
      'slide-image-viewer'
    );
    slideImageViewerModule.addSlideImageViewFeatures();

    // caution! depends on keyboardShortcutModule
    const videoSlideNavigationModule = await importFeatureModule(
      'video-slide-navigation'
    );
    videoSlideNavigationModule.enable();
  } else {
    const codeQuickCopyModule = await importFeatureModule('code-quick-copy');
    codeQuickCopyModule.enableCodeQuickCopy();
  }
})();
