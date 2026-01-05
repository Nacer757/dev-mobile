export type RootStackParamList = {
  // Auth
  Login: undefined;
  
  // Admin screens
  AdminDashboard: undefined;
  UserManagement: undefined;
  GroupManagement: undefined;
  CourseManagement: undefined;
  
  // Professor screens
  ProfessorDashboard: undefined;
  GenerateQr: { courseId: string };
  AttendanceList: { courseId: string };
  
  // Student screens
  StudentHome: undefined;
  ScanQr: undefined;
};
