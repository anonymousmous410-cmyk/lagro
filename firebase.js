// Firebase initializer (reads config from window.LAGRO_CONFIG.FIREBASE_CONFIG)
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

let app = null
let auth = null
let db = null

export function initFirebase(config) {
  try {
    const cfg = config || (window && window.LAGRO_CONFIG && window.LAGRO_CONFIG.FIREBASE_CONFIG) || null
    if (!cfg) return null
    app = initializeApp(cfg)
    auth = getAuth(app)
    db = getFirestore(app)
    return { app, auth, db }
  } catch (e) {
    console.error('initFirebase error', e)
    return null
  }
}

export function getAppInstance() { return { app, auth, db } }
