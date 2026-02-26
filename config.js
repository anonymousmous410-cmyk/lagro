// Configuration placeholder for API keys used by the app.
// IMPORTANT: Do NOT commit real secret keys to public repositories.
// Replace the empty string values locally or provide an override at runtime.

// Supported keys:
//  - LOCATIONIQ_API_KEY: LocationIQ (geocoding / map tiles)
//  - GOOGLE_GENERATIVE_API_KEY: Google Generative AI (optional)

// By default these values are empty. To avoid committing secrets you can set
// a runtime override before loading the app, e.g. in the browser console:
//   window.__LAGRO_CONFIG_OVERRIDE__ = { LOCATIONIQ_API_KEY: 'pk.xxx', GOOGLE_GENERATIVE_API_KEY: 'ya....' };

window.LAGRO_CONFIG = {
  LOCATIONIQ_API_KEY: "",
  GOOGLE_GENERATIVE_API_KEY: "AIzaSyDdGnXKK4AIMidLiGMMo8blOj3b7TYdzqw" // Paste your key here
};

// Helper to get merged config (applies runtime override if present)
window.getLagroConfig = function() {
  try {
    const override = window.__LAGRO_CONFIG_OVERRIDE__ || {};
    return Object.assign({}, window.LAGRO_CONFIG || {}, override || {});
  } catch (e) { return window.LAGRO_CONFIG || {}; }
};s

// For production, inject keys via environment or server-side config.

// Optional: Firebase web app config (add your project's config here).
// Example: set these values to enable client-side Firebase initialization.
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

