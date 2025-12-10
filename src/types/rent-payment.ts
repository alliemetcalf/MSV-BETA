import { Timestamp } from 'firebase/firestore';

export interface RentPayment {
  id: string;
  tenantId: string;
  tenantName: string;
  property: string;
  date: Timestamp;
  amount: number;
  paymentMethod: string;
  notes?: string;
}
