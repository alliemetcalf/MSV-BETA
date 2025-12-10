export interface UserProfile {
  id: string;
  displayName?: string;
  bio?: string;
  role?: 'admin' | 'user' | 'assistant';
}
