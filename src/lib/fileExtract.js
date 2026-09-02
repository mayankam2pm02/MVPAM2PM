async function loadTesseract() {
  if (window.Tesseract) return
  await new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export async function extractTextFromPDF(file) {
  if (!window.pdfjsLib) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  }
  const buf = await file.arrayBuffer()
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map(item => item.str).join(' ') + '\n'
  }

  // Fallback to OCR if the extracted text is empty or very short (scanned PDF)
  if (text.trim().length < 100) {
    console.log('PDF text is empty or scanned. Running Tesseract OCR on pages...')
    await loadTesseract()
    let ocrText = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const viewport = page.getViewport({ scale: 2.0 }) // scale up for OCR accuracy
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvasContext: ctx, viewport }).promise
      
      const { data: { text: pageOcr } } = await window.Tesseract.recognize(canvas, 'eng')
      ocrText += pageOcr + '\n'
    }
    return ocrText
  }

  return text
}

export async function extractText(file) {
  const nameLower = file.name.toLowerCase()
  if (file.type === 'application/pdf' || nameLower.endsWith('.pdf')) {
    return extractTextFromPDF(file)
  }
  
  if (file.type.startsWith('image/') || nameLower.endsWith('.png') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg')) {
    await loadTesseract()
    console.log('Running Tesseract OCR on image upload...')
    const { data: { text } } = await window.Tesseract.recognize(file, 'eng')
    return text
  }

  // For all other types (txt, doc, rtf, docx, etc.) attempt plain-text read
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result || '')
    reader.onerror = reject
    reader.readAsText(file)
  })
}

import { cleanCandidateName } from './nameUtils.js'

export function nameFromFile(filename) {
  return cleanCandidateName(filename)
}
