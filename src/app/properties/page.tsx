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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Building,
  MapPin,
  User as UserIcon,
  DoorOpen,
  Mail,
  Phone,
  DollarSign,
  Landmark,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Property } from '@/types/property';
import { Tenant } from '@/types/tenant';
import { useRouter } from 'next/navigation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { DoorCode } from '@/types/door-code';

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function getInitials(name: string) {
  if (!name) return '??';
  const parts = name.split(' ');
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default function PropertiesPage() {
  const { user, userProfile, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [selectedTenant, setSelectedTenant] = React.useState<Tenant | null>(
    null
  );
  const [isTenantDialogOpen, setIsTenantDialogOpen] = React.useState(false);

  const isAuthorized = !isUserLoading && (userProfile?.role === 'superadmin' || userProfile?.role === 'manager');

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

  const doorCodesQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) {
      return null;
    }
    return collection(firestore, 'doorCodes');
  }, [firestore, isAuthorized]);

  const { data: doorCodes, isLoading: doorCodesLoading } = useCollection<DoorCode>(doorCodesQuery);


  const tenantsByProperty = React.useMemo(() => {
    if (!tenants) return {};
    return tenants.reduce(
      (acc, tenant) => {
        if (!acc[tenant.property]) {
          acc[tenant.property] = [];
        }
        acc[tenant.property].push(tenant);
        return acc;
      },
      {} as Record<string, Tenant[]>
    );
  }, [tenants]);

  const doorCodesByProperty = React.useMemo(() => {
    if (!doorCodes) return {};
    return doorCodes.reduce(
      (acc, code) => {
        if (!acc[code.property]) {
          acc[code.property] = [];
        }
        acc[code.property].push(code);
        return acc;
      },
      {} as Record<string, DoorCode[]>
    );
  }, [doorCodes]);

  const sortedProperties = React.useMemo(() => {
    if (!properties) return [];
    return properties
      .filter((p) => p.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [properties]);

  const handleTenantClick = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsTenantDialogOpen(true);
  };

  const pageIsLoading =
    isUserLoading || propertiesLoading || tenantsLoading || doorCodesLoading;

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
              A directory of all active managed properties.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pageError && (
              <p className="text-destructive text-center py-8">
                Error: {pageError.message}
              </p>
            )}
            {!pageIsLoading && !pageError && sortedProperties.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sortedProperties.map((property) => {
                  const propertyTenants = tenantsByProperty[property.name] || [];
                  const propertyDoorCodes =
                    doorCodesByProperty[property.name] || [];
                  
                  const activeTenants = propertyTenants.filter((tenant) => tenant.active);

                  const totalMonthlyRent = activeTenants.reduce((sum, tenant) => sum + (tenant.rent || 0), 0);
                  
                  const mortgage = property.mortgage || 0;
                  const avgExpensePerTenant = property.averageExpensePerTenant || 0;
                  const avgTotalExpenses = avgExpensePerTenant * activeTenants.length;

                  const net = totalMonthlyRent - avgTotalExpenses - mortgage;

                  return (
                    <Card
                      key={property.id}
                      className="overflow-hidden flex flex-col"
                    >
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
                      <CardContent className="flex-grow space-y-4">
                        <p className="text-sm text-muted-foreground line-clamp-4">
                          {property.description || 'No description available.'}
                        </p>
                        
                        <div className="space-y-3 pt-3 border-t">
                            <h4 className="text-sm font-semibold text-foreground">Revenue Model</h4>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Income (Rent)</span>
                                <span className="font-mono text-green-600">{moneyFormatter.format(totalMonthlyRent)}</span>
                            </div>
                             <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Avg. Expenses</span>
                                <span className="font-mono text-red-600">- {moneyFormatter.format(avgTotalExpenses)}</span>
                            </div>
                             <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Mortgage</span>
                                <span className="font-mono text-red-600">- {moneyFormatter.format(mortgage)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center font-bold">
                                <span>Projected Net</span>
                                <span className={cn('flex items-center gap-1', net >= 0 ? 'text-green-600' : 'text-red-600')}>
                                  {net >= 0 ? <TrendingUp className="h-4 w-4"/> : <TrendingDown className="h-4 w-4" />}
                                  {moneyFormatter.format(net)}
                                </span>
                            </div>
                        </div>

                      </CardContent>
                      <CardFooter className="flex-col items-start gap-2 pt-4 border-t px-0">
                        <Accordion type="multiple" className="w-full">
                          {activeTenants.length > 0 && (
                            <AccordionItem
                              value="tenants"
                              className="px-6 border-b-0"
                            >
                              <AccordionTrigger className="py-2">
                                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                  <UserIcon className="w-4 h-4" />
                                  Tenants ({activeTenants.length})
                                </h4>
                              </AccordionTrigger>
                              <AccordionContent className="pb-0">
                                <div className="w-full space-y-2 pt-2">
                                  {activeTenants.map((tenant) => (
                                    <div
                                      key={tenant.id}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      <Button
                                        variant="link"
                                        className="p-0 h-auto text-muted-foreground hover:text-primary"
                                        onClick={() => handleTenantClick(tenant)}
                                      >
                                        {tenant.name} ({tenant.room || 'N/A'})
                                        <Badge variant={tenant.active ? 'secondary' : 'outline'} className="ml-2">{tenant.active ? 'Active' : 'Inactive'}</Badge>
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )}
                          {isAuthorized && propertyDoorCodes.length > 0 && (
                            <AccordionItem
                              value="door-codes"
                              className="px-6 border-b-0"
                            >
                              <AccordionTrigger className="py-2">
                                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                  <DoorOpen className="w-4 h-4" />
                                  Door Codes ({propertyDoorCodes.length})
                                </h4>
                              </AccordionTrigger>
                              <AccordionContent className="pb-0">
                                <div className="w-full space-y-2 pt-2">
                                  {propertyDoorCodes.sort((a,b) => a.location.localeCompare(b.location, undefined, { numeric: true })).map((code) => (
                                    <div
                                      key={code.id}
                                      className="flex items-center justify-between gap-2 text-sm text-muted-foreground"
                                    >
                                      <span>{code.location}</span>
                                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                        {code.code}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )}
                        </Accordion>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            ) : (
              !pageIsLoading && (
                <div className="text-center text-muted-foreground py-8">
                  No active properties found. Admins can add properties from the Admin
                  page.
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={isTenantDialogOpen} onOpenChange={setIsTenantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tenant Information</DialogTitle>
          </DialogHeader>
          {selectedTenant && (
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={selectedTenant.photoUrl}
                    alt={selectedTenant.name}
                  />
                  <AvatarFallback>
                    {getInitials(selectedTenant.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">{selectedTenant.name}</h2>
                    <Badge variant={selectedTenant.active ? 'secondary' : 'outline'}>{selectedTenant.active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    Room: {selectedTenant.room || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-sm pt-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a
                    href={`mailto:${selectedTenant.email}`}
                    className="hover:underline"
                  >
                    {selectedTenant.email || 'No email'}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a
                    href={`tel:${selectedTenant.phone}`}
                    className="hover:underline"
                  >
                    {selectedTenant.phone || 'No phone'}
                  </a>
                </div>
                {selectedTenant.notes && (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground italic">
                      "{selectedTenant.notes}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
