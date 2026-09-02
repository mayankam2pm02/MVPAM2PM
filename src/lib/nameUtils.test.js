import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanCandidateName, extractNameFromCVText, getCleanCandidateName } from './nameUtils.js'

test('cleanCandidateName converts CVABHISHEKSINGH S.E to Abhishek Singh', () => {
  assert.equal(cleanCandidateName('CVABHISHEKSINGH S.E'), 'Abhishek Singh')
})

test('cleanCandidateName handles filenames with CV prefix and extension', () => {
  assert.equal(cleanCandidateName('CV_Abhishek_Singh.pdf'), 'Abhishek Singh')
  assert.equal(cleanCandidateName('CV - Rahul Sharma - SE.docx'), 'Rahul Sharma')
  assert.equal(cleanCandidateName('Resume_Mayank_Jain_BDE.pdf'), 'Mayank Jain')
})

test('cleanCandidateName handles CamelCase and stuck-together tokens', () => {
  assert.equal(cleanCandidateName('AbhishekSingh'), 'Abhishek Singh')
  assert.equal(cleanCandidateName('CVAbhishekSingh'), 'Abhishek Singh')
})

test('cleanCandidateName handles uppercase words', () => {
  assert.equal(cleanCandidateName('ABHISHEK SINGH'), 'Abhishek Singh')
})

test('extractNameFromCVText extracts name from resume text heading', () => {
  const cvText = `
    Abhishek Singh
    Sales Executive
    Email: abhisheksingh@gmail.com
    Phone: 9899020043
    Summary: 4 years experience in sales...
  `
  assert.equal(extractNameFromCVText(cvText), 'Abhishek Singh')
})

test('extractNameFromCVText extracts name from labeled field', () => {
  const cvText = `
    CURRICULUM VITAE
    Name: Abhishek Singh
    Contact: 9899020043
  `
  assert.equal(extractNameFromCVText(cvText), 'Abhishek Singh')
})

test('getCleanCandidateName prefers cv_text name over messy filename', () => {
  const candidate = {
    name: 'CVABHISHEKSINGH S.E',
    cv_text: 'Abhishek Singh\nSales Executive\nEmail: abhishek@gmail.com'
  }
  assert.equal(getCleanCandidateName(candidate), 'Abhishek Singh')
})

test('getCleanCandidateName cleans candidate with only messy name and no cv_text', () => {
  const candidate = {
    name: 'CVABHISHEKSINGH S.E'
  }
  assert.equal(getCleanCandidateName(candidate), 'Abhishek Singh')
})
