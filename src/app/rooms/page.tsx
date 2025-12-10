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
  Loader2,
  Mail,
  Phone,
  DoorOpen,
  Building,
  KeyRound,
} from 'lucide-react';
import { Property } from '@/types/property';
import { Tenant } from '@/types/tenant';
import { useRouter } from 'next/navigation';
import {
  getAllDoorCodes,
  GetAllDoorCodesOutput,
} from '@/ai/flows/get-all-door-codes-flow';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { DoorCode } from '@/types/door-code';

interface RoomProfile {
  id: string;
  roomName: string;
  property: Property;
  tenant: Tenant;
  doorCodes: DoorCode[];
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
  const { data: properties, isLoading: propertiesLoading } =
    useCollection<Property>(propertiesCollectionRef);

  const tenantsCollectionRef = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'tenants') : null),
    [firestore, user]
  );
  const { data: tenants, isLoading: tenantsLoading } =
    useCollection<Tenant>(tenantsCollectionRef);

  const [allDoorCodes, setAllDoorCodes] =
    React.useState<GetAllDoorCodesOutput | null>(null);
  const [doorCodesLoading, setDoorCodesLoading] = React.useState(true);

  React.useEffect(() => {
    if (user) {
      getAllDoorCodes()
        .then(setAllDoorCodes)
        .catch(console.error)
        .finally(() => setDoorCodesLoading(false));
    }
  }, [user]);

  const groupedRoomsByProperty = React.useMemo(() => {
    if (!tenants || !properties || !allDoorCodes) {
      return {};
    }

    const flatDoorCodes = allDoorCodes.flatMap((u) => u.codes);
    const propertiesMap = new Map(properties.map((p) => [p.name, p]));

    const rooms: RoomProfile[] = tenants.map((tenant) => {
      const property = propertiesMap.get(tenant.property);
      if (!property) return null;

      // Find door codes associated with this tenant's room in this property
      const roomDoorCodes = flatDoorCodes.filter(
        (code) =>
          code.property === tenant.property &&
          (code.location.toLowerCase().includes(tenant.room.toLowerCase()) ||
            tenant.room.toLowerCase().includes(code.location.toLowerCase()))
      );

      return {
        id: tenant.id,
        roomName: tenant.room,
        property,
        tenant,
        doorCodes: roomDoorCodes,
      };
    }).filter((r): r is RoomProfile => r !== null);

    return rooms.reduce(
      (acc, room) => {
        if (!acc[room.property.name]) {
          acc[room.property.name] = [];
        }
        acc[room.property.name].push(room);
        acc[room.property.name].sort((a,b) => a.roomName.localeCompare(b.roomName, undefined, { numeric: true}));
        return acc;
      },
      {} as Record<string, RoomProfile[]>
    );
  }, [tenants, properties, allDoorCodes]);
  
  const sortedPropertyNames = React.useMemo(() => {
    return Object.keys(groupedRoomsByProperty).sort((a, b) => a.localeCompare(b));
  }, [groupedRoomsByProperty]);

  const pageIsLoading =
    isUserLoading || propertiesLoading || tenantsLoading || doorCodesLoading;

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
              A detailed overview of each room, including assigned tenant and
              door codes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pageIsLoading ? (
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            ) : sortedPropertyNames.length > 0 ? (
              <Accordion
                type="multiple"
                className="w-full"
                defaultValue={sortedPropertyNames}
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
                            {/* Tenant Info */}
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
                                    <p className="font-bold text-foreground">{room.tenant.name}</p>
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
                            
                            {/* Door Codes */}
                             {room.doorCodes.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-muted-foreground">Door Codes</h4>
                                    <div className="space-y-1">
                                        {room.doorCodes.map(code => (
                                            <div key={code.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
                                                <div className="flex items-center gap-2">
                                                    <KeyRound className="w-4 h-4 text-primary"/>
                                                    <span>{code.location}</span>
                                                </div>
                                                <span className="font-mono text-xs bg-background px-2 py-1 rounded">{code.code}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
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
    </MainLayout>
  );
}
