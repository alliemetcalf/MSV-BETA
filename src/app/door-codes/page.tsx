
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc } from '@/firebase';
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
import { DoorCode, DoorLockType } from '@/types/door-code';
import { Property } from '@/types/property';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function DoorCodesPage() {
  const { user, userProfile, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const isAuthorized = userProfile?.role === 'superadmin' || userProfile?.role === 'manager';

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    } else if (!isUserLoading && user && !isAuthorized) {
      router.push('/');
    }
  }, [user, userProfile, isUserLoading, isAuthorized, router]);


  const doorCodesQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) {
      return null;
    }
    return collection(firestore, 'doorCodes');
  }, [firestore, isAuthorized]);

  const { data: doorCodes, isLoading: userCodesLoading, error: userCodesError } = useCollection<DoorCode>(doorCodesQuery);
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isInstructionDialogOpen, setIsInstructionDialogOpen] = useState(false);
  const [selectedInstruction, setSelectedInstruction] = useState<DoorLockType | null>(null);
  const [editingCode, setEditingCode] = useState<DoorCode | null>(null);

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

  const lockTypesDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'siteConfiguration', 'lockTypes') : null),
    [firestore, user]
  );
  const { data: lockTypesData, isLoading: lockTypesLoading } =
    useDoc<{ types: DoorLockType[] }>(lockTypesDocRef);
  const lockTypes = lockTypesData?.types || [];

  const propertiesCollectionRef = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'properties') : null),
    [firestore, user]
  );
  const { data: propertiesData, isLoading: propertiesLoading } =
    useCollection<Property>(propertiesCollectionRef);
  const properties = propertiesData?.map(p => p.name) || [];

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
      {} as Record<string, DoorCode[]>
    );

    for (const property in grouped) {
      grouped[property].sort((a, b) =>
        a.location.localeCompare(b.location, undefined, { numeric: true })
      );
    }
    return Object.fromEntries(Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)));
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

  const handleDeleteClick = async (code: DoorCode) => {
    if (!firestore) return;
    
    if (confirm('Are you sure you want to delete this door code?')) {
      const docRef = doc(firestore, 'doorCodes', code.id);
      await deleteDoc(docRef);
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
    
    if (!firestore || !formData.location || !formData.doorLockType || !formData.property) return;
    
    const codeData: Omit<DoorCode, 'id'> = {
      ...formData,
      lastChanged: serverTimestamp() as Timestamp,
    };

    if (editingCode) {
        const docRef = doc(firestore, 'doorCodes', editingCode.id);
        await updateDoc(docRef, codeData);
    } else {
      const collectionRef = collection(firestore, 'doorCodes');
      await addDoc(collectionRef, codeData);
    }

    handleDialogClose();
  };


  if (isUserLoading || !user || !isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  const codesError = userCodesError;
  const isDataLoading = userCodesLoading || lockTypesLoading || propertiesLoading;

  return (
    <MainLayout>
      <div className="w-full max-w-6xl px-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Door Codes</CardTitle>
              <CardDescription>
                Manage your property door codes here.
              </CardDescription>
            </div>
            {(userProfile?.role === 'superadmin' || userProfile?.role === 'manager') && (
              <Button onClick={handleAddClick}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Code
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isDataLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
            {codesError && (
              <p className="text-destructive text-center py-8">Error: {codesError.message}</p>
            )}
            {!isDataLoading && !codesError && (
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
                                  {(userProfile?.role === 'superadmin' || userProfile?.role === 'manager') && (
                                    <TableHead className="text-right">
                                      Actions
                                    </TableHead>
                                  )}
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
                                      {code.lastChanged && typeof code.lastChanged === 'object' && 'toDate' in code.lastChanged &&
                                        format(
                                          (code.lastChanged as Timestamp).toDate(),
                                          'PPP p'
                                        )}
                                    </TableCell>
                                    {(userProfile?.role === 'superadmin' || userProfile?.role === 'manager') && (
                                      <TableCell className="text-right">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleEditClick(code)}
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
                                    )}
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
              Fill in the details for the door code.
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
