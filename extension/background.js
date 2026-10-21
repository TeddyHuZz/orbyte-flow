/**
 * Orbyte Flow — Chrome Extension Service Worker
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('Orbyte Flow extension installed.');
  
  // Create context menu for right-clicking selected text
  chrome.contextMenus.create({
    id: 'orbyte-extract-order',
    title: 'Extract Order with Orbyte Flow (Alt + O)',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'orbyte-extract-order' && tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'EXTRACT_SELECTED_TEXT',
      text: info.selectionText,
    });
  }
});
