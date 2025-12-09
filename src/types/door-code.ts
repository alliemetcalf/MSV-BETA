import { Timestamp } from 'firebase/firestore';

export type DoorLockType = 'Keypad' | 'Smart Lock' | 'Key Box' | 'Other';

export interface DoorCode {
  id: string;
  location: string;
  code: string;
  doorLockType: DoorLockType;
  lastChanged: Timestamp;
}
