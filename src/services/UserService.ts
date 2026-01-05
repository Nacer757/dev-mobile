import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User, UserRole } from '../types/models';

const COLLECTION = 'users';

// Helper to map Firestore doc to User
const mapDocToUser = (d: any): User => {
  const data = d.data();
  // Handle both displayName and firstName/lastName formats
  const displayName = data.displayName || 
    (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : 
    (data.name || data.email || 'Étudiant'));
  
  return {
    uid: d.id,
    email: data.email,
    displayName,
    role: data.role,
    groupId: data.groupId,
    initialPassword: data.initialPassword,
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  };
};

// Get all users
export const getAllUsers = async (): Promise<User[]> => {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map(mapDocToUser);
};

// Get user by ID
export const getUserById = async (userId: string): Promise<User | null> => {
  const docRef = doc(db, COLLECTION, userId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return mapDocToUser(docSnap);
};

// Get users by role
export const getUsersByRole = async (role: UserRole): Promise<User[]> => {
  const q = query(collection(db, COLLECTION), where('role', '==', role));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapDocToUser);
};

// Get all professors
export const getProfessors = async (): Promise<User[]> => {
  return getUsersByRole('professor');
};

// Get all students
export const getStudents = async (): Promise<User[]> => {
  return getUsersByRole('student');
};

// Update user
export const updateUser = async (userId: string, data: Partial<User>): Promise<void> => {
  const docRef = doc(db, COLLECTION, userId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

// Delete user
export const deleteUser = async (userId: string): Promise<void> => {
  const docRef = doc(db, COLLECTION, userId);
  await deleteDoc(docRef);
};

// Get students by IDs
export const getStudentsByIds = async (studentIds: string[]): Promise<User[]> => {
  if (studentIds.length === 0) return [];
  
  // Firestore 'in' query limited to 10 items, so we batch
  const batches: Promise<User[]>[] = [];
  for (let i = 0; i < studentIds.length; i += 10) {
    const batch = studentIds.slice(i, i + 10);
    const q = query(
      collection(db, COLLECTION),
      where('__name__', 'in', batch)
    );
    batches.push(
      getDocs(q).then((snapshot) => snapshot.docs.map(mapDocToUser))
    );
  }
  
  const results = await Promise.all(batches);
  return results.flat();
};

// Export as namespace
export const UserService = {
  getAllUsers,
  getUserById,
  getUsersByRole,
  getProfessors,
  getStudents,
  updateUser,
  deleteUser,
  getStudentsByIds,
};
