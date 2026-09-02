const COMMON_SURNAMES = [
  'SINGH', 'KUMAR', 'SHARMA', 'VERMA', 'GUPTA', 'PATEL', 'YADAV', 'JAIN',
  'SHAH', 'MEHTA', 'REDDY', 'RAO', 'DAS', 'DEY', 'SEN', 'ROY', 'MISHRA',
  'PANDEY', 'TIWARI', 'CHOUDHARY', 'CHAUHAN', 'SINGHAL', 'AGRAWAL', 'AGGARWAL',
  'BANSAL', 'GARG', 'GOEL', 'KAPOOR', 'KHANNA', 'MALHOTRA', 'BHATIA', 'CHOPRA',
  'SAXENA', 'BHARDWAJ', 'KAUR', 'ALI', 'KHAN', 'AHMED', 'ANSARI', 'DWIVEDI',
  'TRIPATHI', 'JOSHI', 'BHATT', 'NAIR', 'PILLAI', 'MENON', 'IYER', 'IYENGAR',
  'CHOWDHURY', 'DUTTA', 'BOSE', 'BANERJEE', 'CHATTERJEE', 'MUKHERJEE', 'BISWAS',
  'SARKAR', 'GHOSE', 'GHOSH', 'SMITH', 'JOHNSON', 'WILLIAMS', 'BROWN', 'JONES',
  'GARCIA', 'MILLER', 'DAVIS', 'RODRIGUEZ', 'MARTINEZ', 'HERNANDEZ', 'LOPEZ'
]

const SURNAME_REGEX = new RegExp(`(${COMMON_SURNAMES.join('|')})$`, 'i')

export function toTitleCase(str) {
  if (!str || typeof str !== 'string') return ''
  return str
    .trim()
    .split(/\s+/)
    .map(word => {
      // If single initial with dot like "S." or "A."
      if (/^[a-zA-Z]\.?$/.test(word)) {
        return word.toUpperCase()
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

export function cleanCandidateName(rawName) {
  if (!rawName || typeof rawName !== 'string') return ''

  let name = rawName.trim()

  // 1. Remove file extensions (.pdf, .docx, .doc, .txt, etc.)
  name = name.replace(/\.[a-zA-Z0-9]{2,5}$/, '')

  // 2. Remove file/version brackets like (1), [copy], etc.
  name = name.replace(/\s*[\(\[]\s*(?:\d+|copy|final|draft|new|updated|v\d+)\s*[\)\]]/gi, '')

  // 3. Replace underscores, hyphens, and dots between words with space
  name = name.replace(/[-_]/g, ' ')

  // 4. Strip document prefixes (CV, Resume, Curriculum Vitae, Bio-data, Profile)
  name = name.replace(/^(?:curriculum\s+vitae|curriculumvitae|resume|biodata|bio\s*data|profile|cv)\s*[:\-\s]+/gi, '')

  // If "CV" is directly attached to the beginning of uppercase or camelCase name (e.g. CVABHISHEKSINGH or CVAbhishek)
  name = name.replace(/^cv(?=[a-z]{3,}|[A-Z]{3,}|[A-Z][a-z])/i, '')

  // 5. Strip document suffixes
  name = name.replace(/\s*[:\-\s]+(?:curriculum\s+vitae|curriculumvitae|resume|biodata|bio\s*data|profile|cv)\s*$/gi, '')
  name = name.replace(/\s+(?:curriculum\s+vitae|resume|cv)\b\s*$/gi, '')

  // 6. Strip role/designation suffixes at the end of filenames (e.g. "S.E", "SE", "Sales Executive", "Developer")
  name = name.replace(/\s*[:\-\s]+(?:s\.?e\.?|b\.?d\.?e?\.?|sales\s+executive|software\s+engineer|developer|engineer|manager|lead|intern|analyst|executive|associate|consultant|specialist|frontend|backend|fullstack|qa|designer)\s*$/gi, '')
  name = name.replace(/\s+(?:s\.?e\.?|b\.?d\.?e?\.?)\s*$/gi, '')

  // Strip trailing version/draft words
  name = name.replace(/\s*[:\-\s]+(?:v\d+|copy|\d+|final|draft|new|updated|latest)\s*$/gi, '')

  // 7. Split CamelCase if words were stuck together: "AbhishekSingh" -> "Abhishek Singh"
  name = name.replace(/([a-z])([A-Z])/g, '$1 $2')

  // 8. If the name is a single stuck-together uppercase token like "ABHISHEKSINGH", try splitting by known surname
  const tokens = name.trim().split(/\s+/)
  if (tokens.length === 1 && tokens[0].length >= 7) {
    const singleToken = tokens[0]
    const match = singleToken.match(SURNAME_REGEX)
    if (match) {
      const surname = match[1]
      const forename = singleToken.slice(0, singleToken.length - surname.length)
      if (forename.length >= 3) {
        name = `${forename} ${surname}`
      }
    }
  }

  name = name.replace(/\s+/g, ' ').trim()

  return toTitleCase(name)
}

export function extractNameFromCVText(cvText) {
  if (!cvText || typeof cvText !== 'string') return ''

  const lines = cvText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)

  if (lines.length === 0) return ''

  // Pattern 1: Look for explicit name labels like "Name: Abhishek Singh", "Full Name - Mayank Jain"
  for (const line of lines.slice(0, 25)) {
    const match = line.match(/^(?:name|full\s*name|candidate\s*name)\s*[:\-]\s*([a-zA-Z\s.]{2,40})/i)
    if (match && match[1]) {
      const candidateName = match[1].trim()
      if (isLikelyCandidateName(candidateName)) {
        return toTitleCase(candidateName)
      }
    }
  }

  // Pattern 2: Scan the top 10 lines of the CV for the candidate's name heading
  const nonNameWords = /resume|curriculum|vitae|bio|summary|experience|education|skills|projects|objective|contact|profile|phone|email|address|personal|work|page|declaration|details|career/i

  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    const line = lines[i]

    // Skip lines with emails, links, phone numbers, or digits
    if (line.includes('@') || line.includes('http') || line.includes('www.') || line.includes('+') || /\d/.test(line)) {
      continue
    }

    // Skip lines that contain resume headings or punctuation
    if (nonNameWords.test(line) || /[/\\:;*|#_=]/.test(line)) {
      continue
    }

    // A valid name line is typically 2 to 4 words, each 2-20 alphabetic characters
    const words = line.split(/\s+/)
    if (words.length >= 2 && words.length <= 4) {
      const allLetters = words.every(w => /^[a-zA-Z.]+$/.test(w))
      if (allLetters && line.length <= 40 && isLikelyCandidateName(line)) {
        return toTitleCase(line)
      }
    }
  }

  return ''
}

export function isLikelyCandidateName(name) {
  if (!name || typeof name !== 'string') return false
  const trimmed = name.trim()
  if (trimmed.length < 2 || trimmed.length > 50) return false

  // Reject file extensions or placeholders
  if (/\.(pdf|docx?|txt|rtf)$/i.test(trimmed)) return false
  if (/noemail|placeholder|candidate|unknown|untitled|document/i.test(trimmed)) return false

  // Must not have digits or symbols other than dots/spaces
  if (/[0-9@/\\:;*|#_=]/.test(trimmed)) return false

  return true
}

export function getCleanCandidateName(candidate) {
  if (!candidate) return 'Candidate'

  // If passed directly as a string name
  if (typeof candidate === 'string') {
    const cleaned = cleanCandidateName(candidate)
    return cleaned || candidate || 'Candidate'
  }

  const rawName = candidate.name || ''

  // 1. If cv_text is available and rawName looks like a raw filename (e.g. contains CV, S.E, no spaces, or underscores)
  const isSuspiciousFilename = !rawName ||
    /^(?:cv|resume)/i.test(rawName) ||
    /[-_]/.test(rawName) ||
    /\.(pdf|docx?)/i.test(rawName) ||
    /\s*(?:s\.?e\.?|b\.?d\.?e?\.?)$/i.test(rawName) ||
    !rawName.includes(' ')

  if (candidate.cv_text && isSuspiciousFilename) {
    const fromCV = extractNameFromCVText(candidate.cv_text)
    if (fromCV && isLikelyCandidateName(fromCV)) {
      return fromCV
    }
  }

  // 2. Clean the raw name
  const cleaned = cleanCandidateName(rawName)
  if (cleaned && isLikelyCandidateName(cleaned)) {
    return cleaned
  }

  return rawName ? toTitleCase(rawName) : 'Candidate'
}
