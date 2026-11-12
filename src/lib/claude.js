const API_URL = '/anthropic/v1/messages'
const MODEL   = 'claude-haiku-4-5-20251001'
const rawKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_CLAUDE_API_KEY : (typeof process !== 'undefined' ? process.env?.VITE_CLAUDE_API_KEY : null)
const API_KEY = rawKey && rawKey !== 'your_claude_api_key' ? rawKey : null

async function callClaude(system, userMessage, maxTokens = 1000) {
  if (!API_KEY) throw new Error('Claude API key not configured. Add VITE_CLAUDE_API_KEY to your .env file.')

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }]
    })
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || `API error ${response.status}`)
  }
  return data.content[0].text
}

const DEPT_RESPONSIBILITIES = {
  Sales: [
    "Manage the end-to-end sales cycle, from prospecting and lead generation to contract closure.",
    "Deliver persuasive presentations and product demonstrations to potential clients.",
    "Build and maintain strong, long-lasting relationships with customer stakeholders.",
    "Track sales metrics and update CRM records diligently to ensure pipeline accuracy."
  ],
  Engineering: [
    "Design, build, and maintain highly scalable, reliable, and efficient software applications.",
    "Write clean, well-documented, and thoroughly tested code in collaboration with the team.",
    "Participate in technical design discussions, code reviews, and architecture planning.",
    "Identify and resolve performance bottlenecks, system bugs, and customer-reported issues."
  ],
  Marketing: [
    "Develop and execute creative marketing campaigns to build brand awareness and drive lead generation.",
    "Analyze campaign performance data to optimize return on ad spend (ROAS) and user acquisition costs.",
    "Manage social media presence, content creation, and email marketing outreach.",
    "Conduct market research to identify customer trends and analyze competitor positioning."
  ],
  HR: [
    "Lead talent acquisition efforts, including sourcing, screening, interviewing, and onboarding new hires.",
    "Maintain employee records, administer benefits, and ensure compliance with labor laws.",
    "Develop and implement employee engagement programs to foster a positive workplace culture.",
    "Support performance management cycles and employee relations initiatives."
  ],
  Operations: [
    "Oversee daily business operations, identify inefficiencies, and streamline internal processes.",
    "Manage vendor relations, procurement, and logistics to ensure smooth service delivery.",
    "Collaborate with finance and management teams to plan budgets and resource allocations.",
    "Develop and monitor operational performance metrics to guide business decisions."
  ],
  Finance: [
    "Manage financial records, bookkeeping, and ensure accurate monthly/annual closures.",
    "Assist in budget planning, cash flow forecasting, and financial risk assessments.",
    "Prepare tax filings, financial statements, and coordinate with external auditors.",
    "Analyze financial data to identify cost-saving opportunities and support business growth."
  ],
  "Customer Success": [
    "Onboard new customers, ensuring a smooth transition and rapid time-to-value.",
    "Proactively engage with clients to understand their goals and ensure high satisfaction.",
    "Identify upsell and renewal opportunities within the existing customer base.",
    "Act as the voice of the customer, sharing product feedback with engineering and product teams."
  ]
}

// ─── GENERATE JD ─────────────────────────────────────────────

export async function generateJD({ title, department, location, type, salary, reportingTo, skills, experience, description }) {
  if (!API_KEY) {
    const roleTitle = title || 'Specialist'
    const dept = department || 'General'
    const loc = location || 'Remote / Hybrid'
    const empType = type || 'Full-time'
    const salRange = salary || 'Competitive'
    const manager = reportingTo || 'Department Head'
    const exp = experience || 'Not specified'
    const skillsList = skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : []
    
    // Select department-specific responsibilities
    const defaultResp = [
      "Collaborate with team members to deliver high-quality work and align on strategic goals.",
      "Participate in meetings, brainstorm sessions, and cross-functional project planning.",
      "Analyze metrics and optimize workflows to improve overall performance.",
      "Support daily team operational activities and contribute to a positive culture."
    ]
    const respList = DEPT_RESPONSIBILITIES[dept] || defaultResp
    
    // Add description text to responsibilities if present
    const extraBullets = description 
      ? description.split('\n').map(l => l.trim()).filter(l => l.length > 5) 
      : []

    let responsibilitiesSection = ''
    respList.forEach(r => {
      responsibilitiesSection += `- ${r}\n`
    })
    extraBullets.forEach(b => {
      if (b.startsWith('-') || b.startsWith('*')) {
        responsibilitiesSection += `${b}\n`
      } else {
        responsibilitiesSection += `- ${b}\n`
      }
    })

    let skillsSection = ''
    if (skillsList.length > 0) {
      skillsSection += `- Strong proficiency in: ${skillsList.join(', ')}\n`
    }
    skillsSection += `- Proven track record of taking ownership and delivering results\n`
    skillsSection += `- Excellent communication, collaboration, and problem-solving skills\n`

    return `Role: ${roleTitle}
Department: ${dept}
Location: ${loc}
Type: ${empType}
Salary Range: ${salRange}
Reporting To: ${manager}

ROLE SUMMARY
We are seeking a talented and motivated ${roleTitle} to join our growing ${dept} team. In this role, you will be based in ${loc} (${empType}) and work closely with our professional team, reporting directly to the ${manager}. This is a key position offering a competitive compensation package of ${salRange}.

KEY RESPONSIBILITIES
${responsibilitiesSection}
REQUIREMENTS (MUST HAVE)
- Relevant Experience: ${exp}
${skillsSection}
NICE TO HAVE
- Prior experience in a high-growth environment
- Exposure to modern digital tools and cross-functional workflows

WHAT WE OFFER
- Competitive salary (${salRange}) and performance-based incentives
- Comprehensive health insurance and wellness benefits
- Flexible work hours and collaborative team culture
- High-growth learning environment with great career development opportunities`
  }

  const system = localStorage.getItem('company_jd_prompt') || `You are an expert HR professional at a fast-growing Indian tech company.
Generate a professional, compelling job description in plain text (not markdown).
Include: role overview (2-3 sentences), key responsibilities (6-8 bullet points with -),
requirements must-have (4-5 points with -), nice-to-have (2-3 points with -),
and what we offer (4-5 points with -). Keep under 500 words. Be specific, not generic.`

  const prompt = `Create a job description for:
Role: ${title}
Department: ${department}
Location: ${location}
Employment Type: ${type}
Salary Range: ${salary}
Reporting To: ${reportingTo || 'Department Head'}
Relevant Experience Required: ${experience || 'Not specified'}
Key Skills Required: ${skills || 'Not specified'}
${description ? `Additional Context / Notes: ${description}` : ''}

Return the full JD as clean plain text with clear sections.`

  return callClaude(system, prompt, 1000)
}

// ─── GENERATE JOB CRITERIA & QUALIFYING QUESTIONS ─────────────

const DOMAIN_SKILL_PRESETS = {
  Engineering: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'SQL', 'PostgreSQL', 'MongoDB', 'AWS', 'Docker', 'Git', 'REST APIs'],
  Frontend: ['React', 'JavaScript', 'TypeScript', 'HTML5', 'CSS3', 'Redux', 'Tailwind CSS', 'REST APIs', 'Git'],
  Backend: ['Node.js', 'Python', 'Java', 'PostgreSQL', 'MongoDB', 'Redis', 'REST APIs', 'Microservices', 'Docker', 'AWS'],
  Sales: ['B2B Sales', 'Lead Generation', 'Cold Calling', 'CRM (Salesforce / HubSpot)', 'Pipeline Management', 'Client Relationships', 'Negotiation', 'Closing Deals'],
  Marketing: ['Digital Marketing', 'SEO', 'PPC / Google Ads', 'Content Strategy', 'Social Media Marketing', 'Email Marketing', 'Google Analytics', 'Copywriting'],
  HR: ['End-to-End Recruitment', 'Talent Sourcing', 'Resume Screening', 'ATS Management', 'Employee Onboarding', 'Labor Law Compliance', 'Employee Relations'],
  Finance: ['Financial Accounting', 'Tally Prime / ERP', 'GST & TDS Filing', 'Balance Sheet Reconciliation', 'Budgeting & Forecasting', 'Auditing', 'Advanced MS Excel'],
  Operations: ['Process Optimization', 'SLA Management', 'Workflow Automation', 'Vendor Management', 'Supply Chain Coordination', 'Resource Allocation', 'KPI Tracking'],
  "Customer Success": ['Customer Onboarding', 'Account Management', 'Zendesk / Freshdesk', 'Client Retention', 'Churn Reduction', 'Customer Advocacy'],
  Design: ['Figma', 'UI/UX Design', 'User Research', 'Wireframing', 'Prototyping', 'Design Systems', 'Adobe Creative Suite']
}

export function extractSkillsFromText(text = '') {
  if (!text) return []
  const skills = []
  const lines = text.split('\n')
  let inSkillsSection = false
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^(skills|key skills|requirements|must have|technical skills|qualifications):/i.test(trimmed)) {
      inSkillsSection = true
      continue
    }
    if (inSkillsSection && /^(responsibilities|what we offer|nice to have|about us|role summary):/i.test(trimmed)) {
      inSkillsSection = false
    }
    if (inSkillsSection && trimmed.startsWith('-')) {
      const item = trimmed.replace(/^[-*•]\s*/, '').replace(/^(strong proficiency in|experience with|knowledge of|proven track record in)\s*/i, '').trim()
      if (item && item.length < 50) {
        item.split(/[,/]/).forEach(s => {
          const sTrim = s.trim()
          if (sTrim && sTrim.length > 1 && sTrim.length < 35) skills.push(sTrim)
        })
      }
    }
  }

  return [...new Set(skills)]
}

export async function generateJobCriteria({ title, department, jd, skills, experience, description }) {
  const roleTitle = title || 'Specialist'
  const dept = department || 'General'

  if (API_KEY) {
    const system = `You are an elite Talent Acquisition Specialist and Technical Recruiter.
Your job is to analyze a role and Job Description (JD) and extract:
1. Exact required skills (technical, domain-specific, tools, and methodologies).
2. 4 to 6 specific, objective qualifying screening questions that can be evaluated directly from a candidate's CV/resume.
Each qualifying question must be a clear yes/no question about experience, skills, tools, or certifications.
Mark 1-2 non-negotiable questions as "dealbreaker: true" (e.g., minimum required experience, mandatory licensing or core technology).
Always return valid JSON ONLY with NO markdown fences, no explanatory text.`

    const prompt = `Analyze this role and job description:
Role: ${roleTitle}
Department: ${dept}
Required Experience: ${experience || 'Not specified'}
Specified Skills: ${skills || 'Not specified'}
Job Description:
${jd || description || ''}

Return ONLY this JSON structure:
{
  "requiredSkills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5", "Skill 6"],
  "qualifyingQuestions": [
    { "question": "Does the candidate have at least X years of hands-on experience in ...?", "dealbreaker": true },
    { "question": "Does the candidate have demonstrated expertise with ...?", "dealbreaker": true },
    { "question": "Has the candidate worked with ...?", "dealbreaker": false },
    { "question": "Does the candidate have experience in ...?", "dealbreaker": false }
  ]
}`

    try {
      const raw = await callClaude(system, prompt, 800)
      const clean = raw.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      if (Array.isArray(parsed.requiredSkills) && Array.isArray(parsed.qualifyingQuestions)) {
        return {
          requiredSkills: parsed.requiredSkills.filter(Boolean),
          qualifyingQuestions: parsed.qualifyingQuestions.map(q => ({
            question: q.question || '',
            dealbreaker: !!q.dealbreaker
          })).filter(q => q.question.trim().length > 0)
        }
      }
    } catch (e) {
      console.warn('Claude generateJobCriteria fallback:', e.message)
    }
  }

  // Heuristic generation fallback:
  const extractedFromJD = extractSkillsFromText(jd)
  const userSkills = skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : []
  const presetSkills = DOMAIN_SKILL_PRESETS[dept] || DOMAIN_SKILL_PRESETS['Engineering']
  const matchedPresets = presetSkills.filter(s => (jd || '').toLowerCase().includes(s.toLowerCase()) || roleTitle.toLowerCase().includes(s.toLowerCase()))

  const combinedSkills = [...new Set([...userSkills, ...extractedFromJD, ...matchedPresets, ...presetSkills.slice(0, 6)])].slice(0, 8)

  let reqYears = 2
  const expMatch = (experience || jd || '').match(/(\d+)\s*(?:\+|plus|[-–—]|to)?\s*(\d+)?\s*(?:years?|yrs?)/i)
  if (expMatch) {
    reqYears = parseInt(expMatch[1]) || 2
  }

  const qList = []
  qList.push({
    question: `Does the candidate have at least ${reqYears} year${reqYears > 1 ? 's' : ''} of relevant professional experience as a ${roleTitle} or in a directly related role?`,
    dealbreaker: true
  })

  const primarySkills = combinedSkills.slice(0, 3)
  if (primarySkills.length > 0) {
    qList.push({
      question: `Does the candidate demonstrate hands-on expertise in key required skills (${primarySkills.join(', ')})?`,
      dealbreaker: true
    })
  }

  const secondarySkills = combinedSkills.slice(3, 6)
  if (secondarySkills.length > 0) {
    qList.push({
      question: `Has the candidate handled core responsibilities involving ${secondarySkills.join(', ')}?`,
      dealbreaker: false
    })
  } else {
    qList.push({
      question: `Does the candidate's background show end-to-end execution of projects and operational goals in ${dept}?`,
      dealbreaker: false
    })
  }

  qList.push({
    question: `Does the candidate exhibit familiarity with modern ${dept} tools, documentation standards, and collaborative team processes?`,
    dealbreaker: false
  })

  qList.push({
    question: `Does the candidate possess a recognized degree, diploma, or relevant professional certification suitable for this role?`,
    dealbreaker: false
  })

  return {
    requiredSkills: combinedSkills,
    qualifyingQuestions: qList
  }
}

// ─── SCREEN RESUME ────────────────────────────────────────────

export async function screenResume({ cvText, jd, candidateName, qualifyingQuestions = [], requiredSkills = [] }) {
  const textLower = (cvText || '').toLowerCase()
  const jdLower = (jd || '').toLowerCase()

  // 1. Resolve Target Required Skills for this specific job
  let targetSkills = []
  if (Array.isArray(requiredSkills)) {
    targetSkills = requiredSkills.map(s => String(s).trim()).filter(Boolean)
  } else if (typeof requiredSkills === 'string' && requiredSkills.trim()) {
    targetSkills = requiredSkills.split(',').map(s => s.trim()).filter(Boolean)
  }
  if (!targetSkills.length && jd) {
    targetSkills = extractSkillsFromText(jd)
  }
  if (!targetSkills.length) {
    const COMMON_SKILLS = [
      'react', 'node.js', 'node', 'javascript', 'typescript', 'html', 'css', 'sql', 'postgresql', 'mongodb', 
      'aws', 'gcp', 'docker', 'kubernetes', 'git', 'python', 'java', 'salesforce', 'crm', 'b2b sales', 
      'negotiation', 'lead generation', 'cold calling', 'marketing', 'seo', 'ppc', 'copywriting', 
      'product management', 'jira', 'agile', 'scrum', 'excel', 'communication', 'customer success', 
      'operations', 'recruiting', 'onboarding', 'hr', 'finance', 'accounting'
    ]
    targetSkills = COMMON_SKILLS.filter(s => jdLower.includes(s.toLowerCase()))
  }
  if (!targetSkills.length) {
    targetSkills = ['communication', 'teamwork', 'problem solving']
  }

  // 2. Estimate Candidate Experience from CV
  let candExp = 0
  const expRegex = /(\d+)\s*(?:years?|yrs?)\b/gi
  let match
  while ((match = expRegex.exec(cvText)) !== null) {
    const val = parseInt(match[1])
    if (val > candExp && val < 25) candExp = val
  }
  const yearRangeRegex = /\b(20\d{2})\s*(?:-|to)\s*(20\d{2}|present|current)\b/gi
  let yearRangeCount = 0
  while ((match = yearRangeRegex.exec(cvText)) !== null) {
    const startYear = parseInt(match[1])
    const endYear = match[2].toLowerCase().includes('pres') || match[2].toLowerCase().includes('curr') 
      ? new Date().getFullYear() 
      : parseInt(match[2])
    const diff = endYear - startYear
    if (diff > 0 && diff < 15) yearRangeCount += diff
  }
  candExp = Math.max(candExp, yearRangeCount)

  // 3. Parse Required Experience from JD
  let reqExp = 0
  const reqExpRegex = /(\d+)\s*(?:years?|yrs?)\b/gi
  let jdMatch
  while ((jdMatch = reqExpRegex.exec(jd)) !== null) {
    const val = parseInt(jdMatch[1])
    if (val > reqExp && val < 15) reqExp = val
  }

  // 4. Calculate Skills Match using the job's actual required skills
  const matchedSkills = targetSkills.filter(s => {
    const escaped = s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    return new RegExp(`\\b${escaped}\\b`, 'i').test(textLower) || textLower.includes(s.toLowerCase())
  })
  const missingSkills = targetSkills.filter(s => !matchedSkills.includes(s))
  const skillsScore = targetSkills.length > 0
    ? Math.round((matchedSkills.length / targetSkills.length) * 100)
    : 75

  // 5. Calculate Experience Match
  let expScore = 100
  if (reqExp > 0) {
    if (candExp >= reqExp) expScore = 100
    else expScore = Math.max(20, Math.round((candExp / reqExp) * 100))
  } else {
    expScore = candExp > 0 ? 90 : 70
  }

  // 6. Estimate Education Match
  let eduScore = 70
  const eduKeywords = ['b.tech', 'm.tech', 'b.e.', 'mba', 'b.sc', 'm.sc', 'degree', 'iit', 'bits', 'university', 'college', 'graduate', 'bachelor', 'master', 'ca', 'icwa', 'cs', 'b.com', 'm.com']
  const hasEdu = eduKeywords.filter(k => textLower.includes(k))
  if (hasEdu.length >= 3) eduScore = 95
  else if (hasEdu.length >= 1) eduScore = 85

  // 7. Evaluate Qualifying Questions
  let autoReject = false
  let passedQuestionsCount = 0

  const qualifyingResults = qualifyingQuestions.map(q => {
    const qText = (q.question || '').toLowerCase()
    let answer = 'Cannot determine'
    let confidence = 'low'
    let notes = 'Inferred from resume keyword check.'

    if (qText.includes('experience') || qText.includes('years') || qText.includes('yrs')) {
      const numMatch = qText.match(/(\d+)\+?\s*years?/)
      if (numMatch) {
        const qYears = parseInt(numMatch[1])
        if (candExp >= qYears) {
          answer = 'Yes'
          confidence = 'high'
          notes = `Candidate has approximately ${candExp} years of experience (meets/exceeds ${qYears} yrs).`
          passedQuestionsCount += 1
        } else if (candExp >= Math.max(1, qYears - 1)) {
          answer = 'Partial'
          confidence = 'medium'
          notes = `Candidate has approximately ${candExp} years of experience (close to ${qYears} yrs).`
          passedQuestionsCount += 0.5
        } else {
          answer = 'No'
          confidence = 'high'
          notes = `Candidate has only ${candExp} years of experience (below ${qYears} yrs required).`
          if (q.dealbreaker) autoReject = true
        }
      } else {
        if (candExp > 0) {
          answer = 'Yes'
          confidence = 'high'
          notes = `Candidate has verifiable industry experience (${candExp} yrs).`
          passedQuestionsCount += 1
        } else {
          answer = 'No'
          confidence = 'medium'
          notes = 'No clear years of professional experience identified.'
          if (q.dealbreaker) autoReject = true
        }
      }
    } else if (qText.includes('degree') || qText.includes('education') || qText.includes('certification')) {
      if (hasEdu.length > 0) {
        answer = 'Yes'
        confidence = 'high'
        notes = `Candidate lists educational background (${hasEdu.slice(0, 2).join(', ')}).`
        passedQuestionsCount += 1
      } else {
        answer = 'Cannot determine'
        confidence = 'low'
        notes = 'Specific degree or certification not clearly identified in CV.'
        passedQuestionsCount += 0.5
      }
    } else {
      const mentionedSkills = targetSkills.filter(s => qText.includes(s.toLowerCase()))
      if (mentionedSkills.length > 0) {
        const found = mentionedSkills.filter(s => textLower.includes(s.toLowerCase()))
        if (found.length === mentionedSkills.length) {
          answer = 'Yes'
          confidence = 'high'
          notes = `Candidate resume mentions: ${found.join(', ')}.`
          passedQuestionsCount += 1
        } else if (found.length > 0) {
          answer = 'Partial'
          confidence = 'medium'
          notes = `Mentions ${found.join(', ')}, but missing: ${mentionedSkills.filter(s => !found.includes(s)).join(', ')}.`
          passedQuestionsCount += 0.5
        } else {
          answer = 'No'
          confidence = 'high'
          notes = `Resume does not mention required skills: ${mentionedSkills.join(', ')}.`
          if (q.dealbreaker) autoReject = true
        }
      } else {
        if (skillsScore >= 65) {
          answer = 'Yes'
          confidence = 'medium'
          notes = 'Candidate background aligns with this requirement.'
          passedQuestionsCount += 1
        } else if (skillsScore >= 35) {
          answer = 'Partial'
          confidence = 'low'
          notes = 'Partial skill alignment found in resume.'
          passedQuestionsCount += 0.5
        } else {
          answer = 'No'
          confidence = 'medium'
          notes = 'Insufficient evidence in resume for this requirement.'
          if (q.dealbreaker) autoReject = true
        }
      }
    }

    return {
      question: q.question,
      dealbreaker: !!q.dealbreaker,
      inferredAnswer: answer,
      confidence,
      notes
    }
  })

  // 8. Deterministic Fallback Score Calculation
  if (!API_KEY) {
    const questionsScore = qualifyingQuestions.length > 0
      ? Math.round((passedQuestionsCount / qualifyingQuestions.length) * 100)
      : skillsScore

    let score = qualifyingQuestions.length > 0
      ? Math.round((skillsScore * 0.35) + (questionsScore * 0.35) + (expScore * 0.20) + (eduScore * 0.10))
      : Math.round((skillsScore * 0.45) + (expScore * 0.35) + (eduScore * 0.20))

    if (autoReject) {
      score = Math.min(score, 35)
    }

    let recommendation = 'maybe'
    if (score >= 75) recommendation = 'shortlist'
    else if (score < 45 || autoReject) recommendation = 'reject'

    const strengths = []
    if (matchedSkills.length > 0) {
      strengths.push(`Proficient in role-specific skills: ${matchedSkills.slice(0, 4).join(', ')}.`)
    }
    if (candExp > 0) {
      strengths.push(`Possesses around ${candExp} years of relevant professional experience.`)
    }
    if (strengths.length === 0) {
      strengths.push('Candidate shows relevant foundational background.')
    }

    const gaps = []
    if (missingSkills.length > 0) {
      gaps.push(`Does not explicitly list required skills: ${missingSkills.slice(0, 3).join(', ')}.`)
    }
    if (reqExp > 0 && candExp < reqExp) {
      gaps.push(`Experience (${candExp} years) is below the preferred ${reqExp} years.`)
    }
    if (autoReject) {
      gaps.push('Failed a critical dealbreaker screening question.')
    }

    const summary = `Candidate ${candidateName || 'Applicant'} shows a ${score}% match based on ${targetSkills.length} job-specific skills and ${qualifyingQuestions.length} screening questions. Core matches include ${matchedSkills.slice(0, 3).join(', ') || 'general experience'}.`

    return {
      score,
      recommendation,
      strengths,
      gaps,
      summary,
      experienceMatch: expScore,
      skillsMatch: skillsScore,
      educationMatch: eduScore,
      qualifyingResults
    }
  }

  // 9. Claude LLM Mode
  const system = localStorage.getItem('company_screening_prompt') || `You are an expert recruiter and talent acquisition professional.
Screen resumes against the specific Job Description, Required Skills, and Qualifying Questions objectively and rigorously.
Always respond with valid JSON only — no markdown fences, no explanation, no extra text.`

  const hasQQ = qualifyingQuestions.length > 0
  const qqBlock = hasQQ ? `

QUALIFYING QUESTIONS (infer answers from the resume — be fair but honest):
${qualifyingQuestions.map((q, i) => `Q${i + 1}${q.dealbreaker ? ' [DEALBREAKER]' : ''}: ${q.question}`).join('\n')}

For each qualifying question return an object in "qualifyingResults":
{ "question": "<text>", "dealbreaker": <true|false>, "inferredAnswer": "<Yes|No|Partial|Cannot determine>", "confidence": "<high|medium|low>", "notes": "<1 sentence evidence from resume>" }

IMPORTANT: If any DEALBREAKER question is answered "No" with high confidence, set recommendation to "reject" and cap score <= 35.` : ''

  const prompt = `Screen this candidate specifically against this job's criteria and qualifying questions. Return ONLY a JSON object:
{
  "score": <integer 0-100>,
  "recommendation": <"shortlist" | "maybe" | "reject">,
  "strengths": [<3-4 specific bullet points as strings>],
  "gaps": [<2-3 specific gaps as strings, or empty array>],
  "summary": "<2-sentence executive summary>",
  "experienceMatch": <integer 0-100>,
  "skillsMatch": <integer 0-100>,
  "educationMatch": <integer 0-100>${hasQQ ? ',\n  "qualifyingResults": [<array of qualifying question result objects>]' : ''}
}

Scoring guide: 75+ = shortlist, 45-74 = maybe, below 45 = reject. Weight required skills and qualifying questions heavily.

Candidate: ${candidateName}
Target Required Skills: ${targetSkills.join(', ')}

JOB DESCRIPTION:
${jd}${qqBlock}

RESUME:
${cvText}

Return only the JSON object, nothing else.`

  const raw = await callClaude(system, prompt, hasQQ ? 1200 : 800)

  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    const parsedQQ = hasQQ && Array.isArray(parsed.qualifyingResults)
      ? parsed.qualifyingResults.map(r => ({
          question:       r.question      || '',
          dealbreaker:    !!r.dealbreaker,
          inferredAnswer: r.inferredAnswer || 'Cannot determine',
          confidence:     ['high','medium','low'].includes(r.confidence) ? r.confidence : 'low',
          notes:          r.notes         || '',
        }))
      : qualifyingResults

    return {
      score:              Math.min(100, Math.max(0, parseInt(parsed.score) || 50)),
      recommendation:     ['shortlist','maybe','reject'].includes(parsed.recommendation) ? parsed.recommendation : 'maybe',
      strengths:          Array.isArray(parsed.strengths) ? parsed.strengths : [],
      gaps:               Array.isArray(parsed.gaps) ? parsed.gaps : [],
      summary:            parsed.summary || '',
      experienceMatch:    Math.min(100, Math.max(0, parseInt(parsed.experienceMatch) || 50)),
      skillsMatch:        Math.min(100, Math.max(0, parseInt(parsed.skillsMatch) || 50)),
      educationMatch:     Math.min(100, Math.max(0, parseInt(parsed.educationMatch) || 50)),
      qualifyingResults:  parsedQQ,
    }
  } catch {
    return {
      score: 50, recommendation: 'maybe',
      strengths: ['Resume received — manual review recommended'],
      gaps: ['Could not parse AI response'],
      summary: 'AI screening encountered an issue. Please review manually.',
      experienceMatch: 50, skillsMatch: 50, educationMatch: 50,
      qualifyingResults: [],
    }
  }
}
