import { Timestamp } from 'firebase/firestore';

export type DoorLockType = string;

export interface DoorCode {
  id: string;
  location: string;
  code: string;
  doorLockType: DoorLockType;
  lastChanged: Timestamp;
}
