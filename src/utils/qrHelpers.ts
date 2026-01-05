import CryptoJS from 'crypto-js';
import type { QrPayload } from '../types/models';

const SECRET_KEY = 'attendify-secret-key'; // In production, use a secure key from env

// Legacy interface for backward compatibility
export interface QrData {
  sessionId: string;
  timestamp: number;
  hash: string;
}

// Generate random string without native crypto (compatible with Expo Go)
const generateRandomString = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate a unique session secret
export const generateSessionSecret = (): string => {
  const randomString = generateRandomString(32);
  return CryptoJS.SHA256(randomString + Date.now().toString()).toString();
};

// Generate QR payload for a session
export const generateQrPayload = (sessionId: string, courseId: string, token: string): QrPayload => {
  return {
    sessionId,
    courseId,
    token,
    timestamp: Date.now(),
  };
};

// Stringify QR payload for QR code
export const stringifyQrPayload = (payload: QrPayload): string => {
  return JSON.stringify(payload);
};

// Parse QR payload from scanned string
export const parseQrPayload = (qrString: string): QrPayload | null => {
  try {
    const parsed = JSON.parse(qrString);
    if (parsed.sessionId && parsed.token && parsed.courseId) {
      return parsed as QrPayload;
    }
  } catch (error) {
    console.error('Invalid QR payload format', error);
  }
  return null;
};

// Validate QR payload (basic client-side validation - token expiry should be checked server-side)
export const isQrPayloadValid = (payload: QrPayload): boolean => {
  // Basic validation - more thorough validation should happen server-side
  return !!payload.sessionId && !!payload.token && !!payload.courseId;
};

// Legacy functions for backward compatibility
export const generateQrData = (sessionId: string): QrData => {
  const timestamp = Date.now();
  const data = `${sessionId}:${timestamp}`;
  const hash = CryptoJS.HmacSHA256(data, SECRET_KEY).toString();
  return { sessionId, timestamp, hash };
};

export const validateQrData = (qrData: QrData): boolean => {
  const { sessionId, timestamp, hash } = qrData;
  const data = `${sessionId}:${timestamp}`;
  const expectedHash = CryptoJS.HmacSHA256(data, SECRET_KEY).toString();
  return hash === expectedHash && (Date.now() - timestamp) < 24 * 60 * 60 * 1000;
};

export const parseQrData = (qrString: string): QrData | null => {
  try {
    const parsed = JSON.parse(qrString);
    if (parsed.sessionId && parsed.timestamp && parsed.hash) {
      return parsed as QrData;
    }
  } catch (error) {
    console.error('Invalid QR data format', error);
  }
  return null;
};

export const stringifyQrData = (qrData: QrData): string => {
  return JSON.stringify(qrData);
};
