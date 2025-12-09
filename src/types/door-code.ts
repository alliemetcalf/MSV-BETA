import { Timestamp } from 'firebase/firestore';

export interface DoorCode {
  id: string;
  location: string;
  code: string;
  lastChanged: Timestamp;
}
