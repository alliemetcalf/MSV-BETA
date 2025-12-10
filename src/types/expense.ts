import { Timestamp } from 'firebase/firestore';

export interface Expense {
  id: string;
  date: Timestamp;
  amount: number;
  description: string;
  category: string;
  property?: string;
  room?: string;
  receiptUrl?: string;
}

export type ExpenseCategory = {
  id: string;
  name: string;
};
