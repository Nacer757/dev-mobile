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
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Course, CreateCoursePayload } from '../types/models';

const COLLECTION = 'courses';

// Get all courses
export const getCourses = async (): Promise<Course[]> => {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name,
    professorId: doc.data().professorId,
    groupIds: doc.data().groupIds || [],
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  })) as Course[];
};

// Get course by ID
export const getCourseById = async (courseId: string): Promise<Course | null> => {
  const docRef = await getDoc(doc(db, COLLECTION, courseId));
  if (!docRef.exists()) return null;
  const data = docRef.data();
  return {
    id: docRef.id,
    name: data.name,
    professorId: data.professorId,
    groupIds: data.groupIds || [],
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  } as Course;
};

// Get courses by professor ID
export const getCoursesByProfessorId = async (professorId: string): Promise<Course[]> => {
  const q = query(
    collection(db, COLLECTION),
    where('professorId', '==', professorId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name,
    professorId: doc.data().professorId,
    groupIds: doc.data().groupIds || [],
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  })) as Course[];
};

// Get courses by group ID
export const getCoursesByGroupId = async (groupId: string): Promise<Course[]> => {
  const q = query(
    collection(db, COLLECTION),
    where('groupIds', 'array-contains', groupId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name,
    professorId: doc.data().professorId,
    groupIds: doc.data().groupIds || [],
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  })) as Course[];
};

// Create a new course
export const createCourse = async (payload: CreateCoursePayload): Promise<Course> => {
  const docRef = await addDoc(collection(db, COLLECTION), {
    name: payload.name,
    professorId: payload.professorId,
    groupIds: payload.groupIds,
    createdAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    name: payload.name,
    professorId: payload.professorId,
    groupIds: payload.groupIds,
    createdAt: new Date(),
  };
};

// Update course
export const updateCourse = async (
  courseId: string,
  data: Partial<Pick<Course, 'name' | 'professorId' | 'groupIds'>>
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, courseId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

// Delete course
export const deleteCourse = async (courseId: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, courseId));
};

// Get all courses (alias for getCourses)
export const getAllCourses = getCourses;

// Export as namespace
export const CourseService = {
  getCourses,
  getAllCourses,
  getCourseById,
  getCoursesByProfessorId,
  getCoursesByGroupId,
  createCourse,
  updateCourse,
  deleteCourse,
};
