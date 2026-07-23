function normalizeEmailCandidate(raw) {
  if (!raw) return ''
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/\(at\)|\[at\]|\s+@/g, '@')
    .replace(/\s*\.\s*/g, '.')
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)\s*/g, ')')
}

function isLikelyEmail(candidate) {
  if (!candidate || !candidate.includes('@')) return false
  if (candidate.includes('mailto:') || candidate.includes('noemail')) return false

  const [localPart, domainPart] = candidate.split('@')
  if (!localPart || !domainPart) return false

  const cleanDomain = domainPart.toLowerCase().replace(/[^a-z0-9.-]/g, '')
  if (!cleanDomain.includes('.')) return false

  const parts = cleanDomain.split('.').filter(Boolean)
  const tld = parts[parts.length - 1]
  return parts.length >= 2 && tld.length >= 2 && tld.length <= 6
}

function extractEmailCandidates(cvText) {
  if (!cvText) return []

  const cleaned = cvText.replace(/\r/g, ' ')
  const normalizedText = cleaned
    .replace(/\s+([@._%+\-])/g, '$1')
    .replace(/([@._%+\-])\s+/g, '$1')
    .replace(/\s*\(at\)\s*/gi, '@')
    .replace(/\s*\(dot\)\s*/gi, '.')
  const candidates = []

  const patterns = [
    /([a-z0-9._%+\-]+@[a-z0-9.-]+\.[a-z]{2,6})(?![a-z0-9._%+\-])/gi,
    /(?:email|e-mail)\s*[:#-]?\s*([a-z0-9._%+\-]+@[a-z0-9.-]+\.[a-z]{2,6})(?![a-z0-9._%+\-])/gi,
  ]

  patterns.forEach((pattern) => {
    for (const match of normalizedText.matchAll(pattern)) {
      const value = (match[1] || match[0] || '').trim()
      const normalized = normalizeEmailCandidate(value)
      if (!normalized || !isLikelyEmail(normalized)) continue
      candidates.push(normalized)
    }
  })

  const directMatch = normalizedText.match(/[a-z0-9._%+\-]+@[a-z0-9.-]+\.[a-z]{2,6}(?![a-z0-9._%+\-])/i)
  if (directMatch) {
    const normalized = normalizeEmailCandidate(directMatch[0])
    if (isLikelyEmail(normalized)) candidates.push(normalized)
  }

  return [...new Set(candidates)]
}

export function extractCandidateEmail(cvText, fallback = '') {
  if (!cvText) return fallback || ''

  const candidates = extractEmailCandidates(cvText)
  for (const candidate of candidates) {
    const isLikelyPlaceholder = /cv\.import|noemail|internal|placeholder/i.test(candidate)
    if (!isLikelyPlaceholder) return candidate
  }

  return candidates[0] || fallback || ''
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
