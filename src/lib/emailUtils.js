// Common TLDs used to repair emails where PDF text extraction glued the next
// word onto the address (e.g. "john@gmail.comLinkedIn" -> "john@gmail.com").
const KNOWN_TLDS = [
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'info', 'biz', 'name', 'pro',
  'in', 'co', 'io', 'ai', 'me', 'us', 'uk', 'ca', 'au', 'de', 'fr', 'sg', 'ae',
  'nz', 'za', 'ng', 'ke', 'pk', 'bd', 'lk', 'np', 'cn', 'jp', 'kr', 'ru', 'br',
  'it', 'es', 'nl', 'se', 'ch', 'ie', 'ac', 'tv', 'cc', 'ws', 'dev', 'app',
  'xyz', 'tech', 'online', 'site', 'store', 'cloud', 'email', 'live', 'work',
]
// Real long TLDs that must never be truncated by the repair above.
const LONG_TLDS = new Set(['company', 'solutions', 'digital', 'global', 'agency', 'consulting', 'services', 'technology', 'technologies', 'systems', 'network', 'university', 'education', 'finance', 'media', 'group', 'world', 'today', 'center', 'academy'])

function repairEmail(email) {
  if (!email || !email.includes('@')) return email
  let [local, domain] = email.split('@')

  // Phone number glued in front of the address: "9876543210john@x.com"
  local = local.replace(/^\d{10,}(?=[a-z])/, '')

  // Next word glued after the TLD: "john@gmail.comlinkedin"
  const labels = domain.split('.')
  const last = labels[labels.length - 1]
  if (last && last.length > 3 && !KNOWN_TLDS.includes(last) && !LONG_TLDS.has(last)) {
    const match = KNOWN_TLDS
      .filter(t => last.startsWith(t))
      .sort((a, b) => b.length - a.length)[0]
    if (match) labels[labels.length - 1] = match
  }
  domain = labels.join('.')

  return `${local}@${domain}`
}

function normalizeEmailCandidate(raw) {
  if (!raw || typeof raw !== 'string') return ''
  const cleaned = raw
    .toLowerCase()
    .trim()
    .replace(/^mailto:\s*/i, '')
    .replace(/^<|>$/g, '')
    .replace(/\s+/g, '')
    .replace(/\(at\)|\[at\]|\s+@/g, '@')
    .replace(/\(dot\)|\[dot\]/g, '.')
    .replace(/\s*\.\s*/g, '.')
    .replace(/[.,;:)>]+$/, '')
    .replace(/^\(+/, '')
  return repairEmail(cleaned)
}

/**
 * Lenient validator for emails typed by a user. Returns the cleaned address
 * (lower-cased, trimmed, "mailto:" stripped) or '' if it is not usable.
 * Unlike isLikelyEmail it does NOT reject placeholder/example domains, so users
 * can always enter whatever real address they have.
 */
export function sanitizeManualEmail(raw) {
  if (!raw || typeof raw !== 'string') return ''
  const clean = raw.trim().toLowerCase().replace(/^mailto:\s*/i, '').replace(/^<|>$/g, '').replace(/\s+/g, '')
  return /^[a-z0-9._%+\-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,24}$/.test(clean) ? clean : ''
}

/** Unique placeholder used when a CV has no email, so the DB NOT NULL constraint is satisfied. */
export function makePlaceholderEmail(seed = '') {
  return `cv.import.${Date.now()}${seed !== '' ? '.' + seed : ''}.${Math.random().toString(36).slice(2, 6)}@noemail.local`
}

export function isLikelyEmail(candidate) {
  if (!candidate || typeof candidate !== 'string' || !candidate.includes('@')) return false
  if (/noemail|cv\.import|placeholder|internal\.local|example\.com/i.test(candidate)) return false

  const clean = candidate.replace(/^mailto:\s*/i, '').replace(/[.,;:)>]+$/, '').trim().toLowerCase()
  const atParts = clean.split('@')
  if (atParts.length !== 2) return false
  const [localPart, domainPart] = atParts
  if (!localPart || !domainPart || localPart.length < 1 || domainPart.length < 3) return false

  if (/[^a-z0-9._%+\-]/.test(localPart)) return false
  if (!domainPart.includes('.')) return false

  const domainParts = domainPart.split('.').filter(Boolean)
  if (domainParts.length < 2) return false

  const tld = domainParts[domainParts.length - 1]
  return /^[a-z]{2,12}$/.test(tld)
}

function extractEmailCandidates(cvText) {
  if (!cvText || typeof cvText !== 'string') return []

  const cleaned = cvText.replace(/\r/g, ' ').replace(/\u0000/g, '')
  const normalizedText = cleaned
    .replace(/\s+([@._%+\-])/g, '$1')
    .replace(/([@._%+\-])\s+/g, '$1')
    .replace(/\s*\(at\)\s*/gi, '@')
    .replace(/\s*\[at\]\s*/gi, '@')
    .replace(/\s*\(dot\)\s*/gi, '.')
    .replace(/\s*\[dot\]\s*/gi, '.')

  const candidates = []

  const patterns = [
    /(?:email|e-mail|mail|email\s*id|contact)\s*[:#-]?\s*<?\s*([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12})/gi,
    /mailto:\s*([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12})/gi,
    /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12})(?![a-zA-Z0-9._%+\-])/g,
  ]

  patterns.forEach((pattern) => {
    for (const match of normalizedText.matchAll(pattern)) {
      const value = (match[1] || match[0] || '').trim()
      const normalized = normalizeEmailCandidate(value)
      if (normalized && isLikelyEmail(normalized)) {
        candidates.push(normalized)
      }
    }
  })

  // Also check original cleaned text in case normalized text altered something
  const directMatches = cleaned.matchAll(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12})/g)
  for (const match of directMatches) {
    const normalized = normalizeEmailCandidate(match[1] || match[0])
    if (normalized && isLikelyEmail(normalized)) {
      candidates.push(normalized)
    }
  }

  // Also check for spaced-out emails like "a b h i s h e k @ g m a i l . c o m"
  const spacedMatches = cleaned.matchAll(/(?:[a-zA-Z0-9]\s+)+@\s+(?:[a-zA-Z0-9]\s+)+\.\s+(?:[a-zA-Z]{2,6})/g)
  for (const match of spacedMatches) {
    const normalized = normalizeEmailCandidate(match[0])
    if (normalized && isLikelyEmail(normalized)) {
      candidates.push(normalized)
    }
  }

  return [...new Set(candidates)]
}

export function extractCandidateEmail(cvText, fallback = '') {
  if (cvText) {
    const candidates = extractEmailCandidates(cvText)
    for (const candidate of candidates) {
      if (isLikelyEmail(candidate)) return candidate
    }
  }

  if (fallback && isLikelyEmail(fallback)) {
    return fallback
  }

  return ''
}

export function getCleanCandidateEmail(candidate) {
  if (!candidate) return ''
  const currentEmail = candidate.email || ''

  if (isLikelyEmail(currentEmail)) {
    return currentEmail.toLowerCase().trim()
  }

  if (candidate.cv_text) {
    const extracted = extractCandidateEmail(candidate.cv_text)
    if (extracted && isLikelyEmail(extracted)) {
      return extracted.toLowerCase().trim()
    }
  }

  return ''
}

export function buildEmailDraft({ type = 'interview', recipientEmail, name, jobTitle, context }) {
  const recipientName = name || 'there'
  const safeJobTitle = jobTitle || 'the role'
  const baseBody = [
    `Hi ${recipientName},`,
    '',
    type === 'hiring'
      ? `I hope you are doing well. I am reaching out regarding your interest in the ${safeJobTitle} job role. I would like to understand your willingness to proceed with the opportunity and confirm your consent to continue the hiring process.`
      : `I hope you are doing well. I am reaching out regarding your interview schedule and would like to confirm the next steps.`,
    '',
    'Please let me know your availability and any questions you may have.',
    '',
    'Best regards,',
    'Mr. Manager Team',
  ].join('\n')

  const subject = type === 'hiring'
    ? `Regarding your interest in the ${safeJobTitle} job role`
    : `Regarding your interview for ${safeJobTitle}`

  return {
    subject,
    body: baseBody,
    to: recipientEmail || '',
  }
}
