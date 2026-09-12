/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_FUNCTIONS_REGION: string;
  readonly VITE_RAZORPAY_KEY_ID: string;
  readonly VITE_CASHFREE_APP_ID: string;
  readonly VITE_CASHFREE_SECRET_KEY: string;
  readonly VITE_PHONEPE_MERCHANT_ID: string;
  readonly VITE_PHONEPE_SALT_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
