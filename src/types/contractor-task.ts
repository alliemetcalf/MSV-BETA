import { Timestamp } from 'firebase/firestore';

export interface ContractorTask {
  id: string;
  invoiceNumber?: number;
  dateOfTask: Timestamp;
  taskType: string;
  property: string;
  room?: string;
  description?: string;
  hoursWorked?: number;
  hourlyRate?: number;
  mileage?: number;
  mileageRate?: number;
  totalPaid?: number;
  datePaid?: Timestamp;
  totalInvoiceAmount?: number;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Paid';
}

export type TaskType = {
  id: string;
  name: string;
};
