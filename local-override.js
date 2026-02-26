// local-override.js — development-only runtime overrides
// WARNING: Do NOT commit real secrets to version control. This file is
// intended for local development only. Replace the placeholder values
// below with your Firebase project values and any API keys you need.

// Example Firebase web config override (paste your project's values):
window.__LAGRO_FIREBASE_CONFIG__ = window.__LAGRO_FIREBASE_CONFIG__ || {
  apiKey: "AIzaSyDADWVlZf4E3DpB-dgf6ThT_nNZQIpQV3Y",
  authDomain: "reviewer-1b479.firebaseapp.com",
  projectId: "reviewer-1b479",
  storageBucket: "reviewer-1b479.firebasestorage.app",
  messagingSenderId: "858834913707",
  appId: "1:858834913707:web:a314862b2bdc7afaff2aee",
  measurementId: "G-K2KWPJV1SQ"
};

// Helper to get Firebase config (allows runtime override if needed)
window.getLagroFirebaseConfig = function() {
  try { return Object.assign({}, window.__LAGRO_FIREBASE_CONFIG__ || {}, window.__LAGRO_FIREBASE_CONFIG_OVERRIDE__ || {}); }
  catch (e) { return window.__LAGRO_FIREBASE_CONFIG__ || {}; }
};

console.log('firebase override:', window.__LAGRO_FIREBASE_CONFIG_OVERRIDE__);
console.log('getLagroFirebaseConfig():', window.getLagroFirebaseConfig && window.getLagroFirebaseConfig());

console.log('firebaseSignIn:', typeof window.firebaseSignIn);
console.log('firebaseSignInWithGoogle:', typeof window.firebaseSignInWithGoogle);
console.log('uploadLessonToCloud:', typeof window.uploadLessonToCloud);
console.log(typeof window.firebaseSignIn, typeof window.firebaseSignInWithGoogle, typeof window.uploadLessonToCloud);

uploadLessonToCloud({id:'t1',title:'test',extractedText:'hello'}, 'career')
  .then(()=>console.log('upload OK'))
  .catch(err=>console.error('upload ERR', err));

uploadLessonToCloud({id:'diag-'+Date.now(), title:'diag', extractedText:'hello world'}, 'career')
  .then(()=>console.log('upload OK'))
  .catch(err=>console.error('upload ERR', err));