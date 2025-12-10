'use client';

import React from 'react';
import {
  useUser,
  useFirestore,
  useMemoFirebase,
  useCollection,
  useAuth,
} from '@/firebase';
import { collection } from 'firebase/firestore';
import { MainLayout } from '@/components/MainLayout';
import Image from 'next/image';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Loader2,
  Building,
  MapPin,
  User as UserIcon,
  DoorOpen,
} from 'lucide-react';
import { Property } from '@/types/property';
import { Tenant } from '@/types/tenant';
import { useRouter } from 'next/navigation';
import { getAllDoorCodes, GetAllDoorCodesOutput } from '@/ai/flows/get-all-door-codes-flow';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function PropertiesPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser(auth);
  const firestore = useFirestore();
  const router = useRouter();

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const propertiesCollectionRef = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'properties') : null),
    [firestore, user]
  );
  const {
    data: properties,
    isLoading: propertiesLoading,
    error: propertiesError,
  } = useCollection<Property>(propertiesCollectionRef);

  const tenantsCollectionRef = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'tenants') : null),
    [firestore, user]
  );
  const {
    data: tenants,
    isLoading: tenantsLoading,
    error: tenantsError,
  } = useCollection<Tenant>(tenantsCollectionRef);
  
  const [allDoorCodes, setAllDoorCodes] = React.useState<GetAllDoorCodesOutput | null>(null);
  const [doorCodesLoading, setDoorCodesLoading] = React.useState(true);
  
  React.useEffect(() => {
    if(user) {
      getAllDoorCodes()
        .then(setAllDoorCodes)
        .catch(console.error)
        .finally(() => setDoorCodesLoading(false));
    }
  }, [user]);

  const tenantsByProperty = React.useMemo(() => {
    if (!tenants) return {};
    return tenants.reduce((acc, tenant) => {
      if (!acc[tenant.property]) {
        acc[tenant.property] = [];
      }
      acc[tenant.property].push(tenant);
      return acc;
    }, {} as Record<string, Tenant[]>);
  }, [tenants]);

  const doorCodesByProperty = React.useMemo(() => {
    if (!allDoorCodes) return {};
    const flatCodes = allDoorCodes.flatMap(user => user.codes);
    return flatCodes.reduce((acc, code) => {
        if (!acc[code.property]) {
            acc[code.property] = [];
        }
        acc[code.property].push(code);
        return acc;
    }, {} as Record<string, typeof flatCodes>);
  }, [allDoorCodes]);

  const sortedProperties = React.useMemo(() => {
    return properties ? [...properties].sort((a, b) => a.name.localeCompare(b.name)) : [];
  }, [properties]);

  const pageIsLoading = isUserLoading || propertiesLoading || tenantsLoading || doorCodesLoading;

  if (pageIsLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const pageError = propertiesError || tenantsError;

  return (
    <MainLayout>
      <div className="w-full max-w-6xl px-4">
        <Card>
          <CardHeader>
            <CardTitle>Properties</CardTitle>
            <CardDescription>
              A directory of all managed properties.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pageError && (
              <p className="text-destructive text-center py-8">Error: {pageError.message}</p>
            )}
            {!pageIsLoading && !pageError && sortedProperties.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sortedProperties.map((property) => {
                  const propertyTenants = tenantsByProperty[property.name] || [];
                  const propertyDoorCodes = doorCodesByProperty[property.name] || [];
                  
                  return (
                    <Card key={property.id} className="overflow-hidden flex flex-col">
                      <div className="relative w-full aspect-video bg-muted">
                        {property.photoUrl ? (
                           <Image
                            src={property.photoUrl}
                            alt={`Photo of ${property.name}`}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                             <Building className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <CardHeader>
                        <CardTitle>{property.name}</CardTitle>
                        {property.address && (
                          <CardDescription className="flex items-center gap-2 pt-1">
                            <MapPin className="w-4 h-4" />
                            {property.address}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <p className="text-sm text-muted-foreground line-clamp-4">
                          {property.description || 'No description available.'}
                        </p>
                      </CardContent>
                      <CardFooter className="flex-col items-start gap-2 pt-4 border-t px-0">
                         <Accordion type="multiple" className="w-full">
                          {(propertyTenants.length > 0) && (
                            <AccordionItem value="tenants" className="px-6 border-b-0">
                              <AccordionTrigger className="py-2">
                                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                  <UserIcon className="w-4 h-4" />
                                  Tenants ({propertyTenants.length})
                                </h4>
                              </AccordionTrigger>
                              <AccordionContent className="pb-0">
                                <div className="w-full space-y-2 pt-2">
                                  {propertyTenants.map(tenant => (
                                      <div key={tenant.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                                          <span>{tenant.name} ({tenant.room || 'N/A'})</span>
                                      </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )}
                          {(propertyDoorCodes.length > 0) && (
                            <AccordionItem value="door-codes" className="px-6 border-b-0">
                                <AccordionTrigger className="py-2">
                                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    <DoorOpen className="w-4 h-4" />
                                    Door Codes ({propertyDoorCodes.length})
                                  </h4>
                                </AccordionTrigger>
                                <AccordionContent className="pb-0">
                                  <div className="w-full space-y-2 pt-2">
                                  {propertyDoorCodes.map(code => (
                                      <div key={code.id} className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                                          <span>{code.location}</span>
                                          <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{code.code}</span>
                                      </div>
                                  ))}
                                  </div>
                                </AccordionContent>
                            </AccordionItem>
                          )}
                        </Accordion>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            ) : (
              !pageIsLoading && (
                <div className="text-center text-muted-foreground py-8">
                  No properties found. Admins can add properties from the Admin page.
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
