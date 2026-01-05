import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD_1lTL3VtByqMTnhd0lL-wBbToWtqsowQ",
  authDomain: "emigrants-project.firebaseapp.com",
  projectId: "emigrants-project",
  storageBucket: "emigrants-project.firebasestorage.app",
  messagingSenderId: "297133098116",
  appId: "1:297133098116:web:6f44010de557228b1daed1",
  measurementId: "G-5D6H8RP2WD"
};
// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
