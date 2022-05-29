// we just need the background script as a "bridge" for communication between content scripts running on same tab (in different frames)
// content script instances cannot communicate with each other directly
chrome.runtime.onMessage.addListener((message, sender) => {
  console.log('received message', message);
  console.log('sending back to sender tab');
  console.log('tab ID:', sender.frameId);

  chrome.tabs.sendMessage(sender.tab.id, message);
});
