// Services barrel export

// Auth (specific exports to avoid conflicts)
export { 
  signIn, 
  logOut, 
  onAuthChange, 
  createUser, 
  changePassword,
  AuthService,
} from './AuthService';

// Users
export { 
  getAllUsers, 
  getUserById, 
  getUsersByRole, 
  getProfessors, 
  getStudents, 
  updateUser, 
  deleteUser,
  getStudentsByIds,
  UserService,
} from './UserService';

// Groups
export * from './GroupService';

// Courses
export * from './CourseService';

// Sessions
export * from './SessionService';

// Attendance
export * from './AttendanceServiceFirebase';
