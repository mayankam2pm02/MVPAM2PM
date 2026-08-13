function getTwilioConfig() {
  const stored = localStorage.getItem('twilio_config')
  if (stored) {
    try {
      const config = JSON.parse(stored)
      if (config.sid && config.token) {
        return {
          sid: config.sid,
          token: config.token,
          number: config.number || '+14155238886'
        }
      }
    } catch (e) {
      console.error('Error parsing twilio_config:', e)
    }
  }
  return {
    sid: import.meta.env.VITE_TWILIO_ACCOUNT_SID,
    token: import.meta.env.VITE_TWILIO_AUTH_TOKEN,
    number: import.meta.env.VITE_TWILIO_WHATSAPP_NUMBER || '+14155238886'
  }
}

function cleanPhoneNumber(phone = '') {
  let cleaned = phone.replace(/[^\d+]/g, '')
  if (!cleaned.startsWith('+') && cleaned.length === 10) {
    cleaned = '+91' + cleaned
  }
  return cleaned
}

export async function sendWhatsAppMessage({ to, body }) {
  const formattedPhone = cleanPhoneNumber(to)
  const config = getTwilioConfig()

  if (!config.sid || !config.token) {
    const waUrl = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodeURIComponent(body)}`
    window.open(waUrl, '_blank')
    console.warn('Twilio API keys not configured. Redirected to WhatsApp Web client.')
    return { simulated: true, protocol: 'whatsapp_web' }
  }

  const twilioTo = `whatsapp:${formattedPhone}`
  const twilioFrom = config.number.startsWith('whatsapp:') ? config.number : `whatsapp:${config.number}`

  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.sid}/Messages.json`
  const basicAuth = btoa(`${config.sid}:${config.token}`)

  const params = new URLSearchParams()
  params.append('To', twilioTo)
  params.append('From', twilioFrom)
  params.append('Body', body)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Twilio send failed')
  return data
}

