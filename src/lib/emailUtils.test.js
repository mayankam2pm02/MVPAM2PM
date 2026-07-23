import test from 'node:test'
import assert from 'node:assert/strict'
import { extractCandidateEmail, buildEmailDraft } from './emailUtils.js'

test('extractCandidateEmail prefers a real address over placeholder text', () => {
  const text = `Name: John Doe\nEmail: john.doe@example.com\nPhone: 9876543210`
  assert.equal(extractCandidateEmail(text, 'cv.import.1@noemail.local'), 'john.doe@example.com')
})

test('extractCandidateEmail handles spaced email patterns from OCR-style text', () => {
  const text = `Contact \n john . doe @ example . com \n Skills: React`
  assert.equal(extractCandidateEmail(text, null), 'john.doe@example.com')
})

test('buildEmailDraft creates a hiring-specific subject and body', () => {
  const draft = buildEmailDraft({ type: 'hiring', recipientEmail: 'john.doe@example.com', name: 'John Doe', jobTitle: 'Frontend Engineer' })
  assert.match(draft.subject, /Frontend Engineer/i)
  assert.match(draft.body, /consent/i)
  assert.match(draft.body, /job/i)
})
