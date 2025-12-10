'use client';
import { MainLayout } from '@/components/MainLayout';
import { useUser, useAuth } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
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
import { ExpenseCategoryManager } from '@/components/admin/ExpenseCategoryManager';
import { VendorsManager } from '@/components/admin/VendorsManager';

export default function AdminPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser(auth);
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and there's still no user, redirect to login
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);


  // Show loader until we are sure about the user's auth state
  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Render the admin panel for any logged-in user
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
        <div className="grid md:grid-cols-2 gap-8">
          <TenantsManager />
          <ExpenseCategoryManager />
        </div>
        <div className="grid md:grid-cols-2 gap-8">
            <VendorsManager />
        </div>
      </div>
    </MainLayout>
  );
}
