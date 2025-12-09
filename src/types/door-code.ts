import { Timestamp } from 'firebase/firestore';

export type DoorLockType = {
  id: string;
  name: string;
  textInstructions?: string;
  instructionImageUrl?: string;
};

export type PropertyType = string;

export interface DoorCode {
  id: string;
  location: string;
  code: string;
  adminProgrammingCode: string;
  guestCode: string;
  doorLockType: string; // This will store the name of the lock type
  property: PropertyType;
  lastChanged: Timestamp;
}
