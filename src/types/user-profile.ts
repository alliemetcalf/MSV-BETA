export interface UserProfile {
  id: string;
  displayName?: string;
  bio?: string;
  email?: string;
  role?: 'superadmin' | 'manager' | 'contractor' | 'user' | 'admin';
}
