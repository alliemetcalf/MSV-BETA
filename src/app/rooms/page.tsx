'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  useUser,
  useFirestore,
  useMemoFirebase,
  useCollection,
  useDoc,
  useAuth,
} from '@/firebase';
import {
  collection,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Mail,
  Phone,
  Building,
  KeyRound,
  Edit,
  Info,
} from 'lucide-react';
import { Property } from '@/types/property';
import { Tenant } from '@/types/tenant';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { DoorCode, DoorLockType } from '@/types/door-code';
import Image from 'next/image';
import { format } from 'date-fns';

interface RoomProfile {
  id: string;
  roomName: string;
  property: Property;
  tenant: Tenant;
}

function getInitials(name: string) {
  if (!name) return '??';
  const parts = name.split(' ');
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default function RoomsPage() {
  const { user, userProfile, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [isInstructionDialogOpen, setIsInstructionDialogOpen] = useState(false);
  const [selectedInstruction, setSelectedInstruction] = useState<DoorLockType | null>(null);

  useEffect(() => {
    if (!isUserLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      // Added contractor to authorized roles
      const authorized = userProfile?.role === 'superadmin' || userProfile?.role === 'manager' || userProfile?.role === 'user' || userProfile?.role === 'contractor';
      if (authorized) {
        setIsAuthorized(true);
      } else {
        router.push('/');
      }
    }
  }, [user, userProfile, isUserLoading, router]);

  // --- Data Fetching ---
  const propertiesCollectionRef = useMemoFirebase(
    () => (isAuthorized && firestore ? collection(firestore, 'properties') : null),
    [firestore, isAuthorized]
  );
  const { data: properties, isLoading: propertiesLoading } =
    useCollection<Property>(propertiesCollectionRef);

  const tenantsCollectionRef = useMemoFirebase(
    () => (isAuthorized && firestore ? collection(firestore, 'tenants') : null),
    [firestore, isAuthorized]
  );
  const { data: tenants, isLoading: tenantsLoading } =
    useCollection<Tenant>(tenantsCollectionRef);

  const lockTypesDocRef = useMemoFirebase(
    () => (isAuthorized && firestore ? doc(firestore, 'siteConfiguration', 'lockTypes') : null),
    [firestore, isAuthorized]
  );
  const { data: lockTypesData, isLoading: lockTypesLoading } =
    useDoc<{ types: DoorLockType[] }>(lockTypesDocRef);
  const lockTypes = lockTypesData?.types || [];

  // --- Data Processing ---
  const groupedRoomsByProperty = useMemo(() => {
    if (!tenants || !properties) {
      return {};
    }
    
    // Only consider active properties
    const activeProperties = properties.filter(p => p.active);
    const activePropertiesMap = new Map(activeProperties.map((p) => [p.name, p]));

    const rooms: RoomProfile[] = tenants
      .map((tenant) => {
        const property = activePropertiesMap.get(tenant.property);
        if (!property) return null; // This will filter out rooms in inactive properties

        return {
          id: tenant.id,
          roomName: tenant.room,
          property,
          tenant,
        };
      })
      .filter((r): r is RoomProfile => r !== null);

    return rooms.reduce(
      (acc, room) => {
        if (!acc[room.property.name]) {
          acc[room.property.name] = [];
        }
        acc[room.property.name].push(room);
        acc[room.property.name].sort((a, b) =>
          a.roomName.localeCompare(b.roomName, undefined, { numeric: true })
        );
        return acc;
      },
      {} as Record<string, RoomProfile[]>
    );
  }, [tenants, properties]);

  const sortedPropertyNames = useMemo(() => {
    return Object.keys(groupedRoomsByProperty).sort((a, b) => a.localeCompare(b));
  }, [groupedRoomsByProperty]);

  // --- Render Logic ---
  const pageIsLoading =
    isUserLoading || !isAuthorized || propertiesLoading || tenantsLoading || lockTypesLoading;

  if (pageIsLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="w-full max-w-6xl px-4">
        <Card>
          <CardHeader>
            <CardTitle>Room Profiles</CardTitle>
            <CardDescription>
              A detailed overview of each room and its assigned tenant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pageIsLoading ? (
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            ) : sortedPropertyNames.length > 0 ? (
              <Accordion
                type="multiple"
                className="w-full"
              >
                {sortedPropertyNames.map((propertyName) => (
                  <AccordionItem value={propertyName} key={propertyName}>
                    <AccordionTrigger className="text-2xl font-bold">
                      <div className="flex items-center gap-2">
                        <Building className="h-6 w-6 text-primary" />
                        {propertyName}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="grid gap-6 pt-4 md:grid-cols-2 xl:grid-cols-3">
                      {groupedRoomsByProperty[propertyName].map((room) => (
                        <Card key={room.id} className="flex flex-col">
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <span>Room: {room.roomName}</span>
                              <Badge variant="secondary">{room.property.name}</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="flex-grow space-y-4">
                            <div className="space-y-2">
                              <h4 className="font-semibold text-muted-foreground">Tenant</h4>
                              <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16">
                                  <AvatarImage
                                    src={room.tenant.photoUrl}
                                    alt={room.tenant.name}
                                  />
                                  <AvatarFallback>
                                    {getInitials(room.tenant.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1 text-sm">
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-foreground">{room.tenant.name}</p>
                                    <Badge variant={room.tenant.active ? 'secondary' : 'outline'}>
                                      {room.tenant.active ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="w-4 h-4"/>
                                    <a href={`mailto:${room.tenant.email}`} className="hover:underline">{room.tenant.email}</a>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Phone className="w-4 h-4"/>
                                    <a href={`tel:${room.tenant.phone}`} className="hover:underline">{room.tenant.phone}</a>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No rooms with assigned tenants found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* View Instructions Dialog */}
      <Dialog open={isInstructionDialogOpen} onOpenChange={setIsInstructionDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedInstruction?.name} - Instructions</DialogTitle>
          </DialogHeader>
          {selectedInstruction && (
             <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
               <div>
                  <h3 className="font-semibold mb-2">Text Instructions</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedInstruction.textInstructions || "No text instructions provided."}
                  </p>
               </div>
                {selectedInstruction.instructionImageUrl && (
                  <div>
                    <h3 className="font-semibold mb-2">Instruction Sheet</h3>
                     <div className="relative w-full aspect-video">
                        <Image 
                          src={selectedInstruction.instructionImageUrl}
                          alt={`${selectedInstruction.name} instruction sheet`}
                          fill
                          className="object-contain rounded-md border"
                        />
                      </div>
                  </div>
                )}
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
