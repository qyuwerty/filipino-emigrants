// src/services/AuthService.js
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc,
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { auth, db } from '../firebase';

// ========== ADMIN CONFIGURATION ==========
// SET YOUR PERSONAL EMAIL HERE (will get admin role)
const SUPER_ADMIN_EMAIL = 'shuntlyzyth.castillo@g.msuiit.edu.ph'; // personal school account

// Domains that are allowed to register as admin (if no admin exists yet)
const ALLOWED_ADMIN_DOMAINS = [
  'g.msuiit.edu.ph', // Added your school domain
  'gmail.com',
  'outlook.com', 
  'yahoo.com',
  'hotmail.com'
];



export const AuthService = {
  // ========== LOGIN FUNCTION ==========
  async login(email, password) {
    try {
      console.log('🔐 Login attempt for:', email);
      
      // 1. Attempt Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('✅ Firebase auth successful, UID:', user.uid);
      
      // 2. Check Firestore for user data
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      // 3. If user document doesn't exist in Firestore, create it
      if (!userDoc.exists()) {
        console.log('📝 Creating missing Firestore document for user:', email);
        
        // Determine role based on email
        const isAdminEmail = this.isAdminEmail(email);
        const adminExists = await this.checkAdminExists();
        
        let userRole = 'user';
        
        // Auto-admin logic:
        // - If SUPER_ADMIN_EMAIL and no admin exists → admin
        // - If email in allowed domains and no admin exists → admin
        // - Otherwise → user
        if (email === SUPER_ADMIN_EMAIL && !adminExists) {
          userRole = 'admin';
          console.log('👑 Granting admin role to SUPER_ADMIN_EMAIL');
        } else if (isAdminEmail && !adminExists) {
          userRole = 'admin';
          console.log('👑 Granting admin role to first admin from allowed domain');
        }
        
        // Create user document in Firestore
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          role: userRole,
          name: email.split('@')[0],
          displayName: email.split('@')[0],
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          status: 'active',
          permissions: userRole === 'admin' 
            ? ['upload_data', 'delete_data', 'manage_users', 'view_all'] 
            : ['view_data', 'export_data'],
          isAutoCreated: true
        });
        
        console.log(`✅ Created user document with role: ${userRole}`);
        
        return {
          uid: user.uid,
          email: user.email,
          role: userRole,
          name: email.split('@')[0],
          displayName: email.split('@')[0],
          isAdmin: userRole === 'admin'
        };
      }
      
      // 4. User document exists, return it
      const userData = userDoc.data();
      console.log('📊 Found user data:', userData);
      
      // Update last login timestamp
      await updateDoc(userDocRef, {
        lastLogin: serverTimestamp()
      });
      
      return {
        uid: user.uid,
        email: user.email,
        role: userData.role || 'user',
        name: userData.name || email.split('@')[0],
        displayName: userData.displayName || email.split('@')[0],
        isAdmin: (userData.role || 'user') === 'admin',
        ...userData
      };
      
    } catch (error) {
      console.error('❌ Login error:', {
        code: error.code,
        message: error.message,
        email: email
      });
      throw new Error(this.getErrorMessage(error.code));
    }
  },

  // ========== REGISTRATION FUNCTION ==========
  async register(email, password, name, requestedRole) {
    try {
      console.log('📝 Registration attempt:', { email, name, requestedRole });
      
      // 1. Check if email is already registered in Firestore
      const existingUser = await this.getUserByEmail(email);
      if (existingUser) {
        console.log('⚠️ Email already registered:', email);
        throw new Error('Email already registered. Please login instead.');
      }
      
      // 2. Determine final role
      const adminExists = await this.checkAdminExists();
      const isAdminEmail = this.isAdminEmail(email);
      
      let finalRole = 'user';
      
      // ADMIN REGISTRATION LOGIC:
      if (email === SUPER_ADMIN_EMAIL) {
        finalRole = 'admin';
        console.log('👑 SUPER_ADMIN_EMAIL detected, granting admin role');
      } else if (isAdminEmail && !adminExists) {
        finalRole = 'admin';
        console.log('👑 First admin from allowed domain detected');
      } else if (requestedRole === 'admin' && isAdminEmail) {
        // Allow admin registration from allowed domains
        finalRole = 'admin';
        console.log('👑 Admin requested from allowed domain');
      }
      
      // Block unauthorized admin attempts
      if (requestedRole === 'admin' && finalRole !== 'admin') {
        console.log('🚫 Unauthorized admin attempt from:', email);
        throw new Error('Admin registration is only available for specific email domains.');
      }
      
      // 3. Create Firebase Authentication account
      console.log('🔥 Creating Firebase auth user...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('✅ Firebase user created, UID:', user.uid);
      
      // 4. Create Firestore document
      const userData = {
        uid: user.uid,
        email: user.email,
        role: finalRole,
        name: name || email.split('@')[0],
        displayName: name || email.split('@')[0],
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        isFirstAdmin: finalRole === 'admin' && !adminExists,
        status: 'active',
        permissions: finalRole === 'admin' 
          ? ['upload_data', 'delete_data', 'manage_users', 'view_all'] 
          : ['view_data', 'export_data'],
        emailVerified: false,
        metadata: {
          registrationMethod: 'web-form',
          registrationDate: new Date().toISOString()
        }
      };
      
      await setDoc(doc(db, 'users', user.uid), userData);
      console.log(`✅ Firestore document created with role: ${finalRole}`);
      
      return {
        uid: user.uid,
        email: user.email,
        role: finalRole,
        name: name || email.split('@')[0],
        displayName: name || email.split('@')[0],
        isAdmin: finalRole === 'admin'
      };
      
    } catch (error) {
      console.error('❌ Registration error:', {
        code: error.code,
        message: error.message,
        email: email
      });
      
      // Return specific error messages
      if (error.message.includes('already registered') || 
          error.message.includes('only available') ||
          error.code === 'auth/email-already-in-use') {
        throw error;
      }
      
      throw new Error(this.getErrorMessage(error.code));
    }
  },

  // ========== HELPER FUNCTIONS ==========
  
  // Check if admin exists
  async checkAdminExists() {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'admin'));
      const querySnapshot = await getDocs(q);
      
      const exists = !querySnapshot.empty;
      console.log(`🔍 Admin exists check: ${exists ? 'YES' : 'NO'}`);
      return exists;
    } catch (error) {
      console.error('Error checking admin:', error);
      return false;
    }
  },

  // Get user by email
  async getUserByEmail(email) {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  },

  // Check if email qualifies for admin
  isAdminEmail(email) {
    // Check against SUPER_ADMIN_EMAIL
    if (email === SUPER_ADMIN_EMAIL) return true;
    
    // Check against allowed domains
    const domain = email.split('@')[1];
    return ALLOWED_ADMIN_DOMAINS.some(allowedDomain => 
      domain === allowedDomain || domain.endsWith(`.${allowedDomain}`)
    );
  },

  // Get all users (admin only)
  async getAllUsers() {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  },

  // Update user role (admin only)
  async updateUserRole(uid, newRole) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        role: newRole,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  },

  // Reset password
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  },

  // Logout
  async logout() {
    try {
      await signOut(auth);
      localStorage.clear();
      sessionStorage.clear();
      console.log('✅ User logged out successfully');
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  // Auth state observer
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('🔄 Auth state changed, user logged in:', user.email);
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (!userDoc.exists()) {
            console.log('📝 Auto-creating Firestore document for existing auth user');
            
            // Auto-create user document
            const isAdminEmail = this.isAdminEmail(user.email);
            const adminExists = await this.checkAdminExists();
            const defaultRole = (isAdminEmail && !adminExists) ? 'admin' : 'user';
            
            await setDoc(doc(db, 'users', user.uid), {
              uid: user.uid,
              email: user.email,
              role: defaultRole,
              name: user.email.split('@')[0],
              displayName: user.email.split('@')[0],
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
              status: 'active',
              isAutoCreated: true
            });
            
            callback({
              uid: user.uid,
              email: user.email,
              role: defaultRole,
              name: user.email.split('@')[0],
              displayName: user.email.split('@')[0],
              isAdmin: defaultRole === 'admin'
            });
            return;
          }
          
          const userData = userDoc.data();
          
          callback({
            uid: user.uid,
            email: user.email,
            role: userData.role || 'user',
            name: userData.name || user.email.split('@')[0],
            displayName: userData.displayName || user.email.split('@')[0],
            isAdmin: (userData.role || 'user') === 'admin',
            ...userData
          });
          
        } catch (error) {
          console.error('❌ Error in auth state change:', error);
          callback(null);
        }
      } else {
        console.log('🔄 Auth state changed, user logged out');
        callback(null);
      }
    });
  },

  // Get current user
  getCurrentUser() {
    const user = auth?.currentUser;
    console.log('👤 Current Firebase auth user:', user?.email);
    return user || null;
  },

  // Error messages
  getErrorMessage(errorCode) {
    const errorMessages = {
      'auth/invalid-email': 'Invalid email address format',
      'auth/user-disabled': 'This account has been disabled',
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/email-already-in-use': 'Email already registered. Please login instead.',
      'auth/weak-password': 'Password must be at least 6 characters long',
      'auth/network-request-failed': 'Network error. Please check your internet connection',
      'auth/too-many-requests': 'Too many failed attempts. Please try again in a few minutes.',
      'auth/invalid-credential': 'Invalid email or password',
      'auth/configuration-not-found': 'Authentication service is not configured',
      'auth/operation-not-allowed': 'Email/password authentication is not enabled',
      'auth/user-token-expired': 'Session expired. Please login again',
      'auth/requires-recent-login': 'Please login again to perform this action'
    };
    return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
  }
};

export default AuthService;