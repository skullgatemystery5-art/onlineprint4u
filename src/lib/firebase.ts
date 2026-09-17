import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const RECAPTCHA_ENTERPRISE_SITE_KEY = '6LfVOb4tAAAAALbKNAOCEo5yOnkDInVKnH9KB7Le';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

let app: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    // Ensure the reCAPTCHA Enterprise script is loaded with the correct site key.
    // The script tag in index.html pre-loads it, but we also inject it here as a
    // fallback (e.g. if the page loaded before the script tag was processed).
    // Firebase Auth's SDK checks for window.grecaptcha.enterprise — if present,
    // it uses Enterprise mode and fetches the site key from the Firebase Console
    // config endpoint, completely bypassing the legacy v2 recaptchaParams endpoint
    // that was returning the old/deleted site key.
    if (typeof window !== 'undefined' && !window.grecaptcha) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/enterprise.js?render=${RECAPTCHA_ENTERPRISE_SITE_KEY}`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  } catch (err) {
    console.error('[Firebase] Initialization failed:', err);
  }
}

export { firebaseAuth, app, db, storage, isFirebaseConfigured, RECAPTCHA_ENTERPRISE_SITE_KEY };
