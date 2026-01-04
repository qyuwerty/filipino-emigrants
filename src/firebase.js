import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBMfKnlIKyMD9I5kb9QS6wtsz_Nh4bSJFo",
  authDomain: "filipinoemigrantsdb-c8aa5.firebaseapp.com",
  projectId: "filipinoemigrantsdb-c8aa5",
  storageBucket: "filipinoemigrantsdb-c8aa5.firebasestorage.app",
  messagingSenderId: "230361129580",
  appId: "1:230361129580:web:e6e7bcfd10938a48acae49"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
