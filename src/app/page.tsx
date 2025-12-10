'use client';

import { useUser, useAuth } from '@/firebase';
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
import { IdTokenResult } from 'firebase/auth';

export default function Home() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser(auth);
  const router = useRouter();
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [claimsLoading, setClaimsLoading] = useState(true);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (user) {
      setClaimsLoading(true);
      user.getIdTokenResult().then((idTokenResult: IdTokenResult) => {
        const userRole = idTokenResult.claims.role;
        if (userRole === 'admin') {
          setRole('admin');
        } else {
          setRole('user');
        }
        setClaimsLoading(false);
      });
    } else {
      setRole(null);
      setClaimsLoading(false);
    }
  }, [user]);

  if (isUserLoading || claimsLoading || !user) {
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
              Welcome back, {user.email}! (Role: {role})
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    </MainLayout>
  );
}
