import { Timestamp } from 'firebase/firestore';

export interface RentPayment {
  id: string;
  tenantId: string;
  tenantName: string;
  property: string;
  room: string;
  date: Timestamp;
  amount: number;
  category: string;
  paymentMethod: string;
  notes?: string;
}
