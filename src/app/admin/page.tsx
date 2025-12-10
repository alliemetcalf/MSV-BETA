'use client';
import { MainLayout } from '@/components/MainLayout';
import { useUser, useAuth, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
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
import { AddUserForm } from '@/components/admin/AddUserForm';
import { PropertiesManager } from '@/components/admin/PropertiesManager';
import { UserRoleManager } from '@/components/admin/UserRoleManager';
import { TenantsManager } from '@/components/admin/TenantsManager';
import { doc } from 'firebase/firestore';

interface UserProfile {
  role: 'admin' | 'user' | 'assistant';
}

export default function AdminPage() {
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

  useEffect(() => {
    // Only redirect if loading is finished and the user is confirmed to not be an admin
    if (!isUserLoading && !isProfileLoading && userProfile && userProfile.role !== 'admin') {
      router.push('/');
    }
  }, [user, isUserLoading, userProfile, isProfileLoading, router]);

  const isAdmin = !isProfileLoading && userProfile?.role === 'admin';
  const isLoading = isUserLoading || isProfileLoading;
  
  if (isLoading || !isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="w-full max-w-6xl px-4 flex flex-col gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Admin Panel</CardTitle>
            <CardDescription>
              Manage site-wide configurations and users here.
            </CardDescription>
          </CardHeader>
        </Card>
        <div className="grid md:grid-cols-2 gap-8">
          <AddUserForm />
          <UserRoleManager />
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <LockTypesManager />
          <PropertiesManager />
        </div>
         <TenantsManager />
      </div>
    </MainLayout>
  );
}
