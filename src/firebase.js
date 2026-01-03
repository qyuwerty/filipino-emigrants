import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyArIZOZbkYA5t0lE2ED941TE7skog1sU_Y",
  authDomain: "zythprjec123.firebaseapp.com",
  projectId: "zythprjec123",
  storageBucket: "zythprjec123.firebasestorage.app",
  messagingSenderId: "1001508506684",
  appId: "1:1001508506684:web:fcd4b967a719d289c4c739"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
