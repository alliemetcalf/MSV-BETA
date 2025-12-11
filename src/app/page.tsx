'use client';

import { useUser, useAuth, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { UserCheck, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/MainLayout';
import { doc } from 'firebase/firestore';

interface UserProfile {
  role: 'superadmin' | 'manager' | 'contractor' | 'user';
}

export default function Home() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser(auth);
  const router = useRouter();

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );

  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <MainLayout>
      <main className="flex flex-1 flex-col items-center gap-8 p-4">
        <Card className="w-full max-w-md shadow-2xl animate-in fade-in-50 zoom-in-95 duration-500">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit">
              <UserCheck className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="mt-4 text-3xl font-headline font-bold text-primary">
              Welcome
            </CardTitle>
            <CardDescription className="font-body">
              Welcome back, {user.email}! (Role: {userProfile?.role || '...'})
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    </MainLayout>
  );
}
