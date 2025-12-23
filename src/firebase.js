import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyArIZOZbkYA5t0lE2ED941TE7skog1sU_Y",
  authDomain: "zythprjec123.firebaseapp.com",
  projectId: "zythprjec123",
  storageBucket: "zythprjec123.firebasestorage.app",
  messagingSenderId: "1001508506684",
  appId: "1:1001508506684:web:fcd4b967a719d289c4c739"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
