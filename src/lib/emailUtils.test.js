import test from 'node:test'
import assert from 'node:assert/strict'
import { extractCandidateEmail, buildEmailDraft, getCleanCandidateEmail, isLikelyEmail } from './emailUtils.js'

test('extractCandidateEmail prefers a real address over placeholder text', () => {
  const text = `Name: John Doe\nEmail: john.doe@example.org\nPhone: 9876543210`
  assert.equal(extractCandidateEmail(text, 'cv.import.1@noemail.local'), 'john.doe@example.org')
})

test('extractCandidateEmail handles spaced email patterns from OCR-style text', () => {
  const text = `Contact \n john . doe @ domain . com \n Skills: React`
  assert.equal(extractCandidateEmail(text, null), 'john.doe@domain.com')
})

test('extractCandidateEmail handles mailto links in extracted PDF text', () => {
  const text = `Abhishek Singh\nSales Executive\nEmail: mailto:abhisheksingh.se@gmail.com\nPhone: 9899020043`
  assert.equal(extractCandidateEmail(text, null), 'abhisheksingh.se@gmail.com')
})

test('getCleanCandidateEmail recovers email from cv_text if stored email is placeholder', () => {
  const cand = {
    email: 'cv.import.1781252604946.1@noemail.local',
    cv_text: 'Resume of Abhishek Singh\nContact: abhishek.s@gmail.com\nPhone: 9899020043'
  }
  assert.equal(getCleanCandidateEmail(cand), 'abhishek.s@gmail.com')
})

test('getCleanCandidateEmail returns empty string if placeholder and no email found in cv_text', () => {
  const cand = {
    email: 'cv.import.1781252604946.1@noemail.local',
    cv_text: 'Resume without email'
  }
  assert.equal(getCleanCandidateEmail(cand), '')
})

test('getCleanCandidateEmail keeps existing real email', () => {
  const cand = {
    email: 'real.user@company.com',
    cv_text: 'Other text'
  }
  assert.equal(getCleanCandidateEmail(cand), 'real.user@company.com')
})

test('buildEmailDraft creates a hiring-specific subject and body', () => {
  const draft = buildEmailDraft({ type: 'hiring', recipientEmail: 'john.doe@company.com', name: 'John Doe', jobTitle: 'Frontend Engineer' })
  assert.match(draft.subject, /Frontend Engineer/i)
  assert.match(draft.body, /consent/i)
  assert.match(draft.body, /job/i)
})

import { sanitizeManualEmail, makePlaceholderEmail } from './emailUtils.js'

test('extractCandidateEmail strips a phone number glued in front of the address', () => {
  assert.equal(extractCandidateEmail('Phone: 9876543210john.doe@gmail.com'), 'john.doe@gmail.com')
})

test('extractCandidateEmail strips a word glued after the TLD (PDF text)', () => {
  assert.equal(extractCandidateEmail('john.doe@gmail.comLinkedIn: linkedin.com/in/x'), 'john.doe@gmail.com')
  assert.equal(extractCandidateEmail('jane@yahoo.comSkills'), 'jane@yahoo.com')
})

test('extractCandidateEmail keeps legitimate long TLDs', () => {
  assert.equal(extractCandidateEmail('Email: hr@acme.company'), 'hr@acme.company')
})

test('sanitizeManualEmail accepts typed emails and rejects garbage', () => {
  assert.equal(sanitizeManualEmail('  John.Doe@Gmail.com '), 'john.doe@gmail.com')
  assert.equal(sanitizeManualEmail('mailto:a@b.co.in'), 'a@b.co.in')
  assert.equal(sanitizeManualEmail('not-an-email'), '')
  assert.equal(sanitizeManualEmail('a@b'), '')
})

test('makePlaceholderEmail is unique and never treated as a real email', async () => {
  const a = makePlaceholderEmail(0), b = makePlaceholderEmail(0)
  assert.notEqual(a, b)
  assert.equal(extractCandidateEmail('', a), '')
})
