import { Timestamp } from 'firebase/firestore';

export interface PendingMove {
  newProperty: string;
  newRoom: string;
  moveDate: Timestamp;
  newRent: number;
  newDeposit: number;
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  email: string;
  property: string;
  room: string;
  rent: number;
  deposit?: number;
  notes: string;
  photoUrl?: string;
  active: boolean;
  leaseEffective?: Timestamp;
  leaseEnded?: Timestamp;
  pendingMove?: PendingMove;
}

    