'use client';
import { MainLayout } from '@/components/MainLayout';
import { useUser } from '@/firebase';
import { Loader2, Users, Shield, Lock, Building, Wallet, Wrench, ShieldAlert, DatabaseZap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Card,
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
import { LockTypesManager } from '@/components/admin/LockTypesManager';
import { IncomeTypeManager } from '@/components/admin/IncomeTypeManager';
import { PaymentMethodsManager } from '@/components/admin/PaymentMethodsManager';
import { TaskSettingsManager } from '@/components/admin/TaskSettingsManager';
import { Button } from '@/components/ui/button';
import { DataMigrationManager } from '@/components/admin/DataMigrationManager';

export default function AdminPage() {
  const { user, userProfile, isUserLoading } = useUser();
  const router = useRouter();

  const isAuthorized = userProfile?.role === 'superadmin' || userProfile?.role === 'manager';

  useEffect(() => {
    // If loading is finished and there's still no user, redirect to login
    if (!isUserLoading && !user) {
      router.push('/login');
      return;
    }
    // Once user and profile are loaded, check role
    if (!isUserLoading && userProfile && !isAuthorized) {
        router.push('/'); // Redirect non-admins
    }
  }, [user, isUserLoading, userProfile, isAuthorized, router]);


  // Show loader until we are sure about the user's auth state and role
  if (isUserLoading || !user || !isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Render the admin panel
  return (
    <MainLayout>
      <div className="w-full max-w-6xl px-4 flex flex-col gap-8">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Admin Panel</CardTitle>
              <CardDescription>
                Manage site-wide configurations and users here. Sections are
                collapsible.
              </CardDescription>
            </div>
            {userProfile?.role === 'superadmin' && (
              <Link href="/admin/permissions">
                <Button variant="outline">
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  Manage Permissions
                </Button>
              </Link>
            )}
          </CardHeader>
        </Card>

        <Accordion type="multiple" className="w-full space-y-4">
          {/* User Management Section */}
          {userProfile?.role === 'superadmin' && (
            <AccordionItem value="user-management" className="border rounded-lg">
              <AccordionTrigger className="p-4 text-lg font-semibold hover:no-underline">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-primary" />
                  User Management
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0">
                <div className="grid md:grid-cols-2 gap-8">
                  <AddUserForm />
                  <UserRoleManager />
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
          
          {/* Property & Tenant Management Section */}
          <AccordionItem value="property-management" className="border rounded-lg">
            <AccordionTrigger className="p-4 text-lg font-semibold hover:no-underline">
              <div className="flex items-center gap-3">
                <Building className="h-6 w-6 text-primary" />
                Property & Tenant Management
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 pt-0">
              <div className="grid md:grid-cols-2 gap-8">
                 <PropertiesManager />
                 <TenantsManager />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Financials Management Section */}
          <AccordionItem value="financials-management" className="border rounded-lg">
            <AccordionTrigger className="p-4 text-lg font-semibold hover:no-underline">
              <div className="flex items-center gap-3">
                <Wallet className="h-6 w-6 text-primary" />
                Financials & Tasks Configuration
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 pt-0">
              <div className="grid md:grid-cols-2 gap-8">
                 <IncomeTypeManager />
                 <ExpenseCategoryManager />
                 <VendorsManager />
                 <PaymentMethodsManager />
                 <TaskSettingsManager />
              </div>
            </AccordionContent>
          </AccordionItem>
          
           {/* Site Configuration Section */}
           {userProfile?.role === 'superadmin' && (
            <AccordionItem value="site-config" className="border rounded-lg">
                <AccordionTrigger className="p-4 text-lg font-semibold hover:no-underline">
                <div className="flex items-center gap-3">
                    <Lock className="h-6 w-6 text-primary" />
                    Site Configuration
                </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0">
                <div className="grid md:grid-cols-2 gap-8">
                    <LockTypesManager />
                </div>
                </AccordionContent>
            </AccordionItem>
           )}

          {/* Data Migration Section */}
          {userProfile?.role === 'superadmin' && (
            <AccordionItem value="data-migration" className="border rounded-lg">
                <AccordionTrigger className="p-4 text-lg font-semibold hover:no-underline">
                <div className="flex items-center gap-3">
                    <DatabaseZap className="h-6 w-6 text-primary" />
                    Data Migration
                </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0">
                <div className="grid md:grid-cols-2 gap-8">
                    <DataMigrationManager />
                </div>
                </AccordionContent>
            </AccordionItem>
          )}

        </Accordion>
      </div>
    </MainLayout>
  );
}
