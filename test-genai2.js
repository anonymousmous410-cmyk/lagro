// test-genai2.js — File-aware tester for Generative Language summarization
// Usage: node test-genai2.js <path-to-file>
// Requires: node 18+ (global fetch), and packages: tesseract.js, pdf-parse, dotenv

try { require('dotenv').config(); } catch (e) { /* dotenv optional */ }
const fs = require('fs');
const path = require('path');
// optional heavy deps — require on demand and fail gracefully with instructions
let createWorker = null;
let pdfParse = null;

(async function main(){
  if (typeof fetch === 'undefined') {
    console.error('No global fetch available. Run this with Node 18+ or install node-fetch.');
    process.exit(1);
  }

  const KEY = process.env.GEMINI_API_KEY || process.env.GENERATIVE_API_KEY;
  if (!KEY) console.warn('No API key found in GEMINI_API_KEY or GENERATIVE_API_KEY — requests may fail.');

  const targetFile = process.argv[2];
  if (!targetFile) {
    console.error('Usage: node test-genai2.js <path-to-file>');
    process.exit(1);
  }

  async function extractTextFromFile(fp) {
    const ext = path.extname(fp).toLowerCase();
    if (!fs.existsSync(fp)) throw new Error('File not found: ' + fp);

    if (['.txt', '.md', '.csv'].includes(ext)) {
      return fs.readFileSync(fp, 'utf8');
    }

    if (ext === '.pdf') {
      if (!pdfParse) {
        try { pdfParse = require('pdf-parse'); } catch (e) { console.warn('pdf-parse not installed. Run: npm install pdf-parse'); return ''; }
      }
      const data = fs.readFileSync(fp);
      try { const parsed = await pdfParse(data); return parsed.text || ''; }
      catch (e) { console.warn('PDF parse failed', e); return ''; }
    }

    if (['.png','.jpg','.jpeg','.tiff','.bmp','.gif'].includes(ext)) {
      if (!createWorker) {
        try { createWorker = require('tesseract.js').createWorker; } catch (e) { console.warn('tesseract.js not installed. Run: npm install tesseract.js'); return ''; }
      }
      const worker = createWorker({ logger: () => {} });
      try {
        await worker.load();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        const { data: { text } } = await worker.recognize(fp);
        await worker.terminate();
        return text || '';
      } catch (e) { try { await worker.terminate(); } catch(_){} console.warn('OCR failed', e); return ''; }
    }

    // fallback: try to read as text
    try { return fs.readFileSync(fp, 'utf8'); } catch (e) { return ''; }
  }

  const extracted = await extractTextFromFile(targetFile);
  if (!extracted || !extracted.trim()) {
    console.error('No text extracted from file. Aborting.');
    process.exit(1);
  }

  const prompt = `You are an expert educator. Summarize the following lesson content into: (1) a concise 3-4 sentence summary, (2) 3 suggested flashcards as JSON array of {front,back}, (3) a 3-question multiple-choice quiz as JSON array of {question, options:[], answerIndex}. Return only valid JSON with keys: summary, flashcards, quiz.\\n\\nContent:\\n${extracted}`;

  const body = {
    model: 'gemini-2.0-flash',
    contents: [ { role: 'user', parts: [{ text: prompt }] } ],
    generationConfig: { responseMimeType: 'application/json' }
  };

  async function callGen(body) {
    const url = 'https://generativelanguage.googleapis.com/v2/models/gemini-2.0-flash:generateContent' + (KEY ? `?key=${encodeURIComponent(KEY)}` : '');
    try {
      console.log('Calling Generative API...');
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const txt = await resp.text();
      console.log('Status:', resp.status);
      try {
        const j = JSON.parse(txt);
        if (j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) {
          const out = j.candidates[0].content.parts.map(p=>p.text).join('\n');
          try { const parsed = JSON.parse(out); console.log('Parsed JSON output:', JSON.stringify(parsed, null, 2)); }
          catch(e) { console.log('Candidate text output:\n', out); }
        } else {
          console.log('Full response JSON:\n', JSON.stringify(j, null, 2));
        }
      } catch(e) { console.log('Raw response:\n', txt); }
    } catch (err) { console.error('API call failed', err); }
  }

  await callGen(body);
  console.log('\nDone.');
})();
