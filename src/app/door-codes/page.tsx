'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc, useAuth } from '@/firebase';
import Image from 'next/image';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
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
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2, PlusCircle, Edit, Trash2, Info } from 'lucide-react';
import { DoorCode, DoorLockType, PropertyType } from '@/types/door-code';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { getAllDoorCodes, GetAllDoorCodesOutput } from '@/ai/flows/get-all-door-codes-flow';
import { IdTokenResult } from 'firebase/auth';

type EnrichedDoorCode = GetAllDoorCodesOutput[0]['codes'][0] & {
  userEmail: string;
  userId: string;
};
export default function DoorCodesPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser(auth);
  const firestore = useFirestore();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [claimsLoading, setClaimsLoading] = useState(true);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isInstructionDialogOpen, setIsInstructionDialogOpen] = useState(false);
  const [selectedInstruction, setSelectedInstruction] = useState<DoorLockType | null>(null);
  const [editingCode, setEditingCode] = useState<DoorCode | null>(null);

  const [allUsersCodes, setAllUsersCodes] = useState<EnrichedDoorCode[] | null>(null);
  const [allCodesLoading, setAllCodesLoading] = useState(false);

  const [formData, setFormData] = useState<{
    location: string;
    code: string;
    adminProgrammingCode: string;
    guestCode: string;
    doorLockType: string; // Storing name
    property: PropertyType;
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

  useEffect(() => {
    if (user) {
      setClaimsLoading(true);
      user.getIdTokenResult().then((idTokenResult: IdTokenResult) => {
        const userRole = idTokenResult.claims.role;
        const isAdminUser = userRole === 'admin';
        setIsAdmin(isAdminUser);
        setClaimsLoading(false);

        if (isAdminUser) {
          setAllCodesLoading(true);
          getAllDoorCodes().then(data => {
            const enrichedCodes = data.flatMap(userWithCodes => 
              userWithCodes.codes.map(code => ({
                ...code,
                // The AI flow returns lastChanged as a string, convert it back
                lastChanged: code.lastChanged ? Timestamp.fromDate(new Date(code.lastChanged)) : null,
                userEmail: userWithCodes.email,
                userId: userWithCodes.uid,
              }))
            );
            setAllUsersCodes(enrichedCodes);
          }).finally(() => setAllCodesLoading(false));
        }
      });
    } else if (!isUserLoading) {
      setIsAdmin(false);
      setClaimsLoading(false);
    }
  }, [user, isUserLoading]);


  const doorCodesCollectionRef = useMemoFirebase(
    () => (!isAdmin && user && firestore ? collection(firestore, 'users', user.uid, 'doorCodes') : null),
    [firestore, user, isAdmin]
  );

  const {
    data: personalDoorCodes,
    isLoading: personalCodesLoading,
    error: codesError,
  } = useCollection<DoorCode>(doorCodesCollectionRef);

  const doorCodes = isAdmin ? allUsersCodes : personalDoorCodes;
  const codesLoading = isAdmin ? allCodesLoading : personalCodesLoading;

  const lockTypesDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'siteConfiguration', 'lockTypes') : null),
    [firestore, user]
  );
  const { data: lockTypesData, isLoading: lockTypesLoading } =
    useDoc<{ types: DoorLockType[] }>(lockTypesDocRef);
  const lockTypes = lockTypesData?.types || [];

  const propertiesDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'siteConfiguration', 'properties') : null),
    [firestore, user]
  );
  const { data: propertiesData, isLoading: propertiesLoading } =
    useDoc<{ options: string[] }>(propertiesDocRef);
  const properties = propertiesData?.options || [];

  const groupedDoorCodes = useMemo(() => {
    if (!doorCodes) return {};
    const grouped = doorCodes.reduce(
      (acc, code) => {
        const { property } = code;
        if (!acc[property]) {
          acc[property] = [];
        }
        acc[property].push(code);
        return acc;
      },
      {} as Record<string, (DoorCode | EnrichedDoorCode)[]>
    );

    for (const property in grouped) {
      grouped[property].sort((a, b) =>
        a.location.localeCompare(b.location, undefined, { numeric: true })
      );
    }

    return grouped;
  }, [doorCodes]);

  const handleAddClick = () => {
    setEditingCode(null);
    setFormData({
      location: '',
      code: '',
      adminProgrammingCode: '',
      guestCode: '',
      doorLockType: lockTypes[0]?.name || '',
      property: properties[0] || '',
    });
    setIsFormDialogOpen(true);
  };

  const handleEditClick = (code: DoorCode) => {
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

  const handleDeleteClick = async (code: DoorCode | EnrichedDoorCode) => {
    let userIdForDeletion = user?.uid;
    if(isAdmin && 'userId' in code) {
      userIdForDeletion = code.userId;
    }

    if (!userIdForDeletion || !firestore) return;
    
    if (confirm('Are you sure you want to delete this door code?')) {
      const docRef = doc(firestore, 'users', userIdForDeletion, 'doorCodes', code.id);
      await deleteDoc(docRef);
      if(isAdmin) {
        setAllUsersCodes(currentCodes => currentCodes?.filter(c => c.id !== code.id) || null);
      }
    }
  };
  
  const handleViewInstructions = (doorLockTypeName: string) => {
    const instruction = lockTypes.find(lt => lt.name === doorLockTypeName);
    if(instruction) {
      setSelectedInstruction(instruction);
      setIsInstructionDialogOpen(true);
    }
  }

  const handleDialogClose = () => {
    setIsFormDialogOpen(false);
    setEditingCode(null);
    setFormData({
      location: '',
      code: '',
      adminProgrammingCode: '',
      guestCode: '',
      doorLockType: '',
      property: '',
    });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange =
    (field: 'doorLockType' | 'property') => (value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let userIdForWrite = user?.uid;

    if (!userIdForWrite || !firestore || !formData.location || !formData.doorLockType || !formData.property) return;
    
    if (isAdmin && editingCode && 'userId' in editingCode) {
      userIdForWrite = editingCode.userId;
    }


    const codeData = {
      ...formData,
      lastChanged: serverTimestamp(),
    };

    if (editingCode) {
      const docRef = doc(
        firestore,
        'users',
        userIdForWrite,
        'doorCodes',
        editingCode.id
      );
      await updateDoc(docRef, codeData);
    } else {
      const collectionRef = collection(firestore, 'users', userIdForWrite, 'doorCodes');
      await addDoc(collectionRef, codeData);
    }

    if(isAdmin) {
      setAllCodesLoading(true);
      getAllDoorCodes().then(data => {
         const enrichedCodes = data.flatMap(userWithCodes => 
            userWithCodes.codes.map(code => ({
              ...code,
              lastChanged: code.lastChanged ? Timestamp.fromDate(new Date(code.lastChanged)) : null,
              userEmail: userWithCodes.email,
              userId: userWithCodes.uid,
            }))
          );
        setAllUsersCodes(enrichedCodes);
      }).finally(() => setAllCodesLoading(false));
    }
    handleDialogClose();
  };

  if (isUserLoading || claimsLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const isLoading = codesLoading || lockTypesLoading || propertiesLoading;

  return (
    <MainLayout>
      <div className="w-full max-w-6xl px-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Door Codes</CardTitle>
              <CardDescription>
                {isAdmin ? 'Viewing all user door codes as an admin.' : 'Manage your property door codes here.'}
              </CardDescription>
            </div>
            {!isAdmin && (
              <Button onClick={handleAddClick}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Code
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoading && (
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            )}
            {codesError && (
              <p className="text-destructive">Error: {codesError.message}</p>
            )}
            {!isLoading && !codesError && (
              <>
                {doorCodes && doorCodes.length > 0 ? (
                  <Accordion type="multiple" className="w-full">
                    {Object.entries(groupedDoorCodes).map(
                      ([property, codes]) => (
                        <AccordionItem value={property} key={property}>
                          <AccordionTrigger className="text-xl font-semibold">
                            {property}
                          </AccordionTrigger>
                          <AccordionContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Location</TableHead>
                                  <TableHead>Lock Type</TableHead>
                                  <TableHead>Code</TableHead>
                                  <TableHead>Admin Code</TableHead>
                                  <TableHead>Guest Code</TableHead>
                                  <TableHead>Last Changed</TableHead>
                                  <TableHead className="text-right">
                                    Actions
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {codes.map((code) => (
                                  <TableRow key={code.id}>
                                    <TableCell>{code.location}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        {code.doorLockType}
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleViewInstructions(code.doorLockType)}>
                                          <Info className="h-4 w-4 text-primary" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                    <TableCell className="font-mono">
                                      {code.code}
                                    </TableCell>
                                    <TableCell className="font-mono">
                                      {code.adminProgrammingCode}
                                    </TableCell>
                                    <TableCell className="font-mono">
                                      {code.guestCode}
                                    </TableCell>
                                    <TableCell>
                                      {code.lastChanged && 'toDate' in code.lastChanged &&
                                        format(
                                          code.lastChanged.toDate(),
                                          'PPP p'
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEditClick(code as DoorCode)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          handleDeleteClick(code)
                                        }
                                        className="text-destructive hover:text-destructive/80"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </AccordionContent>
                        </AccordionItem>
                      )
                    )}
                  </Accordion>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No door codes found. Click "Add Code" to get started.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCode ? 'Edit Door Code' : 'Add New Door Code'}
            </DialogTitle>
            <DialogDescription>
              Fill in the details for the door code. {isAdmin && editingCode && 'userId' in editingCode && `(Editing for ${'userEmail' in editingCode ? editingCode.userEmail : editingCode.userId})`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="property" className="text-right">
                  Property
                </Label>
                <Select
                  onValueChange={handleSelectChange('property')}
                  value={formData.property}
                  required
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((prop) => (
                      <SelectItem key={prop} value={prop}>
                        {prop}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <Button
                type="button"
                variant="outline"
                onClick={handleDialogClose}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
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
