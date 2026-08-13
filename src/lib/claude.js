const API_URL = '/anthropic/v1/messages'
const MODEL   = 'claude-haiku-4-5-20251001'
const rawKey = import.meta.env.VITE_CLAUDE_API_KEY
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

// ─── SCREEN RESUME ────────────────────────────────────────────

export async function screenResume({ cvText, jd, candidateName, qualifyingQuestions = [] }) {
  if (!API_KEY) {
    const textLower = (cvText || '').toLowerCase()
    const jdLower = (jd || '').toLowerCase()

    // 1. Estimate Candidate Experience from CV
    let candExp = 0
    const expRegex = /(\d+)\s*(?:years?|yrs?)\b/gi
    let match
    while ((match = expRegex.exec(cvText)) !== null) {
      const val = parseInt(match[1])
      if (val > candExp && val < 25) {
        candExp = val
      }
    }
    const yearRangeRegex = /\b(20\d{2})\s*(?:-|to)\s*(20\d{2}|present|current)\b/gi
    let yearRangeCount = 0
    while ((match = yearRangeRegex.exec(cvText)) !== null) {
      const startYear = parseInt(match[1])
      const endYear = match[2].toLowerCase().includes('pres') || match[2].toLowerCase().includes('curr') 
        ? new Date().getFullYear() 
        : parseInt(match[2])
      const diff = endYear - startYear
      if (diff > 0 && diff < 15) {
        yearRangeCount += diff
      }
    }
    candExp = Math.max(candExp, yearRangeCount)

    // 2. Parse Required Experience from JD
    let reqExp = 0
    const reqExpRegex = /(\d+)\s*(?:years?|yrs?)\b/gi
    let jdMatch
    while ((jdMatch = reqExpRegex.exec(jd)) !== null) {
      const val = parseInt(jdMatch[1])
      if (val > reqExp && val < 15) {
        reqExp = val
      }
    }

    // 3. Extract and Match Skills
    const COMMON_SKILLS = [
      'react', 'node.js', 'node', 'javascript', 'typescript', 'html', 'css', 'sql', 'postgresql', 'mongodb', 
      'aws', 'gcp', 'docker', 'kubernetes', 'git', 'python', 'java', 'salesforce', 'crm', 'b2b sales', 
      'negotiation', 'lead generation', 'cold calling', 'marketing', 'seo', 'ppc', 'copywriting', 
      'product management', 'jira', 'agile', 'scrum', 'excel', 'communication', 'customer success', 
      'operations', 'recruiting', 'onboarding', 'hr', 'finance', 'accounting'
    ]
    
    const jdSkills = COMMON_SKILLS.filter(s => {
      const regex = new RegExp(`\\b${s.replace('.', '\\.')}\\b`, 'i')
      return regex.test(jdLower)
    })

    const matchedSkills = jdSkills.filter(s => {
      const regex = new RegExp(`\\b${s.replace('.', '\\.')}\\b`, 'i')
      return regex.test(textLower)
    })

    const missingSkills = jdSkills.filter(s => !matchedSkills.includes(s))

    // Calculate skills match score
    let skillsScore = 80
    if (jdSkills.length > 0) {
      skillsScore = Math.round((matchedSkills.length / jdSkills.length) * 100)
    }

    // Calculate experience match score
    let expScore = 100
    if (reqExp > 0) {
      if (candExp >= reqExp) {
        expScore = 100
      } else {
        expScore = Math.max(20, Math.round((candExp / reqExp) * 100))
      }
    } else {
      expScore = candExp > 0 ? 90 : 70
    }

    // Estimate Education match score
    let eduScore = 70
    const eduKeywords = ['b.tech', 'm.tech', 'b.e.', 'mba', 'b.sc', 'm.sc', 'degree', 'iit', 'bits', 'university', 'college', 'graduate', 'bachelor', 'master']
    const hasEdu = eduKeywords.filter(k => textLower.includes(k))
    if (hasEdu.length >= 3) {
      eduScore = 95
    } else if (hasEdu.length >= 1) {
      eduScore = 85
    }

    // 4. Evaluate Qualifying Questions
    let autoReject = false
    const qualifyingResults = qualifyingQuestions.map(q => {
      const qText = q.question.toLowerCase()
      let answer = 'Cannot determine'
      let confidence = 'low'
      let notes = 'Inferred from resume keyword check.'

      if (qText.includes('experience') || qText.includes('years') || qText.includes('yrs')) {
        const numMatch = qText.match(/(\d+)\+?\s*years?/)
        if (numMatch) {
          const reqYears = parseInt(numMatch[1])
          if (candExp >= reqYears) {
            answer = 'Yes'
            confidence = 'high'
            notes = `Candidate has approximately ${candExp} years of experience.`
          } else {
            answer = 'No'
            confidence = 'high'
            notes = `Candidate has only ${candExp} years of experience.`
            if (q.dealbreaker) autoReject = true
          }
        }
      } else {
        const matchingSkill = COMMON_SKILLS.find(s => qText.includes(s) && textLower.includes(s))
        if (matchingSkill) {
          answer = 'Yes'
          confidence = 'high'
          notes = `Candidate resume mentions '${matchingSkill}'.`
        } else {
          const missingSkill = COMMON_SKILLS.find(s => qText.includes(s))
          if (missingSkill) {
            answer = 'No'
            confidence = 'high'
            notes = `Candidate resume does not mention '${missingSkill}'.`
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

    // Calculate final overall score
    let score = Math.round((skillsScore * 0.4) + (expScore * 0.4) + (eduScore * 0.2))
    
    if (autoReject) {
      score = Math.min(score, 35) // Forced below 45 to trigger reject recommendation
    }

    let recommendation = 'maybe'
    if (score >= 75) recommendation = 'shortlist'
    else if (score < 45) recommendation = 'reject'

    const strengths = []
    if (matchedSkills.length > 0) {
      strengths.push(`Proficient in core skills: ${matchedSkills.slice(0, 3).join(', ')}.`)
    }
    if (candExp > 0) {
      strengths.push(`Possesses around ${candExp} years of relevant professional experience.`)
    }
    if (strengths.length === 0) {
      strengths.push("Candidate shows relevant coursework or general alignment.")
    }

    const gaps = []
    if (missingSkills.length > 0) {
      gaps.push(`Does not explicitly list skills: ${missingSkills.slice(0, 3).join(', ')}.`)
    }
    if (reqExp > 0 && candExp < reqExp) {
      gaps.push(`Experience (${candExp} years) is below the preferred ${reqExp} years.`)
    }

    const summary = `Candidate ${candidateName || 'Applicant'} shows a ${score}% match with the job description. Core strengths include ${matchedSkills.slice(0, 2).join(' and ') || 'general experience'}.`

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

  const system = localStorage.getItem('company_screening_prompt') || `You are an expert recruiter and HR professional.
Screen resumes against job descriptions objectively and fairly.
Always respond with valid JSON only — no markdown fences, no explanation, no extra text.`

  const hasQQ = qualifyingQuestions.length > 0
  const qqBlock = hasQQ ? `

QUALIFYING QUESTIONS (infer answers from the resume — be fair but honest):
${qualifyingQuestions.map((q, i) => `Q${i + 1}${q.dealbreaker ? ' [DEALBREAKER]' : ''}: ${q.question}`).join('\n')}

For each qualifying question return an object in "qualifyingResults":
{ "question": "<text>", "dealbreaker": <true|false>, "inferredAnswer": "<Yes|No|Partial|Cannot determine>", "confidence": "<high|medium|low>", "notes": "<1 sentence explanation>" }

IMPORTANT: If any DEALBREAKER question is answered "No" with high confidence, set recommendation to "reject" and heavily penalize the score.` : ''

  const prompt = `Screen this candidate against the job description. Return ONLY a JSON object:
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

Scoring guide: 75+ = shortlist, 45-74 = maybe, below 45 = reject

Candidate: ${candidateName}

JOB DESCRIPTION:
${jd}${qqBlock}

RESUME:
${cvText}

Return only the JSON object, nothing else.`

  const raw = await callClaude(system, prompt, hasQQ ? 1200 : 800)

  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    const qualifyingResults = hasQQ && Array.isArray(parsed.qualifyingResults)
      ? parsed.qualifyingResults.map(r => ({
          question:       r.question      || '',
          dealbreaker:    !!r.dealbreaker,
          inferredAnswer: r.inferredAnswer || 'Cannot determine',
          confidence:     ['high','medium','low'].includes(r.confidence) ? r.confidence : 'low',
          notes:          r.notes         || '',
        }))
      : []

    return {
      score:              Math.min(100, Math.max(0, parseInt(parsed.score) || 50)),
      recommendation:     ['shortlist','maybe','reject'].includes(parsed.recommendation) ? parsed.recommendation : 'maybe',
      strengths:          Array.isArray(parsed.strengths) ? parsed.strengths : [],
      gaps:               Array.isArray(parsed.gaps) ? parsed.gaps : [],
      summary:            parsed.summary || '',
      experienceMatch:    Math.min(100, Math.max(0, parseInt(parsed.experienceMatch) || 50)),
      skillsMatch:        Math.min(100, Math.max(0, parseInt(parsed.skillsMatch) || 50)),
      educationMatch:     Math.min(100, Math.max(0, parseInt(parsed.educationMatch) || 50)),
      qualifyingResults,
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
