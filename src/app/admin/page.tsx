'use client';
import { MainLayout } from '@/components/MainLayout';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LockTypesManager } from '@/components/admin/LockTypesManager';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { IdTokenResult } from 'firebase/auth';

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [claimsLoading, setClaimsLoading] = useState(true);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult().then((idTokenResult: IdTokenResult) => {
        const userRole = idTokenResult.claims.role;
        if (userRole !== 'admin') {
          router.push('/');
        } else {
          setIsAdmin(true);
        }
        setClaimsLoading(false);
      });
    } else if (!isUserLoading) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || claimsLoading || !isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="w-full max-w-4xl px-4 flex flex-col gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Admin Panel</CardTitle>
            <CardDescription>
              Manage site-wide configurations here.
            </CardDescription>
          </CardHeader>
        </Card>
        <LockTypesManager />
      </div>
    </MainLayout>
  );
}
