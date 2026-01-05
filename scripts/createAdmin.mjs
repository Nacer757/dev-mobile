/**
 * Script pour créer le compte Admin initial dans Firebase
 * Exécuter: node scripts/createAdmin.mjs
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBig7v6nPdBBxB11-wq-xwxoodufsVN4hA",
  authDomain: "attendify-80a9a.firebaseapp.com",
  projectId: "attendify-80a9a",
  storageBucket: "attendify-80a9a.firebasestorage.app",
  messagingSenderId: "525165075958",
  appId: "1:525165075958:web:ae6e4325010f436e16fbd7"
};

// Admin credentials
const ADMIN_EMAIL = 'admin@attendify.com';
const ADMIN_PASSWORD = 'Admin123!';

async function createAdmin() {
  console.log('🚀 Initialisation de Firebase...');
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    // Try to sign in first to check if account exists
    console.log('🔍 Vérification si le compte existe...');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      console.log('✅ Le compte admin existe déjà!');
      console.log('   UID:', userCredential.user.uid);
      
      // Check if Firestore document exists
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (!userDoc.exists()) {
        console.log('📝 Document Firestore manquant, création...');
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: ADMIN_EMAIL,
          displayName: 'Admin Attendify',
          role: 'admin',
          createdAt: serverTimestamp(),
        });
        console.log('✅ Document Firestore créé!');
      } else {
        console.log('✅ Document Firestore existe déjà');
        console.log('   Données:', JSON.stringify(userDoc.data(), null, 2));
      }
      
      console.log('');
      console.log('========================================');
      console.log('🎉 ADMIN PRÊT !');
      console.log('   Email:', ADMIN_EMAIL);
      console.log('   Password:', ADMIN_PASSWORD);
      console.log('========================================');
      process.exit(0);
    } catch (signInError) {
      if (signInError.code === 'auth/invalid-credential' || signInError.code === 'auth/user-not-found') {
        console.log('ℹ️ Compte non trouvé, création...');
      } else {
        throw signInError;
      }
    }

    // Create new account
    console.log('👤 Création du compte Admin...');
    const userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    const userId = userCredential.user.uid;
    console.log('✅ Compte Auth créé avec ID:', userId);

    // Create user document in Firestore
    await setDoc(doc(db, 'users', userId), {
      email: ADMIN_EMAIL,
      displayName: 'Admin Attendify',
      role: 'admin',
      createdAt: serverTimestamp(),
    });

    console.log('✅ Document utilisateur créé dans Firestore');
    console.log('');
    console.log('========================================');
    console.log('🎉 ADMIN CRÉÉ AVEC SUCCÈS !');
    console.log('   Email:', ADMIN_EMAIL);
    console.log('   Password:', ADMIN_PASSWORD);
    console.log('========================================');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('========================================');
    console.error('❌ ERREUR:', error.message);
    if (error.code) console.error('   Code:', error.code);
    console.error('========================================');
    process.exit(1);
  }
}

createAdmin();
