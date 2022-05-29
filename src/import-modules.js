(async () => {
  const src = chrome.extension.getURL('src/copy-helper/copy-helper.js');
  const contentScript = await import(src);
  contentScript.run();
})();
