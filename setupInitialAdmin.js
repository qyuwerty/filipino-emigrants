// setupInitialAdmin.js
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function setupInitialAdmin() {
  console.log('🚀 Starting admin setup...');
  
  const adminAccounts = [
    { email: 'admin@filipinoapp.com', password: 'admin123', name: 'System Admin', role: 'admin' },
    { email: 'user@filipinoapp.com', password: 'user123', name: 'Demo User', role: 'user' }
  ];

  for (const account of adminAccounts) {
    try {
      console.log(`Creating account: ${account.email}`);
      
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(auth, account.email, account.password);
      const user = userCredential.user;
      
      // Create Firestore document
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: account.email,
        role: account.role,
        name: account.name,
        displayName: account.name,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isFirstAdmin: account.role === 'admin',
        status: 'active',
        permissions: account.role === 'admin' 
          ? ['upload_data', 'delete_data', 'manage_users', 'view_all'] 
          : ['view_data', 'export_data'],
        emailVerified: false
      });
      
      console.log(`✅ Created ${account.role} account: ${account.email}`);
      console.log(`   UID: ${user.uid}`);
      
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`ℹ️ Account already exists: ${account.email}`);
      } else {
        console.error(`❌ Error creating ${account.email}:`, error.message);
      }
    }
  }
  
  console.log('✨ Setup completed!');
  console.log('\n📋 Test Accounts:');
  console.log('-----------------');
  console.log('👑 Admin: admin@filipinoapp.com / admin123');
  console.log('👤 User: user@filipinoapp.com / user123');
  console.log('\n⚠️ Important: Update SUPER_ADMIN_EMAIL in AuthService.js with your email!');
}

setupInitialAdmin();