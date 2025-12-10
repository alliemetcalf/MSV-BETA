export interface Tenant {
  id: string;
  name: string;
  phone: string;
  email: string;
  property: string;
  room: string;
  notes: string;
  photoUrl?: string;
  active: boolean;
}
