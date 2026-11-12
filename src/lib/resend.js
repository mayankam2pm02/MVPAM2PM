const RESEND_API = 'https://api.resend.com/emails'
const API_KEY    = import.meta.env.VITE_RESEND_API_KEY
const APP_URL    = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://mrmanager.am2pmsupport.in')
const COMPANY    = import.meta.env.VITE_COMPANY_NAME || 'AM2PM Support'
const FROM_EMAIL = 'hiring@talentos.app' // Update with your verified Resend domain

const isResendConfigured = !!(API_KEY && API_KEY !== 'your_resend_api_key' && !API_KEY.includes('your_'))

async function sendEmail({ to, subject, html }) {
  if (!isResendConfigured) {
    console.warn('Resend API key not configured. Email simulated:', subject)
    return { simulated: true }
  }

  const response = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({ from: `${COMPANY} <${FROM_EMAIL}>`, to, subject, html })
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Email send failed')
  return data
}

function openMailto({ to, subject, body }) {
  if (typeof window === 'undefined') return
  try {
    const link = document.createElement('a')
    link.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch {
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }
}

// ─── CONSENT EMAIL ────────────────────────────────────────────

export async function sendConsentEmail({ candidateName, candidateEmail, jobTitle, jobLocation, salary, consentToken }) {
  const acceptUrl  = `${APP_URL}/consent?token=${consentToken}&action=accept`
  const declineUrl = `${APP_URL}/consent?token=${consentToken}&action=decline`

  if (!API_KEY) {
    const body = `Hi ${candidateName} 👋,

We've reviewed your profile and believe you'd be a great fit for the ${jobTitle} position at ${COMPANY}.

Job Details:
- Role: ${jobTitle}
- Location: ${jobLocation}
- Salary: ${salary}

Please let us know your interest by clicking one of the links below:

Option 1: Yes, I am interested (Accept):
${acceptUrl}

Option 2: No, not right now (Decline):
${declineUrl}

Best regards,
The ${COMPANY} Hiring Team`
    
    openMailto({ to: candidateEmail, subject: `Job opportunity — ${jobTitle} at ${COMPANY}`, body })
    return { simulated: true, mailto: true }
  }

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
  if (!API_KEY) {
    const body = `Dear ${candidateName},

We are delighted to offer you the position of ${jobTitle} at ${COMPANY}. We were impressed by your background and are excited to have you join our team.

Offer Summary:
- Position: ${jobTitle}
- Compensation: ${salary}
${startDate ? `- Start Date: ${startDate}\n` : ''}
Please confirm your acceptance by replying directly to this email.

Welcome to the team!

Best regards,
The ${COMPANY} Team`
    
    openMailto({ to: candidateEmail, subject: `Your offer — ${jobTitle} at ${COMPANY}`, body })
    return { simulated: true, mailto: true }
  }

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
  if (!API_KEY) {
    const body = `Hi ${candidateName},

Your interview for the ${jobTitle} role has been scheduled:

Interview Details:
- Date & Time: ${interviewDate}
- Role: ${jobTitle}
${interviewerName ? `- Interviewer: ${interviewerName}\n` : ''}
Please prepare to discuss your experience. If you need to reschedule, reply directly to this email.

Best of luck!

Best regards,
The ${COMPANY} Hiring Team`

    openMailto({ to: candidateEmail, subject: `Interview scheduled — ${jobTitle} at ${COMPANY}`, body })
    return { simulated: true, mailto: true }
  }

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

// ─── AGENT / EMPLOYEE WELCOME CREDENTIALS EMAIL ───────────────

export async function sendEmployeeWelcomeEmail({
  employeeName,
  employeeEmail,
  employeeId,
  password,
  role = 'Employee',
  companyName = 'AM2PM Support',
  loginUrl
}) {
  const url = loginUrl || (typeof window !== 'undefined' && window.location?.origin ? `${window.location.origin}/login` : `${APP_URL}/login`)
  const subject = `🎉 Welcome to ${companyName} — Your Agent Account Credentials`

  if (!isResendConfigured) {
    const body = `Hi ${employeeName} 👋,

Welcome to ${companyName}! Your agent account has been created on AM2PM's Mr. Manager platform.

Here are your account credentials:
- Portal URL: ${url}
- Agent / Employee ID: ${employeeId || 'N/A'}
- Login Email: ${employeeEmail}
- Temporary Password: ${password}
- Assigned Role: ${role}

Please log in using the link above and update your password on your first login.

Best regards,
The ${companyName} Team`

    openMailto({ to: employeeEmail, subject, body })
    return { simulated: true, mailto: true }
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8F9FC;font-family:Inter,system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #E4E7EF;box-shadow:0 10px 25px rgba(0,0,0,0.05);">
    <div style="background:#1b3d36;padding:32px 40px;color:#fff;">
      <div style="font-size:22px;font-weight:800;letter-spacing:-0.3px;color:#3cb27f;">AM2PM's Mr. Manager</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px;">${companyName} — Agent Onboarding</div>
    </div>
    <div style="padding:36px 40px;">
      <h2 style="margin:0 0 16px;font-size:20px;color:#0F1117;">Welcome, ${employeeName} 👋</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#4A5068;line-height:1.6;">
        An agent account has been provisioned for you at <strong>${companyName}</strong>. You can now access your assigned tasks, training modules, and company workflows.
      </p>

      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:20px;margin:20px 0;">
        <div style="font-size:12px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">Your Login Credentials</div>
        <div style="font-size:13px;color:#334155;margin-bottom:8px;">🆔 Agent ID: <strong style="color:#0F172A;font-family:monospace;font-size:14px;">${employeeId || 'N/A'}</strong></div>
        <div style="font-size:13px;color:#334155;margin-bottom:8px;">📧 Email: <strong style="color:#0F172A;">${employeeEmail}</strong></div>
        <div style="font-size:13px;color:#334155;margin-bottom:8px;">🔑 Password: <strong style="color:#059669;font-family:monospace;font-size:15px;background:#DCFCE7;padding:2px 8px;border-radius:4px;">${password}</strong></div>
        <div style="font-size:13px;color:#334155;">💼 Role: <strong style="color:#0F172A;">${role}</strong></div>
      </div>

      <div style="text-align:center;margin:28px 0 20px;">
        <a href="${url}" style="display:inline-block;background:#3cb27f;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">
          Log In to Mr. Manager →
        </a>
      </div>

      <p style="font-size:12px;color:#8B91A8;line-height:1.6;margin:24px 0 0;">
        Please keep these credentials safe and change your password upon your first sign in.<br>
        If you have questions, reach out to your administrator.
      </p>
    </div>
    <div style="background:#F8F9FC;padding:16px 40px;border-top:1px solid #E4E7EF;font-size:12px;color:#8B91A8;text-align:center;">
      Sent by ${companyName} via Mr. Manager Platform
    </div>
  </div>
</body>
</html>`

  return sendEmail({ to: employeeEmail, subject, html })
}


// ─── PASSWORD CHANGED BY ADMIN EMAIL ──────────────────────────

export async function sendPasswordResetByAdminEmail({
  employeeName,
  employeeEmail,
  password,
  companyName = 'AM2PM Support',
  loginUrl
}) {
  const url = loginUrl || (typeof window !== 'undefined' && window.location?.origin ? `${window.location.origin}/login` : `${APP_URL}/login`)
  const subject = `Your ${companyName} password has been reset`

  if (!isResendConfigured) {
    const body = `Hi ${employeeName || 'there'},

Your administrator has reset your password for AM2PM's Mr. Manager.

- Login URL: ${url}
- Email: ${employeeEmail}
- New temporary password: ${password}

Please sign in and change this password as soon as possible.

Best regards,
The ${companyName} Team`
    openMailto({ to: employeeEmail, subject, body })
    return { simulated: true, mailto: true }
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8F9FC;font-family:Inter,system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #E4E7EF;">
    <div style="background:#1b3d36;padding:28px 40px;">
      <div style="font-size:20px;font-weight:800;color:#3cb27f;">AM2PM's Mr. Manager</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px;">${companyName} — Password reset</div>
    </div>
    <div style="padding:32px 40px;">
      <h2 style="margin:0 0 14px;font-size:19px;color:#0F1117;">Hi ${employeeName || 'there'},</h2>
      <p style="margin:0 0 18px;font-size:14px;color:#4A5068;line-height:1.6;">
        Your administrator has reset your password. Use the temporary password below to sign in, then change it.
      </p>
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:18px;margin:18px 0;">
        <div style="font-size:13px;color:#334155;margin-bottom:8px;">📧 Email: <strong style="color:#0F172A;">${employeeEmail}</strong></div>
        <div style="font-size:13px;color:#334155;">🔑 New password: <strong style="color:#059669;font-family:monospace;font-size:15px;background:#DCFCE7;padding:2px 8px;border-radius:4px;">${password}</strong></div>
      </div>
      <div style="text-align:center;margin:24px 0 8px;">
        <a href="${url}" style="display:inline-block;background:#3cb27f;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">Log in →</a>
      </div>
      <p style="font-size:12px;color:#8B91A8;line-height:1.6;margin:20px 0 0;">If you did not expect this, contact your administrator.</p>
    </div>
  </div>
</body>
</html>`

  return sendEmail({ to: employeeEmail, subject, html })
}
