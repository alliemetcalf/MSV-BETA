'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  useUser,
  useFirestore,
  useMemoFirebase,
  useCollection,
  useAuth,
} from '@/firebase';
import { collection } from 'firebase/firestore';
import { MainLayout } from '@/components/MainLayout';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2, Mail, Phone, User as UserIcon, Home } from 'lucide-rect';
import { Tenant } from '@/types/tenant';
import { useRouter } from 'next/navigation';

export default function TenantsPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser(auth);
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const tenantsCollectionRef = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'tenants') : null),
    [firestore, user]
  );

  const {
    data: tenants,
    isLoading: tenantsLoading,
    error: tenantsError,
  } = useCollection<Tenant>(tenantsCollectionRef);

  const groupedTenants = useMemo(() => {
    if (!tenants) return {};
    return tenants.reduce(
      (acc, tenant) => {
        const { property } = tenant;
        if (!acc[property]) {
          acc[property] = [];
        }
        acc[property].push(tenant);
        return acc;
      },
      {} as Record<string, Tenant[]>
    );
  }, [tenants]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="w-full max-w-4xl px-4">
        <Card>
          <CardHeader>
            <CardTitle>Tenant Directory</CardTitle>
            <CardDescription>
              A directory of all tenants across all properties.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tenantsLoading && (
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            )}
            {tenantsError && (
              <p className="text-destructive">Error: {tenantsError.message}</p>
            )}
            {!tenantsLoading && tenants && (
              <Accordion
                type="multiple"
                className="w-full"
                defaultValue={Object.keys(groupedTenants)}
              >
                {Object.entries(groupedTenants)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([property, tenantList]) => (
                    <AccordionItem value={property} key={property}>
                      <AccordionTrigger className="text-xl font-semibold">
                        {property}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {tenantList
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((tenant) => (
                              <Card key={tenant.id}>
                                <CardHeader>
                                  <CardTitle className="flex items-center gap-2">
                                    <UserIcon className="text-primary" />{' '}
                                    {tenant.name}
                                  </CardTitle>
                                  <CardDescription>
                                    Room: {tenant.room || 'N/A'}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    <a
                                      href={`mailto:${tenant.email}`}
                                      className="hover:underline"
                                    >
                                      {tenant.email || 'No email'}
                                    </a>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                    <a
                                      href={`tel:${tenant.phone}`}
                                      className="hover:underline"
                                    >
                                      {tenant.phone || 'No phone'}
                                    </a>
                                  </div>
                                  {tenant.notes && (
                                    <div className="pt-2">
                                      <p className="text-xs text-muted-foreground italic">
                                        "{tenant.notes}"
                                      </p>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
              </Accordion>
            )}
            {!tenantsLoading && (!tenants || tenants.length === 0) && (
              <div className="text-center text-muted-foreground py-8">
                No tenants found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
