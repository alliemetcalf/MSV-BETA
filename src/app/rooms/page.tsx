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
import {
  getAllDoorCodes,
  GetAllDoorCodesOutput,
} from '@/ai/flows/get-all-door-codes-flow';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { DoorCode, DoorLockType } from '@/types/door-code';
import Image from 'next/image';
import { format } from 'date-fns';

type EnrichedDoorCode = DoorCode & {
  userId: string;
};
interface RoomProfile {
  id: string;
  roomName: string;
  property: Property;
  tenant: Tenant;
  doorCodes: EnrichedDoorCode[];
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

  // --- Dialog and Form State ---
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isInstructionDialogOpen, setIsInstructionDialogOpen] = useState(false);
  const [selectedInstruction, setSelectedInstruction] = useState<DoorLockType | null>(null);
  const [editingCode, setEditingCode] = useState<EnrichedDoorCode | null>(null);

  const [formData, setFormData] = useState<{
    location: string;
    code: string;
    adminProgrammingCode: string;
    guestCode: string;
    doorLockType: string;
    property: string;
  }>({
    location: '',
    code: '',
    adminProgrammingCode: '',
    guestCode: '',
    doorLockType: '',
    property: '',
  });

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // --- Data Fetching ---
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
    useState<GetAllDoorCodesOutput | null>(null);
  const [doorCodesLoading, setDoorCodesLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setDoorCodesLoading(true);
      getAllDoorCodes()
        .then(setAllDoorCodes)
        .catch(console.error)
        .finally(() => setDoorCodesLoading(false));
    }
  }, [user]);

  const lockTypesDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'siteConfiguration', 'lockTypes') : null),
    [firestore, user]
  );
  const { data: lockTypesData, isLoading: lockTypesLoading } =
    useDoc<{ types: DoorLockType[] }>(lockTypesDocRef);
  const lockTypes = lockTypesData?.types || [];

  // --- Data Processing ---
  const groupedRoomsByProperty = useMemo(() => {
    if (!tenants || !properties || !allDoorCodes) {
      return {};
    }

    const flatDoorCodes = allDoorCodes.flatMap((u) => u.codes.map(c => ({...c, userId: u.uid})));
    const propertiesMap = new Map(properties.map((p) => [p.name, p]));

    const rooms: RoomProfile[] = tenants
      .map((tenant) => {
        const property = propertiesMap.get(tenant.property);
        if (!property) return null;

        const roomDoorCodes = flatDoorCodes.filter((code) => {
          if (code.property !== tenant.property) return false;
          const roomIdentifier = tenant.room.toLowerCase();
          const locationIdentifier = code.location.toLowerCase();
          
          // Use a regex for a whole word match to avoid "Room 1" matching "Room 10"
          const roomRegex = new RegExp(`\\b${roomIdentifier}\\b`, 'i');
          if (roomRegex.test(locationIdentifier)) return true;

          // Fallback for simple equality
          if (roomIdentifier === locationIdentifier) return true;
          
          return false;
        });

        return {
          id: tenant.id,
          roomName: tenant.room,
          property,
          tenant,
          doorCodes: roomDoorCodes,
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
  }, [tenants, properties, allDoorCodes]);

  const sortedPropertyNames = useMemo(() => {
    return Object.keys(groupedRoomsByProperty).sort((a, b) => a.localeCompare(b));
  }, [groupedRoomsByProperty]);

  // --- Event Handlers ---
  const handleEditClick = (code: EnrichedDoorCode) => {
    setEditingCode(code);
    setFormData({
      location: code.location,
      code: code.code || '',
      adminProgrammingCode: code.adminProgrammingCode || '',
      guestCode: code.guestCode || '',
      doorLockType: code.doorLockType || '',
      property: code.property || '',
    });
    setIsFormDialogOpen(true);
  };

  const handleViewInstructions = (doorLockTypeName: string) => {
    const instruction = lockTypes.find((lt) => lt.name === doorLockTypeName);
    if (instruction) {
      setSelectedInstruction(instruction);
      setIsInstructionDialogOpen(true);
    }
  };

  const handleDialogClose = () => {
    setIsFormDialogOpen(false);
    setEditingCode(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (field: 'doorLockType' | 'property') => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !editingCode) return;

    const codeData: Omit<DoorCode, 'id'> = {
      ...formData,
      lastChanged: serverTimestamp() as Timestamp,
    };
    
    const docRef = doc(firestore, 'users', editingCode.userId, 'doorCodes', editingCode.id);
    await updateDoc(docRef, codeData);

    // Refresh all door codes data to show the update
    setDoorCodesLoading(true);
    getAllDoorCodes()
      .then(setAllDoorCodes)
      .catch(console.error)
      .finally(() => setDoorCodesLoading(false));

    handleDialogClose();
  };

  // --- Render Logic ---
  const pageIsLoading =
    isUserLoading || propertiesLoading || tenantsLoading || doorCodesLoading || lockTypesLoading;

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
                                      <div className="flex items-center gap-1">
                                        <span className="font-mono text-xs bg-background px-2 py-1 rounded">{code.code}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditClick(code)}>
                                            <Edit className="h-4 w-4"/>
                                        </Button>
                                      </div>
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

      {/* Edit Door Code Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Door Code</DialogTitle>
            <div className="text-sm text-muted-foreground">
                <div className='flex justify-between items-center'>
                    <span>Update the details for this door code.</span>
                    {editingCode && (
                        <Button variant="outline" size="sm" onClick={() => handleViewInstructions(editingCode.doorLockType)}>
                            <Info className="mr-2 h-4 w-4" />
                            View Instructions
                        </Button>
                    )}
                </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleFormSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="property" className="text-right">
                  Property
                </Label>
                <Input id="property" value={formData.property} className="col-span-3" readOnly disabled/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="location" className="text-right">
                  Location
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={handleFormChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="doorLockType" className="text-right">
                  Lock Type
                </Label>
                <Select
                  onValueChange={handleSelectChange('doorLockType')}
                  value={formData.doorLockType}
                  required
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a lock type" />
                  </SelectTrigger>
                  <SelectContent>
                    {lockTypes.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">
                  Code
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={handleFormChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="adminProgrammingCode" className="text-right">
                  Admin Code
                </Label>
                <Input
                  id="adminProgrammingCode"
                  value={formData.adminProgrammingCode}
                  onChange={handleFormChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="guestCode" className="text-right">
                  Guest Code
                </Label>
                <Input
                  id="guestCode"
                  value={formData.guestCode}
                  onChange={handleFormChange}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleDialogClose}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
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
