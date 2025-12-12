export interface UserProfile {
  id: string;
  displayName?: string;
  bio?: string;
  email: string; // Ensure email is a required field
  role?: 'superadmin' | 'manager' | 'contractor' | 'user' | 'admin';
}
