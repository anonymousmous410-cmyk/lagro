// Load environment variables from .env when available (optional)
try { require('dotenv').config(); } catch (e) {}
const express = require("express");
const path = require("path");
const app = express();
const fs = require('fs');
const dataDir = path.join(__dirname, 'data');
const subjectsFile = path.join(dataDir, 'subjects.json');

function ensureDataDir() {
  try { if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir); } catch (e) { console.warn('ensureDataDir failed', e); }
}

function readSubjects() {
  try {
    ensureDataDir();
    if (!fs.existsSync(subjectsFile)) return {};
    const txt = fs.readFileSync(subjectsFile, 'utf8');
    return JSON.parse(txt || '{}');
  } catch (e) { console.warn('readSubjects failed', e); return {}; }
}

function writeSubjects(obj) {
  try { ensureDataDir(); fs.writeFileSync(subjectsFile, JSON.stringify(obj, null, 2), 'utf8'); return true; } catch (e) { console.warn('writeSubjects failed', e); return false; }
}

// Allow large JSON bodies for base64 file uploads
app.use(express.json({ limit: '20mb' }));

// Initialize Google GenAI client when env var is present.
// Note: install the SDK package (e.g. npm install @google/generative-ai) before using.
let GoogleGenAI;
let aiClient;
// Optional Firebase Admin for verifying ID tokens
let firebaseAdmin = null;
let firebaseAdminReady = false;
try {
  const admin = require('firebase-admin');
  firebaseAdmin = admin;
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) });
      firebaseAdminReady = true;
    } else {
      // Try application default credentials (GOOGLE_APPLICATION_CREDENTIALS)
      admin.initializeApp();
      firebaseAdminReady = true;
    }
  } catch (e) {
    console.warn('firebase-admin init skipped (no service creds):', e && e.message ? e.message : e);
    firebaseAdminReady = false;
  }
} catch (e) {
  // firebase-admin not installed
  firebaseAdmin = null;
}
try {
  const genai = require('@google/generative-ai');
  // support multiple export shapes (GoogleGenAI, TextServiceClient, or default)
  GoogleGenAI = genai.GoogleGenAI || genai.TextServiceClient || genai;
  if (process.env.GEMINI_API_KEY) {
    try {
      aiClient = new (GoogleGenAI)({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
      // fallback: some clients expect different construction
      try { aiClient = new GoogleGenAI(process.env.GEMINI_API_KEY); } catch (ee) { aiClient = null; }
    }
  }
} catch (err) {
  // SDK not installed or failed to load; endpoints will respond with guidance.
  console.warn('Google GenAI SDK not available:', err && err.message ? err.message : err);
}

// Debug: report whether GEMINI_API_KEY is present and whether aiClient was constructed
console.log('GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
console.log('GoogleGenAI export present:', !!GoogleGenAI);
console.log('aiClient constructed:', !!aiClient);

// API: summarize uploaded file (expects JSON { fileData: Base64String, mimeType: string })
app.post('/api/summarize-file', async (req, res) => {
  const { fileData, mimeType } = req.body || {};
  if (!fileData || !mimeType) {
    return res.status(400).json({ error: 'Missing fileData or mimeType in request body' });
  }
  if (!aiClient) {
    // Fallback: if GEMINI_API_KEY is present, call the REST endpoint directly using fetch
    if (process.env.GEMINI_API_KEY) {
      try {
        const urlBase = 'https://generativelanguage.googleapis.com/v2/models/gemini-2.0-flash:generateContent';
        const body = {
          model: 'gemini-2.0-flash',
          contents: [       {
              role: 'user',
              parts: [
                { text: 'Please summarize this file/image concisely.' },
                { inlineData: { data: fileData, mimeType: mimeType } }
              ]
            }
          ]
        };

        // Attempt 1: header-based API key
        try {
          const resp = await fetch(urlBase, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': process.env.GEMINI_API_KEY
            },
            body: JSON.stringify(body)
          });
          const text = await resp.text();
          console.log('REST fallback header attempt status:', resp.status);
          console.log('REST fallback header attempt body (truncated):', text && text.toString().slice(0,1200));
          if (resp.ok) {
            let json; try { json = JSON.parse(text); } catch(e){ json = text; }
            const summary = (json && (json.candidates && json.candidates[0] && json.candidates[0].output && json.candidates[0].output[0] && json.candidates[0].output[0].content && json.candidates[0].output[0].content[0] && json.candidates[0].output[0].content[0].text)) || (json && json.output && json.output[0] && json.output[0].content && json.output[0].content[0] && json.output[0].content[0].text) || JSON.stringify(json);
            return res.json({ summary });
          }
        } catch (err) {
          console.warn('REST fallback header attempt error:', err && err.message ? err.message : String(err));
        }

        // Attempt 2: query param key
        try {
          const urlWithKey = urlBase + '?key=' + encodeURIComponent(process.env.GEMINI_API_KEY);
          const resp2 = await fetch(urlWithKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          const text2 = await resp2.text();
          console.log('REST fallback query-key attempt status:', resp2.status);
          console.log('REST fallback query-key body (truncated):', text2 && text2.toString().slice(0,1200));
          if (resp2.ok) {
            let json2; try { json2 = JSON.parse(text2); } catch(e){ json2 = text2; }
            const summary = (json2 && (json2.candidates && json2.candidates[0] && json2.candidates[0].output && json2.candidates[0].output[0] && json2.candidates[0].output[0].content && json2.candidates[0].output[0].content[0] && json2.candidates[0].output[0].content[0].text)) || (json2 && json2.output && json2.output[0] && json2.output[0].content && json2.output[0].content[0] && json2.output[0].content[0].text) || JSON.stringify(json2);
            return res.json({ summary });
          }
        } catch (err) {
          console.warn('REST fallback query-key attempt error:', err && err.message ? err.message : String(err));
        }

        return res.status(502).json({ error: 'AI request failed (both header and query attempts failed)' });
      } catch (err) {
        console.error('Direct REST AI call failed:', err);
        return res.status(502).json({ error: 'AI request failed', detail: err && err.message ? err.message : String(err) });
      }
    }

    return res.status(500).json({ error: 'AI client not configured. Install @google/genai and set GEMINI_API_KEY.' });
  }

  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Please summarize this file/image concisely.' },
            {
              inlineData: {
                data: fileData,
                mimeType: mimeType
              }
            }
          ]
        }
      ]
    });

    // SDK may return text at different paths; prefer `text` then fallbacks.
    const summary = response && (response.text || (response.output && response.output[0] && response.output[0].content && response.output[0].content[0] && response.output[0].content[0].text)) || JSON.stringify(response);
    return res.json({ summary });
  } catch (err) {
    console.error('AI summarize error:', err);
    return res.status(502).json({ error: 'AI request failed', detail: err && err.message ? err.message : String(err) });
  }
});

// API: create a new subject and persist it. Body: { id, title, icon, desc, createdBy }
app.post('/api/subjects', (req, res) => {
  const body = req.body || {};
  const title = (body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Missing title' });
  const id = body.id || title.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'').slice(0,40) || ('subject-' + Date.now());
  const icon = body.icon || '📚';
  const desc = body.desc || '';
  const createdBy = body.createdBy || 'Guest';

  const subjects = readSubjects();
  if (!subjects || typeof subjects !== 'object') {
    return res.status(500).json({ error: 'Subjects storage unavailable' });
  }
  if (subjects[id]) return res.status(409).json({ error: 'Subject already exists' });

  // create an initial welcome lesson authored by the creator
  const lesson = {
    id: 'lesson-' + Date.now(),
    title: `Welcome to ${title} — by ${createdBy}`,
    desc: `Intro lesson created by ${createdBy}`,
    content: { read: `<p>This is the first lesson for ${title}, created by ${createdBy}.</p>` },
    author: createdBy,
    createdAt: new Date().toISOString()
  };

  subjects[id] = { id, title, icon, desc, color: body.color || 'bg-emerald-50 text-lagro-green border-emerald-200', lessons: [lesson], createdAt: new Date().toISOString(), createdBy };

  const ok = writeSubjects(subjects);
  if (!ok) return res.status(500).json({ error: 'Failed to save subject' });
  return res.json({ subject: subjects[id] });
});

// API: list all subjects (server-side persisted)
app.get('/api/subjects', (req, res) => {
  try {
    const subjects = readSubjects();
    return res.json({ subjects });
  } catch (e) {
    console.error('Error reading subjects', e);
    return res.status(500).json({ error: 'Failed to read subjects' });
  }
});

// API: add a lesson to a subject. Body: { lesson: { id,title,desc,content,attachments... }, createdBy, authorId }
// Auth middleware: verifies Firebase ID token when REQUIRE_AUTH=true
async function verifyAuthToken(req, res, next) {
  const enforce = String(process.env.REQUIRE_AUTH || '').toLowerCase() === 'true';
  if (!enforce) return next();
  if (!firebaseAdmin || !firebaseAdminReady) return res.status(500).json({ error: 'Server auth not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS and install firebase-admin.' });
  const authHeader = (req.headers.authorization || req.headers.Authorization || '').toString();
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  const idToken = m ? m[1] : (req.body && req.body.idToken) || null;
  if (!idToken) return res.status(401).json({ error: 'Missing ID token. Provide Authorization: Bearer <token> header.' });
  try {
    const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    req.user = decoded;
    return next();
  } catch (e) {
    console.warn('verifyIdToken failed', e && e.message ? e.message : e);
    return res.status(401).json({ error: 'Invalid ID token' });
  }
}

app.post('/api/subjects/:id/lessons', verifyAuthToken, async (req, res) => {
  const sid = req.params.id;
  const body = req.body || {};
  const incoming = body.lesson || body;
  if (!incoming || !incoming.title) return res.status(400).json({ error: 'Missing lesson or lesson.title' });
  try {
    const subjects = readSubjects();
    if (!subjects || !subjects[sid]) return res.status(404).json({ error: 'Subject not found' });
    const lesson = Object.assign({}, incoming);
    lesson.id = lesson.id || ('ls_' + Date.now());
    lesson.createdAt = new Date().toISOString();
    // assign stable week number if not provided: use max existing week + 1
    try {
      const existing = subjects[sid].lessons || [];
      const maxWeek = existing.reduce((m, it) => {
        const w = Number(it && it.week) || 0; return Math.max(m, isNaN(w) ? 0 : w);
      }, 0);
      lesson.week = (typeof incoming.week !== 'undefined' && incoming.week !== null) ? Number(incoming.week) : (maxWeek + 1 || (existing.length + 1));
    } catch (e) {
      lesson.week = (typeof incoming.week !== 'undefined' && incoming.week !== null) ? Number(incoming.week) : 1;
    }
    // prefer authenticated user info when available
    if (req.user && req.user.uid) {
      lesson.authorId = req.user.uid;
      lesson.createdBy = req.user.name || req.user.email || req.user.uid;
    } else {
      if (body.createdBy) lesson.createdBy = body.createdBy;
      if (body.authorId) lesson.authorId = body.authorId;
    }
    // ensure lessons array
    subjects[sid].lessons = subjects[sid].lessons || [];
    subjects[sid].lessons.push(lesson);
    const ok = writeSubjects(subjects);
    if (!ok) return res.status(500).json({ error: 'Failed to persist lesson' });
    return res.json({ lesson, subject: subjects[sid] });
  } catch (e) {
    console.error('Failed to add lesson', e);
    return res.status(500).json({ error: 'Failed to add lesson', detail: e && e.message ? e.message : String(e) });
  }
});

// API: delete a lesson by id from a subject
app.delete('/api/subjects/:id/lessons/:lessonId', verifyAuthToken, (req, res) => {
  const sid = req.params.id;
  const lid = req.params.lessonId;
  try {
    const subjects = readSubjects();
    if (!subjects || !subjects[sid]) return res.status(404).json({ error: 'Subject not found' });
    const lessons = subjects[sid].lessons || [];
    const idx = lessons.findIndex(l => String(l.id) === String(lid));
    if (idx === -1) return res.status(404).json({ error: 'Lesson not found' });
    // optional: only allow deletion by the lesson author when authenticated
    if (req.user && lessons[idx] && lessons[idx].authorId && String(req.user.uid) !== String(lessons[idx].authorId)) {
      return res.status(403).json({ error: 'Forbidden: only the lesson author may delete this lesson' });
    }
    lessons.splice(idx, 1);
    subjects[sid].lessons = lessons;
    const ok = writeSubjects(subjects);
    if (!ok) return res.status(500).json({ error: 'Failed to persist deletion' });
    return res.json({ ok: true });
  } catch (e) {
    console.error('Failed to delete lesson', e);
    return res.status(500).json({ error: 'Failed to delete lesson', detail: e && e.message ? e.message : String(e) });
  }
});

// Serve static files from the project root (index.html, assets, css, js)
app.use(express.static(path.join(__dirname)));

// Fallback to index.html for SPA routes
// Fallback for SPA routes: send index.html for any request not handled above
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// dotenv already loaded at top if present