// User roles
export type UserRole = 'admin' | 'professor' | 'student';

// User interface
export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  groupId?: string; // Only for students
  initialPassword?: string; // For admin view
  createdAt?: Date;
  updatedAt?: Date;
}

// Group interface
export interface Group {
  id?: string;
  name: string;
  description?: string;
  studentIds?: string[];
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Course interface
export interface Course {
  id?: string;
  name: string;
  description?: string;
  professorId: string;
  groupIds?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Session interface
export interface Session {
  id?: string;
  courseId: string;
  professorId: string;
  groupId?: string;
  duration?: number; // in minutes
  durationMinutes?: number;
  startTime: Date;
  expiresAt?: Date;
  endTime?: Date;
  qrSecret?: string;
  isActive?: boolean;
  status?: 'active' | 'ended';
  currentQrToken?: string;
  createdAt?: Date;
}

// Attendance status
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'PRESENT' | 'ABSENT' | 'LATE';

// Attendance record interface
export interface AttendanceRecord {
  id?: string;
  sessionId: string;
  studentId: string;
  courseId?: string;
  status: AttendanceStatus;
  timestamp?: Date;
  scannedAt?: Date | null;
  method?: 'qr_scan' | 'manual';
  createdAt?: Date;
}

// QR Code payload
export interface QrPayload {
  sessionId: string;
  courseId: string;
  token: string;
  timestamp: number;
}

// Auth credentials for login
export interface LoginCredentials {
  email: string;
  password: string;
}

// Create user payload (for admin)
export interface CreateUserPayload {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  groupId?: string;
}

// Create group payload
export interface CreateGroupPayload {
  name: string;
  description?: string;
  studentIds?: string[];
}

// Create course payload
export interface CreateCoursePayload {
  name: string;
  description?: string;
  professorId: string;
  groupIds?: string[];
}

// Create session payload
export interface CreateSessionPayload {
  courseId: string;
  groupId: string;
  duration: number;
}
