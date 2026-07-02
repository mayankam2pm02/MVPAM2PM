const API_URL = '/anthropic/v1/messages'
const MODEL   = 'claude-haiku-4-5-20251001'
const API_KEY = import.meta.env.VITE_CLAUDE_API_KEY

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

// ─── GENERATE JD ─────────────────────────────────────────────

export async function generateJD({ title, department, location, type, salary, reportingTo, skills, experience, description }) {
  const system = `You are an expert HR professional at a fast-growing Indian tech company.
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
  const system = `You are an expert recruiter and HR professional.
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
