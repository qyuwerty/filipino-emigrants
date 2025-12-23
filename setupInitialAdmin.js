// setupInitialAdmin.js
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyArIZOZbkYA5t0lE2ED941TE7skog1sU_Y",
  authDomain: "zythprjec123.firebaseapp.com",
  projectId: "zythprjec123",
  storageBucket: "zythprjec123.firebasestorage.app",
  messagingSenderId: "1001508506684",
  appId: "1:1001508506684:web:fcd4b967a719d289c4c739"
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