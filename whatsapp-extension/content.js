const isWhatsAppWeb = window.location.host === 'web.whatsapp.com';

if (isWhatsAppWeb) {
  console.log('[WA-Sync] Content script loaded on WhatsApp Web');

  // Monitor connection status periodically
  setInterval(() => {
    const wid = localStorage.getItem('last-wid') || localStorage.getItem('last-wid-md');
    if (wid) {
      const phone = wid.split('@')[0].split(':')[0];
      chrome.runtime.sendMessage({
        type: 'WA_STATUS_UPDATE',
        connected: true,
        phone: '+' + phone,
        name: 'WhatsApp Web Session'
      });
    } else {
      chrome.runtime.sendMessage({
        type: 'WA_STATUS_UPDATE',
        connected: false
      });
    }
  }, 3000);

  // Listen for automate send request from background.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'AUTOMATE_SEND_WA') {
      const { to, body } = message;
      automateWhatsAppSend(to, body, sendResponse);
      return true; // keep channel open for async response
    }
  });

  async function automateWhatsAppSend(to, body, sendResponse) {
    try {
      const cleanPhone = to.replace(/[^\d]/g, '');
      const sendUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(body)}`;
      
      // Update location search to open chat details inside the active WhatsApp Web session
      window.location.href = sendUrl;

      // Wait for send button to appear and auto-click it
      let checkCount = 0;
      const checkInterval = setInterval(() => {
        checkCount++;
        const sendBtn = document.querySelector('span[data-icon="send"]') || document.querySelector('button[aria-label="Send"]');
        if (sendBtn) {
          clearInterval(checkInterval);
          sendBtn.click();
          
          chrome.runtime.sendMessage({
            type: 'WA_MESSAGE_SENT_REPORT',
            to: to,
            success: true
          });
          sendResponse({ success: true });
        } else if (checkCount > 40) { // 20 seconds timeout
          clearInterval(checkInterval);
          chrome.runtime.sendMessage({
            type: 'WA_MESSAGE_SENT_REPORT',
            to: to,
            success: false,
            error: 'Timeout waiting for chat load'
          });
          sendResponse({ success: false, error: 'Timeout waiting for send button. Make sure QR is scanned.' });
        }
      }, 500);

    } catch (err) {
      chrome.runtime.sendMessage({
        type: 'WA_MESSAGE_SENT_REPORT',
        to: to,
        success: false,
        error: err.message
      });
      sendResponse({ success: false, error: err.message });
    }
  }

} else {
  console.log('[WA-Sync] Content script loaded on Mr. Manager App');

  // Let the React page know the extension is active
  setInterval(() => {
    window.postMessage({ type: 'WA_EXTENSION_INSTALLED' }, '*');
  }, 2000);

  // Listen for messages from React page
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SEND_WA_VIA_EXTENSION') {
      const { to, body } = event.data;
      chrome.runtime.sendMessage({
        type: 'SEND_WA_MESSAGE',
        to,
        body
      }, (response) => {
        window.postMessage({
          type: 'WA_MESSAGE_SENT_RESULT',
          to,
          success: response ? response.success : false,
          error: response ? response.error : 'No response from extension background worker'
        }, '*');
      });
    }
  });

  // Listen for messages from background.js and forward them to React App
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'WA_STATUS_BROADCAST') {
      window.postMessage({
        type: 'WA_STATUS_FROM_EXTENSION',
        connected: message.connected,
        phone: message.phone,
        name: message.name
      }, '*');
    } else if (message.type === 'WA_MESSAGE_SENT_CONFIRMED') {
      window.postMessage({
        type: 'WA_MESSAGE_SENT_CONFIRMED_FROM_EXTENSION',
        to: message.to,
        success: message.success,
        error: message.error
      }, '*');
    }
  });
}
