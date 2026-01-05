import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Session, CreateSessionPayload } from '../types/models';
import { generateSessionSecret } from '../utils/qrHelpers';

const COLLECTION = 'sessions';

// For backward compatibility
export interface SessionDto {
  id: string;
  courseId: string;
  professorId: string;
  groupId: string;
  duration: number;
  startTime: Date;
  expiresAt: Date;
  qrSecret: string;
  isActive: boolean;
  createdAt: Date;
}

// Get session by ID
export const getSessionById = async (sessionId: string): Promise<Session | null> => {
  const docRef = await getDoc(doc(db, COLLECTION, sessionId));
  if (!docRef.exists()) return null;
  const data = docRef.data();
  return {
    id: docRef.id,
    courseId: data.courseId,
    professorId: data.professorId,
    groupId: data.groupId,
    duration: data.duration,
    startTime: data.startTime?.toDate(),
    expiresAt: data.expiresAt?.toDate(),
    qrSecret: data.qrSecret,
    isActive: data.isActive,
    createdAt: data.createdAt?.toDate(),
  } as Session;
};

// Get active sessions by professor ID
export const getActiveSessionsByProfessorId = async (
  professorId: string
): Promise<Session[]> => {
  const q = query(
    collection(db, COLLECTION),
    where('professorId', '==', professorId),
    where('isActive', '==', true)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      courseId: data.courseId,
      professorId: data.professorId,
      groupId: data.groupId,
      duration: data.duration,
      startTime: data.startTime?.toDate(),
      expiresAt: data.expiresAt?.toDate(),
      qrSecret: data.qrSecret,
      isActive: data.isActive,
      createdAt: data.createdAt?.toDate(),
    } as Session;
  });
};

// Get sessions by course ID
export const getSessionsByCourseId = async (courseId: string): Promise<Session[]> => {
  const q = query(collection(db, COLLECTION), where('courseId', '==', courseId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      courseId: data.courseId,
      professorId: data.professorId,
      groupId: data.groupId,
      duration: data.duration,
      startTime: data.startTime?.toDate(),
      expiresAt: data.expiresAt?.toDate(),
      qrSecret: data.qrSecret,
      isActive: data.isActive,
      createdAt: data.createdAt?.toDate(),
    } as Session;
  });
};

// Create a new session
export const createSession = async (
  groupId: string,
  duration: number,
  professorId: string,
  courseId: string
): Promise<Session> => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + duration * 60 * 1000);
  const qrSecret = generateSessionSecret();

  const docRef = await addDoc(collection(db, COLLECTION), {
    courseId,
    professorId,
    groupId,
    duration,
    startTime: Timestamp.fromDate(now),
    expiresAt: Timestamp.fromDate(expiresAt),
    qrSecret,
    isActive: true,
    createdAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    courseId,
    professorId,
    groupId,
    duration,
    startTime: now,
    expiresAt,
    qrSecret,
    isActive: true,
    createdAt: now,
  };
};

// End session (set isActive to false)
export const endSession = async (sessionId: string): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, sessionId), {
    isActive: false,
  });
};

// Validate QR code
export const validateSession = async (
  sessionId: string,
  secret: string
): Promise<{ valid: boolean; session?: Session; error?: string }> => {
  const session = await getSessionById(sessionId);

  if (!session) {
    return { valid: false, error: 'Session introuvable' };
  }

  if (!session.isActive) {
    return { valid: false, error: 'Session terminée' };
  }

  if (session.qrSecret !== secret) {
    return { valid: false, error: 'QR code invalide' };
  }

  if (new Date() > session.expiresAt!) {
    return { valid: false, error: 'QR code expiré' };
  }

  return { valid: true, session };
};

// Update QR token for a session
export const updateQrToken = async (sessionId: string, newToken: string): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, sessionId), {
    qrSecret: newToken,
    currentQrToken: newToken,
  });
};

// Export as namespace
export const SessionService = {
  getSessionById,
  getActiveSessionsByProfessorId,
  getSessionsByCourseId,
  createSession,
  endSession,
  validateSession,
  updateQrToken,
};
