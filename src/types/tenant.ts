export interface Tenant {
  id: string;
  name: string;
  phone: string;
  email: string;
  property: string;
  room: string;
  rent: number;
  notes: string;
  photoUrl?: string;
  active: boolean;
}
