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
import type { AttendanceRecord, AttendanceStatus } from '../types/models';

const COLLECTION = 'attendances';

// Get attendance by session ID
export const getAttendanceBySessionId = async (
  sessionId: string
): Promise<AttendanceRecord[]> => {
  const q = query(collection(db, COLLECTION), where('sessionId', '==', sessionId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      sessionId: data.sessionId,
      studentId: data.studentId,
      status: data.status,
      scannedAt: data.scannedAt?.toDate() || null,
      createdAt: data.createdAt?.toDate(),
    } as AttendanceRecord;
  });
};

// Get attendance by student ID
export const getAttendanceByStudentId = async (
  studentId: string
): Promise<AttendanceRecord[]> => {
  const q = query(collection(db, COLLECTION), where('studentId', '==', studentId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      sessionId: data.sessionId,
      studentId: data.studentId,
      status: data.status,
      scannedAt: data.scannedAt?.toDate() || null,
      createdAt: data.createdAt?.toDate(),
    } as AttendanceRecord;
  });
};

// Check if student already scanned for session
export const hasStudentScanned = async (
  sessionId: string,
  studentId: string
): Promise<boolean> => {
  const q = query(
    collection(db, COLLECTION),
    where('sessionId', '==', sessionId),
    where('studentId', '==', studentId)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty && snapshot.docs.some((d) => d.data().status === 'PRESENT' || d.data().status === 'LATE');
};

// Record attendance (scan QR)
export const recordAttendance = async (
  sessionId: string,
  studentId: string,
  sessionStartTime: Date
): Promise<AttendanceRecord> => {
  // Check if already scanned
  const alreadyScanned = await hasStudentScanned(sessionId, studentId);
  if (alreadyScanned) {
    throw new Error('Vous avez déjà scanné ce QR code');
  }

  const now = new Date();
  // If more than 10 minutes late, mark as LATE
  const lateThreshold = 10 * 60 * 1000; // 10 minutes
  const isLate = now.getTime() - sessionStartTime.getTime() > lateThreshold;
  const status: AttendanceStatus = isLate ? 'LATE' : 'PRESENT';

  const docRef = await addDoc(collection(db, COLLECTION), {
    sessionId,
    studentId,
    status,
    scannedAt: Timestamp.fromDate(now),
    createdAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    sessionId,
    studentId,
    status,
    scannedAt: now,
    createdAt: now,
  };
};

// Mark absent (for students who didn't scan)
export const markAbsent = async (
  sessionId: string,
  studentId: string
): Promise<AttendanceRecord> => {
  // Check if already has a record
  const q = query(
    collection(db, COLLECTION),
    where('sessionId', '==', sessionId),
    where('studentId', '==', studentId)
  );
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    // Already has a record, don't create another
    const existing = snapshot.docs[0];
    const data = existing.data();
    return {
      id: existing.id,
      sessionId: data.sessionId,
      studentId: data.studentId,
      status: data.status,
      scannedAt: data.scannedAt?.toDate() || null,
      createdAt: data.createdAt?.toDate(),
    } as AttendanceRecord;
  }

  const docRef = await addDoc(collection(db, COLLECTION), {
    sessionId,
    studentId,
    status: 'ABSENT' as AttendanceStatus,
    scannedAt: null,
    createdAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    sessionId,
    studentId,
    status: 'ABSENT',
    scannedAt: null,
    createdAt: new Date(),
  };
};

// Update attendance status
export const updateAttendanceStatus = async (
  attendanceId: string,
  status: AttendanceStatus
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, attendanceId), {
    status,
  });
};

// Export as namespace
export const AttendanceService = {
  getAttendanceBySessionId,
  getAttendanceByStudentId,
  hasStudentScanned,
  recordAttendance,
  markAbsent,
  updateAttendanceStatus,
};
