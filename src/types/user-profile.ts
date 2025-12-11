export interface UserProfile {
  id: string;
  displayName?: string;
  bio?: string;
  role?: 'superadmin' | 'manager' | 'contractor' | 'user';
}
