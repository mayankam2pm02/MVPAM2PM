chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.type === 'SEND_WA_MESSAGE') {
      const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' })
      if (tabs.length === 0) {
        sendResponse({ success: false, error: 'No WhatsApp Web tab found. Please open and login to WhatsApp Web.' })
        return
      }
      
      const waTab = tabs[0]
      try {
        const response = await chrome.tabs.sendMessage(waTab.id, {
          type: 'AUTOMATE_SEND_WA',
          to: message.to,
          body: message.body
        })
        sendResponse(response)
      } catch (err) {
        sendResponse({ success: false, error: 'Failed to communicate with WhatsApp Web tab. Make sure it is active.' })
      }
    }
    
    else if (message.type === 'WA_STATUS_UPDATE') {
      const appTabs = await chrome.tabs.query({ url: [
        'http://localhost:3000/*',
        'http://localhost:3001/*'
      ]})
      for (const tab of appTabs) {
        try {
          chrome.tabs.sendMessage(tab.id, {
            type: 'WA_STATUS_BROADCAST',
            connected: message.connected,
            phone: message.phone,
            name: message.name
          })
        } catch (e) {}
      }
      sendResponse({ success: true })
    }
    
    else if (message.type === 'WA_MESSAGE_SENT_REPORT') {
      const appTabs = await chrome.tabs.query({ url: [
        'http://localhost:3000/*',
        'http://localhost:3001/*'
      ]})
      for (const tab of appTabs) {
        try {
          chrome.tabs.sendMessage(tab.id, {
            type: 'WA_MESSAGE_SENT_CONFIRMED',
            to: message.to,
            success: message.success,
            error: message.error
          })
        } catch (e) {}
      }
      sendResponse({ success: true })
    }
  })()
  
  return true
})
