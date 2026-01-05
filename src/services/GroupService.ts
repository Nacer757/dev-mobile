import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Group, CreateGroupPayload } from '../types/models';

const COLLECTION = 'groups';

// Get all groups
export const getGroups = async (): Promise<Group[]> => {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name,
    studentIds: doc.data().studentIds || [],
    createdBy: doc.data().createdBy,
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  })) as Group[];
};

// Get group by ID
export const getGroupById = async (groupId: string): Promise<Group | null> => {
  const docRef = await getDoc(doc(db, COLLECTION, groupId));
  if (!docRef.exists()) return null;
  const data = docRef.data();
  return {
    id: docRef.id,
    name: data.name,
    studentIds: data.studentIds || [],
    createdBy: data.createdBy,
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  } as Group;
};

// Create a new group
export const createGroup = async (
  payload: CreateGroupPayload,
  createdBy: string
): Promise<Group> => {
  const docRef = await addDoc(collection(db, COLLECTION), {
    name: payload.name,
    studentIds: payload.studentIds || [],
    createdBy,
    createdAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    name: payload.name,
    studentIds: payload.studentIds || [],
    createdBy,
    createdAt: new Date(),
  };
};

// Update group
export const updateGroup = async (
  groupId: string,
  data: Partial<Pick<Group, 'name' | 'studentIds'>>
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, groupId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

// Delete group
export const deleteGroup = async (groupId: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, groupId));
};

// Add student to group
export const addStudentToGroup = async (
  groupId: string,
  studentId: string
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, groupId), {
    studentIds: arrayUnion(studentId),
    updatedAt: serverTimestamp(),
  });
};

// Remove student from group
export const removeStudentFromGroup = async (
  groupId: string,
  studentId: string
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, groupId), {
    studentIds: arrayRemove(studentId),
    updatedAt: serverTimestamp(),
  });
};

// Get groups by student ID
export const getGroupsByStudentId = async (studentId: string): Promise<Group[]> => {
  const q = query(
    collection(db, COLLECTION),
    where('studentIds', 'array-contains', studentId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name,
    studentIds: doc.data().studentIds || [],
    createdBy: doc.data().createdBy,
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  })) as Group[];
};

// Get all groups (alias for getGroups)
export const getAllGroups = getGroups;

// Export as namespace
export const GroupService = {
  getGroups,
  getAllGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  addStudentToGroup,
  removeStudentFromGroup,
  getGroupsByStudentId,
};
