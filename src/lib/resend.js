const RESEND_API = 'https://api.resend.com/emails'
const API_KEY    = import.meta.env.VITE_RESEND_API_KEY
const APP_URL    = import.meta.env.VITE_APP_URL || 'http://localhost:3000'
const COMPANY    = import.meta.env.VITE_COMPANY_NAME || 'Mr. Manager'
const FROM_EMAIL = 'hiring@talentos.app' // Update with your verified Resend domain

async function sendEmail({ to, subject, html }) {
  if (!API_KEY) {
    console.warn('Resend API key not configured. Email not sent:', subject)
    return { simulated: true }
  }

  const response = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({ from: `${COMPANY} Hiring <${FROM_EMAIL}>`, to, subject, html })
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Email send failed')
  return data
}

// ─── CONSENT EMAIL ────────────────────────────────────────────

export async function sendConsentEmail({ candidateName, candidateEmail, jobTitle, jobLocation, salary, consentToken }) {
  const acceptUrl  = `${APP_URL}/consent?token=${consentToken}&action=accept`
  const declineUrl = `${APP_URL}/consent?token=${consentToken}&action=decline`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8F9FC;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E4E7EF;">
    <div style="background:#4F46E5;padding:32px 40px;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.3px;">Mr. Manager</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px;">${COMPANY} — your virtual manager</div>
    </div>
    <div style="padding:40px;">
      <h2 style="margin:0 0 16px;font-size:20px;color:#0F1117;">Hi ${candidateName} 👋</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#4A5068;line-height:1.6;">
        We've reviewed your profile and believe you'd be a great fit for an exciting opportunity at <strong>${COMPANY}</strong>.
      </p>
      <div style="background:#F8F9FC;border-radius:10px;padding:20px;margin:24px 0;">
        <div style="font-size:13px;color:#8B91A8;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">Job Details</div>
        <div style="font-size:15px;font-weight:700;color:#0F1117;margin-bottom:8px;">📋 ${jobTitle}</div>
        <div style="font-size:13px;color:#4A5068;">📍 Location: ${jobLocation}</div>
        <div style="font-size:13px;color:#4A5068;margin-top:4px;">💰 Salary: ${salary}</div>
      </div>
      <p style="font-size:14px;color:#4A5068;line-height:1.6;margin:0 0 24px;">
        Please let us know if you're interested in exploring this opportunity. Your response is completely voluntary.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${acceptUrl}" style="display:inline-block;background:#4F46E5;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;margin-right:12px;">
          ✅ Yes, I'm interested
        </a>
        <a href="${declineUrl}" style="display:inline-block;background:#fff;color:#4A5068;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;border:1px solid #E4E7EF;">
          ✕ Not right now
        </a>
      </div>
      <p style="font-size:12px;color:#8B91A8;text-align:center;margin:24px 0 0;line-height:1.6;">
        This is a no-obligation enquiry. Your data is protected under our privacy policy.<br>
        If you have questions, reply to this email.
      </p>
    </div>
    <div style="background:#F8F9FC;padding:20px 40px;border-top:1px solid #E4E7EF;">
      <p style="margin:0;font-size:12px;color:#8B91A8;text-align:center;">
        Sent by ${COMPANY} via Mr. Manager, your virtual manager
      </p>
    </div>
  </div>
</body>
</html>`

  return sendEmail({ to: candidateEmail, subject: `Job opportunity — ${jobTitle} at ${COMPANY}`, html })
}

// ─── OFFER EMAIL ──────────────────────────────────────────────

export async function sendOfferEmail({ candidateName, candidateEmail, jobTitle, salary, startDate }) {
  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F8F9FC;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E4E7EF;">
    <div style="background:#059669;padding:32px 40px;">
      <div style="font-size:22px;font-weight:800;color:#fff;">🎉 Congratulations!</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:4px;">${COMPANY} — Offer Letter</div>
    </div>
    <div style="padding:40px;">
      <h2 style="margin:0 0 16px;font-size:20px;color:#0F1117;">Dear ${candidateName},</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#4A5068;line-height:1.6;">
        We are delighted to offer you the position of <strong>${jobTitle}</strong> at ${COMPANY}. 
        We were impressed by your background and are excited to have you join our team.
      </p>
      <div style="background:#ECFDF5;border-radius:10px;padding:20px;margin:24px 0;border:1px solid #A7F3D0;">
        <div style="font-size:13px;font-weight:700;color:#059669;margin-bottom:12px;">OFFER SUMMARY</div>
        <div style="font-size:14px;color:#0F1117;margin-bottom:6px;">Position: <strong>${jobTitle}</strong></div>
        <div style="font-size:14px;color:#0F1117;margin-bottom:6px;">Compensation: <strong>${salary}</strong></div>
        ${startDate ? `<div style="font-size:14px;color:#0F1117;">Start Date: <strong>${startDate}</strong></div>` : ''}
      </div>
      <p style="font-size:14px;color:#4A5068;line-height:1.6;">
        Please confirm your acceptance by replying to this email. Our HR team will reach out with onboarding details.
      </p>
      <p style="font-size:14px;color:#4A5068;margin-top:24px;">Welcome to the team!</p>
      <p style="font-size:14px;color:#4A5068;font-weight:600;">The ${COMPANY} Team</p>
    </div>
  </div>
</body>
</html>`

  return sendEmail({ to: candidateEmail, subject: `Your offer — ${jobTitle} at ${COMPANY}`, html })
}

// ─── INTERVIEW SCHEDULE EMAIL ─────────────────────────────────

export async function sendInterviewEmail({ candidateName, candidateEmail, jobTitle, interviewDate, interviewerName }) {
  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F8F9FC;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E4E7EF;">
    <div style="background:#2563EB;padding:32px 40px;">
      <div style="font-size:22px;font-weight:800;color:#fff;">📅 Interview Scheduled</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:4px;">${COMPANY} Hiring</div>
    </div>
    <div style="padding:40px;">
      <h2 style="margin:0 0 16px;font-size:20px;color:#0F1117;">Hi ${candidateName},</h2>
      <p style="font-size:15px;color:#4A5068;line-height:1.6;margin:0 0 16px;">
        Your interview for the <strong>${jobTitle}</strong> role has been scheduled.
      </p>
      <div style="background:#EFF6FF;border-radius:10px;padding:20px;margin:24px 0;border:1px solid #BFDBFE;">
        <div style="font-size:14px;color:#0F1117;margin-bottom:6px;">📅 Date &amp; Time: <strong>${interviewDate}</strong></div>
        <div style="font-size:14px;color:#0F1117;margin-bottom:6px;">💼 Role: <strong>${jobTitle}</strong></div>
        ${interviewerName ? `<div style="font-size:14px;color:#0F1117;">👤 Interviewer: <strong>${interviewerName}</strong></div>` : ''}
      </div>
      <p style="font-size:14px;color:#4A5068;line-height:1.6;">
        Please be prepared to discuss your experience and ask questions. If you need to reschedule, reply to this email.
      </p>
      <p style="font-size:14px;color:#4A5068;margin-top:16px;">Best of luck!</p>
    </div>
  </div>
</body>
</html>`

  return sendEmail({ to: candidateEmail, subject: `Interview scheduled — ${jobTitle} at ${COMPANY}`, html })
}
