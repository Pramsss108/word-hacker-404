import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase with Error Handling
let app: any;
let auth: any;
let db: any;
let googleProvider = new GoogleAuthProvider();

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    
    // CRITICAL: Set persistence to LOCAL (keep user logged in across page reloads)
    setPersistence(auth, browserLocalPersistence)
        .then(() => console.log("✅ Firebase persistence enabled"))
        .catch(e => console.error("❌ Persistence failed:", e));
    
    db = getFirestore(app);
    // Analytics (Safe init)
    isSupported().then(yes => yes ? getAnalytics(app) : null).catch(e => console.warn('Analytics failed', e));
} catch (error) {
    console.error("❌ FIREBASE INIT FAILED:", error);
    console.error("Check your .env file! It might be missing keys or formatted wrong.");
}

// Export services
export { auth, db, googleProvider };
