export type Role = 'student' | 'employer' | 'admin' | 'coordinator';

export interface AuthUser {
  id: number;
  email: string;
  role: Role;
}

export interface CurrentUser extends AuthUser {
  status: string;
  student: { id: number; firstName: string; lastName: string } | null;
  employer: { id: number; companyName: string; verificationStatus: 'pending' | 'verified' | 'rejected' } | null;
}

export interface OpportunitySummary {
  opportunityId: number;
  type: 'job' | 'internship' | 'ojt';
  title: string;
  location: string | null;
  workSetup: 'onsite' | 'remote' | 'hybrid' | null;
  allowanceSalary: number | null;
  slots: number;
  deadline: string | null;
  createdAt: string;
  employerId: number;
  companyName: string;
  skills: { id: number; name: string }[];
}

export interface Page<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
