import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  updatePassword,
  onAuthStateChanged,
  User as FirebaseUser,
  sendPasswordResetEmail,
  deleteUser as firebaseDeleteUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { User, CreateUserPayload } from '../types/models';

// Sign in with email and password
export const signIn = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const userData = await getUserById(userCredential.user.uid);
  if (!userData) {
    throw new Error('User data not found');
  }
  return userData;
};

// Sign out
export const logOut = async (): Promise<void> => {
  await signOut(auth);
};

// Get user by ID from Firestore
export const getUserById = async (userId: string): Promise<User | null> => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) {
    return null;
  }
  const data = userDoc.data();
  // Handle both displayName and firstName/lastName formats
  const displayName = data.displayName || 
    (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : data.email);
  
  return {
    uid: userDoc.id,
    email: data.email,
    displayName,
    role: data.role,
    groupId: data.groupId,
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  } as User;
};

// Create a new user (admin only) - keeps admin logged in
export const createUser = async (
  payload: CreateUserPayload,
  adminEmail?: string,
  adminPassword?: string
): Promise<User> => {
  // Create Firebase Auth user (this will sign in as the new user)
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    payload.email,
    payload.password
  );

  // Build user data without undefined values
  const userData: Record<string, any> = {
    email: payload.email,
    displayName: payload.displayName,
    role: payload.role,
    initialPassword: payload.password, // Store initial password for admin view
    createdAt: serverTimestamp(),
  };

  // Only add groupId if it exists (for students)
  if (payload.groupId) {
    userData.groupId = payload.groupId;
  }

  // Store user data in Firestore
  await setDoc(doc(db, 'users', userCredential.user.uid), userData);

  // Si c'est un étudiant avec un groupe, l'ajouter au tableau studentIds du groupe
  if (payload.role === 'student' && payload.groupId) {
    await updateDoc(doc(db, 'groups', payload.groupId), {
      studentIds: arrayUnion(userCredential.user.uid),
      updatedAt: serverTimestamp(),
    });
  }

  const createdUser: User = {
    uid: userCredential.user.uid,
    email: payload.email,
    displayName: payload.displayName,
    role: payload.role,
    groupId: payload.groupId,
    createdAt: new Date(),
  };

  // Re-sign in as admin if credentials provided
  if (adminEmail && adminPassword) {
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  }

  return createdUser;
};

// Update password
export const changePassword = async (newPassword: string): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('No user logged in');
  }
  await updatePassword(currentUser, newPassword);
  await updateDoc(doc(db, 'users', currentUser.uid), {
    updatedAt: serverTimestamp(),
  });
};

// Listen to auth state changes
export const onAuthChange = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Get current Firebase user
export const getCurrentFirebaseUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

// Send password reset email
export const resetPasswordByEmail = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

// Admin reset password - generates new password and updates in Firestore
export const adminResetPassword = async (
  userId: string,
  newPassword: string,
  adminEmail: string,
  adminPassword: string
): Promise<void> => {
  // Get user email first
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) {
    throw new Error('User not found');
  }
  
  const userData = userDoc.data();
  const userEmail = userData.email;
  const storedPassword = userData.initialPassword;

  // Check if stored password exists and is not empty
  if (!storedPassword || storedPassword.trim() === '') {
    throw new Error('NO_STORED_PASSWORD');
  }

  try {
    // Sign in as the user temporarily to update password
    const userCredential = await signInWithEmailAndPassword(auth, userEmail, storedPassword);
    await updatePassword(userCredential.user, newPassword);

    // Update the stored password in Firestore
    await updateDoc(doc(db, 'users', userId), {
      initialPassword: newPassword,
      updatedAt: serverTimestamp(),
    });
  } finally {
    // Always re-sign in as admin, even if there's an error
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  }
};

// Admin delete user completely - removes from Firebase Auth AND Firestore
export const adminDeleteUser = async (
  userId: string,
  adminEmail: string,
  adminPassword: string
): Promise<void> => {
  // Get user data first
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) {
    throw new Error('User not found');
  }
  
  const userData = userDoc.data();
  const userEmail = userData.email;
  const storedPassword = userData.initialPassword;

  // If we have the stored password, we can delete from Auth too
  if (storedPassword && storedPassword.trim() !== '') {
    try {
      // Sign in as the user temporarily
      const userCredential = await signInWithEmailAndPassword(auth, userEmail, storedPassword);
      
      // Delete from Firebase Auth
      await firebaseDeleteUser(userCredential.user);
    } catch (authError: any) {
      console.warn('Could not delete from Auth:', authError.message);
      // Continue to delete from Firestore anyway
    }
  }

  // Delete from Firestore
  await deleteDoc(doc(db, 'users', userId));

  // Re-sign in as admin
  await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
};

// Export as namespace for easier imports
export const AuthService = {
  signIn,
  logOut,
  getUserById,
  createUser,
  changePassword,
  onAuthChange,
  getCurrentFirebaseUser,
  resetPasswordByEmail,
  adminResetPassword,
  adminDeleteUser,
};
