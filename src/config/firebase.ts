import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBig7v6nPdBBxB11-wq-xwxoodufsVN4hA",
  authDomain: "attendify-80a9a.firebaseapp.com",
  projectId: "attendify-80a9a",
  storageBucket: "attendify-80a9a.firebasestorage.app",
  messagingSenderId: "525165075958",
  appId: "1:525165075958:web:ae6e4325010f436e16fbd7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);

export default app;
