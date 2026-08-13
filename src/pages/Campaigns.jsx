import { useState, useEffect } from 'react'
import { fetchLeads, createLead } from '../lib/supabase.js'
import {
  Send, MessageCircle, Mail, Smartphone,
  CheckCircle2, Plus, Users, LayoutGrid, Link,
  AlertCircle, Radio, Trash2, Globe, Clock, ShieldCheck, Info
} from 'lucide-react'
import { sendWhatsAppMessage } from '../lib/twilio.js'

const MOCK_INCOMING_MESSAGES = [
  { sender: 'amit.sharma@techgrowth.in', name: 'Amit Sharma', company: 'TechGrowth India', channel: 'email', snippet: 'Hi, we are interested in your corporate software services. Can you share pricing details for a team of 45?', date: 'Just now' },
  { sender: '+91 98765 43210', name: 'Rohan Mehta', company: 'Mehta Logistics', channel: 'whatsapp', snippet: 'Hey, I saw your ad for cargo tracking automation. Do you offer custom integrations?', date: '10 mins ago' },
  { sender: 'priya.nair@primehr.com', name: 'Priya Nair', company: 'Prime HR Solutions', channel: 'email', snippet: 'Hello, we would like to schedule a demo of your recruitment parsing pipeline next Tuesday.', date: '1 hour ago' }
]

export default function Campaigns() {
  const [tab, setTab] = useState('campaigns') // campaigns | accounts | leads
  const [leads, setLeads] = useState([])
  const [connectedWhatsApp, setConnectedWhatsApp] = useState(() => {
    return localStorage.getItem('whatsapp_connected_device') !== null
  })
  const [pairedDevice, setPairedDevice] = useState(() => {
    const saved = localStorage.getItem('whatsapp_connected_device')
    return saved ? JSON.parse(saved) : null
  })
  const [pairingStep, setPairingStep] = useState('idle') // idle | qr | detected | syncing | connected
  const [pairingProgress, setPairingProgress] = useState(0)
  const [emailConfig, setEmailConfig] = useState({ host: '', port: '', user: '', pass: '', connected: false })
  const [connectMethod, setConnectMethod] = useState('api') // api | web
  const [twilioSid, setTwilioSid] = useState('')
  const [twilioToken, setTwilioToken] = useState('')
  const [twilioNumber, setTwilioNumber] = useState('+14155238886')

  useEffect(() => {
    const saved = localStorage.getItem('twilio_config')
    if (saved) {
      try {
        const config = JSON.parse(saved)
        setTwilioSid(config.sid || '')
        setTwilioToken(config.token || '')
        setTwilioNumber(config.number || '+14155238886')
      } catch (e) {}
    }
  }, [])

  const [extensionInstalled, setExtensionInstalled] = useState(false)
  const [extensionWhatsAppConnected, setExtensionWhatsAppConnected] = useState(false)
  const [extensionPhone, setExtensionPhone] = useState('')

  useEffect(() => {
    function handleExtensionMessages(event) {
      if (!event.data) return
      
      if (event.data.type === 'WA_EXTENSION_INSTALLED') {
        setExtensionInstalled(true)
      }
      
      else if (event.data.type === 'WA_STATUS_FROM_EXTENSION') {
        if (event.data.connected) {
          setExtensionWhatsAppConnected(true)
          setExtensionPhone(event.data.phone)
          
          // Auto-connect WhatsApp if not already connected!
          const device = {
            phone: event.data.phone,
            deviceName: "WhatsApp Web (via Chrome Extension)",
            pairedAt: new Date().toLocaleString(),
            messagesSent: 0,
            responseRate: '100%',
            isExtension: true
          }
          localStorage.setItem('whatsapp_connected_device', JSON.stringify(device))
          setPairedDevice(device)
          setConnectedWhatsApp(true)
        } else {
          setExtensionWhatsAppConnected(false)
        }
      }
      
      else if (event.data.type === 'WA_MESSAGE_SENT_RESULT' || event.data.type === 'WA_MESSAGE_SENT_CONFIRMED_FROM_EXTENSION') {
        if (event.data.success) {
          setPairedDevice(prev => {
            if (!prev) return null
            const updated = { ...prev, messagesSent: (prev.messagesSent || 0) + 1 }
            localStorage.setItem('whatsapp_connected_device', JSON.stringify(updated))
            return updated
          })
        }
      }
    }

    window.addEventListener('message', handleExtensionMessages)
    return () => window.removeEventListener('message', handleExtensionMessages)
  }, [])


  
  const [inboxLogs, setInboxLogs] = useState(() => {
    const saved = localStorage.getItem('campaign_inbox_logs')
    return saved ? JSON.parse(saved) : MOCK_INCOMING_MESSAGES
  })

  // Campaigns list
  const [campaigns, setCampaigns] = useState(() => {
    const saved = localStorage.getItem('campaign_dispatch_list')
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Festive Season Pitch', channel: 'email', sent: 124, opened: 98, replies: 12, date: '2026-08-01' },
      { id: '2', title: 'Product Launch Update', channel: 'whatsapp', sent: 89, opened: 82, replies: 34, date: '2026-08-08' }
    ]
  })

  // New Campaign Form states
  const [campTitle, setCampTitle] = useState('')
  const [campChannel, setCampChannel] = useState('email')
  const [campSubject, setCampSubject] = useState('')
  const [campBody, setCampBody] = useState('')
  const [selectedLeads, setSelectedLeads] = useState({})
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetchLeads().then(data => {
      setLeads(data || [])
    })
  }, [])

  useEffect(() => {
    localStorage.setItem('campaign_inbox_logs', JSON.stringify(inboxLogs))
  }, [inboxLogs])

  useEffect(() => {
    localStorage.setItem('campaign_dispatch_list', JSON.stringify(campaigns))
  }, [campaigns])

  // QR progressive pairing state machine
  function handleGenerateQR() {
    setPairingStep('qr')
    setPairingProgress(0)

    setTimeout(() => {
      setPairingStep('detected')
      setPairingProgress(35)
      
      setTimeout(() => {
        setPairingStep('syncing')
        setPairingProgress(70)
        
        setTimeout(() => {
          const device = {
            phone: '+91 98765 43210',
            deviceName: "Mayank Jain's iPhone (iOS)",
            pairedAt: new Date().toLocaleString(),
            messagesSent: 89,
            responseRate: '38.2%'
          }
          localStorage.setItem('whatsapp_connected_device', JSON.stringify(device))
          setPairedDevice(device)
          setConnectedWhatsApp(true)
          setPairingStep('connected')
          setPairingProgress(100)
        }, 2000)
      }, 2000)
    }, 2000)
  }

  function handleDisconnectWhatsApp() {
    localStorage.removeItem('whatsapp_connected_device')
    localStorage.removeItem('twilio_config')
    setConnectedWhatsApp(false)
    setPairedDevice(null)
    setPairingStep('idle')
    setPairingProgress(0)
    setTwilioSid('')
    setTwilioToken('')
  }

  function handleConnectTwilio(e) {
    e.preventDefault()
    if (!twilioSid || !twilioToken || !twilioNumber) {
      alert('Please fill out all Twilio credentials.')
      return
    }
    const config = { sid: twilioSid, token: twilioToken, number: twilioNumber }
    localStorage.setItem('twilio_config', JSON.stringify(config))
    
    const device = {
      phone: twilioNumber,
      deviceName: "Twilio Official API Gateway",
      pairedAt: new Date().toLocaleString(),
      messagesSent: 0,
      responseRate: '100%',
      isTwilio: true
    }
    localStorage.setItem('whatsapp_connected_device', JSON.stringify(device))
    setPairedDevice(device)
    setConnectedWhatsApp(true)
  }


  // SMTP connection simulation
  function handleConnectEmail(e) {
    e.preventDefault()
    if (!emailConfig.host || !emailConfig.user || !emailConfig.pass) {
      alert('Please fill out all email credentials.')
      return
    }
    setEmailConfig(prev => ({ ...prev, connected: true }))
  }

  // Simulate incoming webhook log
  function handleSimulateInbound() {
    const names = ['Karan Johar', 'Neha Gupta', 'Vikram Malhotra', 'Siddharth Sen']
    const companies = ['Dharma Corp', 'Gupta Retail', 'Malhotra Ventures', 'Siddharth Tech']
    const channels = ['email', 'whatsapp']
    
    const pickedIdx = Math.floor(Math.random() * names.length)
    const channel = channels[Math.floor(Math.random() * channels.length)]
    
    const newLog = {
      sender: channel === 'email' ? `${names[pickedIdx].toLowerCase().replace(' ', '.')}@office.com` : `+91 99000 ${10000 + Math.floor(Math.random() * 90000)}`,
      name: names[pickedIdx],
      company: companies[pickedIdx],
      channel,
      snippet: channel === 'email' 
        ? `Hi team, I would like to get a quote regarding your professional CRM integration module.`
        : `Hey! Is this the official support? I need onboarding checklist templates.`,
      date: 'Just now'
    }

    setInboxLogs(prev => [newLog, ...prev])
  }

  // Save auto-extracted lead to CRM
  async function handleImportLead(log, idx) {
    try {
      await createLead({
        name: log.name,
        company: log.company,
        email: log.channel === 'email' ? log.sender : '',
        phone: log.channel === 'whatsapp' ? log.sender : '',
        status: 'new',
        notes: `Auto-extracted inquiry snippet: "${log.snippet}"`
      })
      
      setInboxLogs(prev => prev.filter((_, i) => i !== idx))
      
      // Reload leads
      const refreshed = await fetchLeads()
      setLeads(refreshed || [])
      
      alert(`Imported ${log.name} from ${log.company} directly to CRM leads!`)
    } catch (err) {
      alert('Failed to import: ' + err.message)
    }
  }

  // Trigger Bulk campaign
  function handleLaunchCampaign(e) {
    e.preventDefault()
    if (!campTitle || !campBody) {
      alert('Please complete the campaign title and message body.')
      return
    }

    if (campChannel === 'whatsapp' && !connectedWhatsApp) {
      alert('⚠️ WhatsApp is disconnected. Please connect your WhatsApp account in the "Connected Accounts" tab before launching a WhatsApp campaign.')
      setTab('accounts')
      return
    }

    const targets = Object.keys(selectedLeads).filter(id => selectedLeads[id])
    if (targets.length === 0) {
      alert('Please select at least one recipient lead.')
      return
    }

    if (campChannel === 'whatsapp') {
      targets.forEach(async (id) => {
        const lead = leads.find(l => l.id.toString() === id.toString())
        if (!lead) return
        
        const phone = lead.phone || lead.whatsapp
        if (!phone) return

        if (pairedDevice?.isExtension) {
          window.postMessage({
            type: 'SEND_WA_VIA_EXTENSION',
            to: phone,
            body: campBody
          }, '*')
        } else {
          try {
            await sendWhatsAppMessage({ to: phone, body: campBody })
          } catch (err) {
            console.error(`Failed to send WhatsApp via Twilio to ${phone}:`, err.message)
          }
        }
      })
    }

    const newCamp = {
      id: Date.now().toString(),
      title: campTitle,
      channel: campChannel,
      sent: targets.length,
      opened: Math.round(targets.length * 0.8),
      replies: Math.round(targets.length * 0.15),
      date: new Date().toISOString().split('T')[0]
    }

    setCampaigns(prev => [newCamp, ...prev])
    setCampTitle('')
    setCampSubject('')
    setCampBody('')
    setSelectedLeads({})
    setMsg(`🚀 Campaign "${campTitle}" dispatched successfully to ${targets.length} leads!`)
    setTimeout(() => setMsg(''), 4000)
  }

  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--text-1)', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>Outreach & Campaigns</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Send bulk WhatsApp and Email campaigns, sync communications, and extract incoming leads.</p>
        </div>
      </div>

      {/* Tabs Row */}
      <div style={{ display: 'flex', gap: 4, background: '#EFF1F5', padding: 4, borderRadius: 10, width: 'fit-content', marginBottom: 20 }}>
        {[
          ['campaigns', '🚀 Bulk Campaigns'],
          ['accounts', '🔌 Connected Accounts'],
          ['leads', '📨 Auto-extracted Leads']
        ].map(([t, l]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              border: 'none', outline: 'none', padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              background: tab === t ? '#FFF' : 'transparent',
              color: tab === t ? '#4F46E5' : 'var(--text-3)',
              boxShadow: tab === t ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* 🚀 Tab 1: Campaigns */}
      {tab === 'campaigns' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, alignItems: 'flex-start' }}>
          {/* Dispatcher Form */}
          <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Create New Outreach Campaign</h3>
            {msg && <div style={{ fontSize: 13, color: '#10B981', fontWeight: 600, marginBottom: 14 }}>{msg}</div>}

            <form onSubmit={handleLaunchCampaign} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6, color: 'var(--text-2)' }}>Campaign Title / Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Q3 product demo drive"
                  value={campTitle}
                  onChange={(e) => setCampTitle(e.target.value)}
                  style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6, color: 'var(--text-2)' }}>Outreach Channel:</label>
                  <select
                    value={campChannel}
                    onChange={(e) => setCampChannel(e.target.value)}
                    style={{ width: '100%', height: 38, borderRadius: 8, fontSize: 13 }}
                  >
                    <option value="email">Email Campaign</option>
                    <option value="whatsapp">WhatsApp Campaign</option>
                  </select>
                </div>
                {campChannel === 'email' && (
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6, color: 'var(--text-2)' }}>Email Subject Line:</label>
                    <input
                      type="text"
                      placeholder="e.g. Schedule a demo session"
                      value={campSubject}
                      onChange={(e) => setCampSubject(e.target.value)}
                      style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6, color: 'var(--text-2)' }}>Message Body Template:</label>
                <textarea
                  placeholder="Use variables: Hi {name}, regarding your company {company}..."
                  value={campBody}
                  onChange={(e) => setCampBody(e.target.value)}
                  style={{ width: '100%', minHeight: 120, borderRadius: 8, border: '1px solid var(--border)', padding: '10px', fontSize: 13, resize: 'vertical' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6, color: 'var(--text-2)' }}>Select Target Recipients ({leads.length} leads in CRM):</label>
                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {leads.map(l => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={!!selectedLeads[l.id]}
                        onChange={(e) => {
                          const val = e.target.checked
                          setSelectedLeads(prev => ({ ...prev, [l.id]: val }))
                        }}
                        style={{ width: 15, height: 15, accentColor: '#4F46E5', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 12 }}>{l.name} ({l.company})</span>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, justifyContent: 'center' }}>
                <Send size={14} /> Launch Campaign
              </button>
            </form>
          </div>

          {/* Past Campaigns List */}
          <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Outbox Dispatch Logs</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {campaigns.map(c => (
                <div key={c.id} style={{ border: '1px solid var(--border)', padding: 14, borderRadius: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{c.title}</div>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: c.channel === 'email' ? '#EEF2FF' : '#ECFDF5', color: c.channel === 'email' ? '#4F46E5' : '#065F46', fontWeight: 600 }}>
                      {c.channel.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Date sent: {c.date}</div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12, textAlign: 'center', background: '#F9FAFB', padding: '8px 4px', borderRadius: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>{c.sent}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Sent</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#4F46E5' }}>{c.opened}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Opened</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#10B981' }}>{c.replies}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Replies</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 🔌 Tab 2: Connected Accounts */}
      {tab === 'accounts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* WhatsApp Connection Card */}
          <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <MessageCircle size={18} color="#16A34A" /> WhatsApp Integration
              </h3>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: connectedWhatsApp ? '#ECFDF5' : '#FEF2F2', color: connectedWhatsApp ? '#065F46' : '#991B1B', fontWeight: 600 }}>
                {connectedWhatsApp ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 18 }}>Link your corporate WhatsApp Web/Twilio account to send template messaging campaigns and track responses.</p>

            {connectedWhatsApp ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24, padding: 20, border: '1px solid #BBF7D0', background: '#F0FDF4', borderRadius: 12 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justify: 'center', flexShrink: 0 }}>
                    <ShieldCheck size={26} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#065F46' }}>WhatsApp Account Active & Linked</h4>
                    <p style={{ fontSize: 12, color: '#166534', marginTop: 4 }}>Inbound webhook channels are active. Responses will be parsed and tracked automatically in CRM leads.</p>
                    
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 11, color: '#1E3A1E' }}>
                        <strong>Device Name:</strong> {pairedDevice?.deviceName || "Mayank Jain's iPhone (iOS)"}
                      </div>
                      <div style={{ fontSize: 11, color: '#1E3A1E' }}>
                        <strong>Phone Number:</strong> {pairedDevice?.phone || "+91 98765 43210"}
                      </div>
                      <div style={{ fontSize: 11, color: '#1E3A1E' }}>
                        <strong>Connected On:</strong> {pairedDevice?.pairedAt || new Date().toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ borderLeft: '1px solid #A7F3D0', paddingLeft: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: '#1E3A1E', fontWeight: 600 }}>Sync Status:</span>
                    <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 700 }}>Online</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: '#1E3A1E', fontWeight: 600 }}>Messages Synced Today:</span>
                    <span style={{ fontSize: 11, color: '#1E3A1E', fontWeight: 700 }}>{pairedDevice?.messagesSent || 89}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: '#1E3A1E', fontWeight: 600 }}>Response Rate:</span>
                    <span style={{ fontSize: 11, color: '#1E3A1E', fontWeight: 700 }}>{pairedDevice?.responseRate || "38.2%"}</span>
                  </div>
                  
                  <button className="btn btn-secondary btn-sm" onClick={handleDisconnectWhatsApp} style={{ background: '#FFF', color: '#DC2626', borderColor: '#FCA5A5', alignSelf: 'flex-start' }}>
                    Disconnect WhatsApp Web
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 24, background: '#F9FAFB' }}>
                {/* Method Switcher Tabs */}
                <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
                  <button 
                    onClick={() => setConnectMethod('api')}
                    style={{
                      background: connectMethod === 'api' ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                      border: 'none',
                      color: connectMethod === 'api' ? '#4F46E5' : 'var(--text-3)',
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    💬 Official API (Twilio)
                  </button>
                  <button 
                    onClick={() => setConnectMethod('web')}
                    style={{
                      background: connectMethod === 'web' ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                      border: 'none',
                      color: connectMethod === 'web' ? '#4F46E5' : 'var(--text-3)',
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    🧩 WhatsApp Web (Chrome Extension)
                  </button>
                </div>

                {connectMethod === 'api' ? (
                  <form onSubmit={handleConnectTwilio} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 500 }}>
                    <div style={{ display: 'flex', gap: 6, padding: '10px 12px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: 11, color: '#1E40AF', marginBottom: 6, alignItems: 'center' }}>
                      <Info size={14} color="#2563EB" style={{ flexShrink: 0 }} />
                      <span>This connects dynamic WhatsApp messaging to your Twilio service. Credentials are saved locally.</span>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 4, color: 'var(--text-3)' }}>TWILIO ACCOUNT SID:</label>
                      <input
                        type="text"
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        value={twilioSid}
                        onChange={(e) => setTwilioSid(e.target.value)}
                        style={{ width: '100%', height: 32, fontSize: 12 }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 4, color: 'var(--text-3)' }}>TWILIO AUTH TOKEN:</label>
                      <input
                        type="password"
                        placeholder="••••••••••••••••••••••••••••••••"
                        value={twilioToken}
                        onChange={(e) => setTwilioToken(e.target.value)}
                        style={{ width: '100%', height: 32, fontSize: 12 }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 4, color: 'var(--text-3)' }}>SENDER WHATSAPP NUMBER:</label>
                      <input
                        type="text"
                        placeholder="whatsapp:+14155238886"
                        value={twilioNumber}
                        onChange={(e) => setTwilioNumber(e.target.value)}
                        style={{ width: '100%', height: 32, fontSize: 12 }}
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start', height: 32, marginTop: 6 }}>
                      Connect Twilio WhatsApp
                    </button>
                  </form>
                ) : (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }}>
                      <div>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>Automate via Chrome Extension</h4>
                        <p style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.4, marginBottom: 16 }}>
                          To automate campaign messaging and sync chats from your real WhatsApp Web session, load our helper Chrome Extension in your browser:
                        </p>
                        
                        <div style={{ background: '#F3F4F6', borderRadius: 8, padding: '12px 16px', fontSize: 11, color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                          <div><strong>1.</strong> Open <strong style={{ color: '#4F46E5' }}>chrome://extensions/</strong> in your browser.</div>
                          <div><strong>2.</strong> Enable <strong style={{ color: '#4F46E5' }}>Developer mode</strong> (top-right toggle switch).</div>
                          <div><strong>3.</strong> Click <strong style={{ color: '#4F46E5' }}>Load unpacked</strong> and select this folder in your project:<br /><code style={{ background: '#E5E7EB', padding: '2px 4px', borderRadius: 4, display: 'inline-block', marginTop: 4, fontFamily: 'monospace' }}>/Users/sujaydey/Documents/cosphere/whatsapp-extension</code></div>
                          <div><strong>4.</strong> Open <strong style={{ color: '#4F46E5' }}>https://web.whatsapp.com</strong> in a new tab and make sure you are logged in.</div>
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                          <a href="https://web.whatsapp.com" target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                            <Globe size={14} /> Open WhatsApp Web
                          </a>
                        </div>
                      </div>

                      <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ marginBottom: 16 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, display: 'block', color: 'var(--text-3)', marginBottom: 4 }}>EXTENSION STATUS:</span>
                          {extensionInstalled ? (
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle2 size={14} color="#16A34A" /> Active & Connected
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <AlertCircle size={14} color="#EF4444" /> Extension Not Loaded
                            </span>
                          )}
                        </div>

                        <div>
                          <span style={{ fontSize: 10, fontWeight: 700, display: 'block', color: 'var(--text-3)', marginBottom: 4 }}>WHATSAPP SESSION:</span>
                          {extensionWhatsAppConnected ? (
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle2 size={14} color="#16A34A" /> Logged In ({extensionPhone})
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={14} color="var(--text-3)" /> Waiting for web.whatsapp.com...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SMTP & IMAP Mailbox Card */}
          <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Mail size={18} color="#4F46E5" /> SMTP & IMAP Mailbox
              </h3>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: emailConfig.connected ? '#ECFDF5' : '#FEF2F2', color: emailConfig.connected ? '#065F46' : '#991B1B', fontWeight: 600 }}>
                {emailConfig.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {emailConfig.connected ? (
              <div style={{ padding: 16, border: '1px solid #BBF7D0', background: '#F0FDF4', borderRadius: 12, textAlign: 'center' }}>
                <ShieldCheck size={32} color="#16A34A" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>Email sync active</div>
                <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>Logged in as: {emailConfig.user}</div>
                <button className="btn btn-secondary btn-sm" onClick={() => setEmailConfig(prev => ({ ...prev, connected: false }))} style={{ marginTop: 12, background: '#FFF' }}>
                  Disconnect Email
                </button>
              </div>
            ) : (
              <form onSubmit={handleConnectEmail} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 4, color: 'var(--text-3)' }}>SMTP HOST SERVER:</label>
                  <input
                    type="text"
                    placeholder="smtp.gmail.com"
                    value={emailConfig.host}
                    onChange={(e) => setEmailConfig({ ...emailConfig, host: e.target.value })}
                    style={{ width: '100%', height: 32, fontSize: 12 }}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 4, color: 'var(--text-3)' }}>USERNAME:</label>
                    <input
                      type="text"
                      placeholder="e.g. outreach@cosphere.in"
                      value={emailConfig.user}
                      onChange={(e) => setEmailConfig({ ...emailConfig, user: e.target.value })}
                      style={{ width: '100%', height: 32, fontSize: 12 }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 4, color: 'var(--text-3)' }}>PORT:</label>
                    <input
                      type="text"
                      placeholder="465"
                      value={emailConfig.port}
                      onChange={(e) => setEmailConfig({ ...emailConfig, port: e.target.value })}
                      style={{ width: '100%', height: 32, fontSize: 12 }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 4, color: 'var(--text-3)' }}>APP PASSWORD:</label>
                  <input
                    type="password"
                    placeholder="••••••••••••••••"
                    value={emailConfig.pass}
                    onChange={(e) => setEmailConfig({ ...emailConfig, pass: e.target.value })}
                    style={{ width: '100%', height: 32, fontSize: 12 }}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end', height: 32, marginTop: 6 }}>
                  Connect Mailbox
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 📨 Tab 3: Auto-extracted Leads */}
      {tab === 'leads' && (
        <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Auto-extracted Communication Inbox</h3>
              <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Incoming emails and WhatsApp queries parsed into raw candidates and leads.</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleSimulateInbound}>
              ⚡ Simulate Incoming Message
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {inboxLogs.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No new inquiries found in connected boxes.</div>
            ) : (
              inboxLogs.map((log, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)', padding: 14, borderRadius: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: log.channel === 'email' ? '#EEF2FF' : '#ECFDF5', color: log.channel === 'email' ? '#4F46E5' : '#065F46', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {log.channel === 'email' ? <Mail size={16} /> : <MessageCircle size={16} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{log.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>({log.company})</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{log.sender} · {log.date}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6, fontStyle: 'italic', background: '#F9FAFB', padding: '6px 10px', borderRadius: 6 }}>"{log.snippet}"</div>
                    </div>
                  </div>

                  <button className="btn btn-primary btn-sm" onClick={() => handleImportLead(log, idx)} style={{ marginLeft: 16 }}>
                    Import to CRM
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
