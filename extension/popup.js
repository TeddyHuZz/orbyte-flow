document.addEventListener('DOMContentLoaded', () => {
  const apiUrlInput = document.getElementById('apiUrl');
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');

  // Load saved setting
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['orbyteApiUrl'], (res) => {
      if (res.orbyteApiUrl) {
        apiUrlInput.value = res.orbyteApiUrl;
      }
    });
  }

  saveBtn.addEventListener('click', () => {
    const url = apiUrlInput.value.trim() || 'http://localhost:3000';
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ orbyteApiUrl: url }, () => {
        statusEl.style.display = 'block';
        setTimeout(() => {
          statusEl.style.display = 'none';
        }, 2000);
      });
    } else {
      statusEl.style.display = 'block';
      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 2000);
    }
  });
});
