import { Timestamp } from 'firebase/firestore';

export type DoorLockType = string;
export type PropertyType = string;

export interface DoorCode {
  id: string;
  location: string;
  code: string;
  adminProgrammingCode: string;
  guestCode: string;
  doorLockType: DoorLockType;
  property: PropertyType;
  lastChanged: Timestamp;
}
