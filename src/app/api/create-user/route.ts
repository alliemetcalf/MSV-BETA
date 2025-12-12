import {NextRequest, NextResponse} from 'next/server';
import {initializeApp, getApp, getApps, cert} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {CreateUserInputSchema} from '@/ai/schemas/user-schemas';

// Lazy-load the service account credentials.
let serviceAccount: any;
try {
  serviceAccount = require('../../../../firebase-service-account.json');
} catch (e) {
  console.error(
    'firebase-service-account.json not found. Make sure it exists in the root of your project.'
  );
  serviceAccount = null;
}

// Initialize Firebase Admin SDK idempotently.
function initializeAdmin() {
  if (!getApps().length) {
    if (!serviceAccount) {
      throw new Error('Service account credentials are not loaded.');
    }
    initializeApp({
      credential: cert(serviceAccount),
    });
  }
  return getApp();
}

export async function POST(req: NextRequest) {
  try {
    const adminApp = initializeAdmin();
    const auth = getAuth(adminApp);
    const db = getFirestore(adminApp);

    const body = await req.json();
    const parsedBody = CreateUserInputSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {error: 'Invalid input', details: parsedBody.error.format()},
        {status: 400}
      );
    }

    const {email, password, displayName, role} = parsedBody.data;

    // 1. Create the user in Firebase Authentication.
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
    });

    // 2. Create the user profile document in Firestore.
    const userDocRef = db.collection('users').doc(userRecord.uid);
    await userDocRef.set({
      email,
      role,
      displayName,
      bio: '', // Initialize with an empty bio.
    });

    return NextResponse.json(
      {
        message: `Successfully created user ${userRecord.email} with UID ${userRecord.uid}`,
      },
      {status: 201}
    );
  } catch (error: any) {
    console.error('API Error: Failed to create user:', error);
    return NextResponse.json(
      {error: error.message || 'An internal server error occurred.'},
      {status: 500}
    );
  }
}
