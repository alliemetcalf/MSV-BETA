'use client';
import { MainLayout } from '@/components/MainLayout';
import { useUser, useAuth } from '@/firebase';
import { Loader2, Users, Shield, Lock, Building, Wallet, ShoppingCart, Coins } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
              Manage site-wide configurations and users here. Sections are
              collapsible.
            </CardDescription>
          </CardHeader>
        </Card>

        <Accordion type="multiple" className="w-full space-y-4">
          {/* User Management Section */}
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
                Financials Management
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 pt-0">
              <div className="grid md:grid-cols-2 gap-8">
                 <IncomeTypeManager />
                 <ExpenseCategoryManager />
                 <VendorsManager />
              </div>
            </AccordionContent>
          </AccordionItem>
          
           {/* Site Configuration Section */}
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

        </Accordion>
      </div>
    </MainLayout>
  );
}
