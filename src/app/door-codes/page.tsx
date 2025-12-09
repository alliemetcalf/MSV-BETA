'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useCollection, useDoc } from '@/firebase/firestore/use-collection';
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
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { DoorCode, DoorLockType, PropertyType } from '@/types/door-code';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function DoorCodesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<DoorCode | null>(null);
  const [formData, setFormData] = useState<{
    location: string;
    adminProgrammingCode: string;
    guestCode: string;
    doorLockType: DoorLockType;
    property: PropertyType;
  }>({
    location: '',
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

  const doorCodesCollectionRef = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'doorCodes') : null),
    [firestore, user]
  );

  const {
    data: doorCodes,
    isLoading: codesLoading,
    error: codesError,
  } = useCollection<DoorCode>(doorCodesCollectionRef);

  const lockTypesDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'siteConfiguration', 'lockTypes') : null),
    [firestore, user]
  );
  const { data: lockTypesData, isLoading: lockTypesLoading } =
    useDoc<{ options: string[] }>(lockTypesDocRef);
  const lockTypes = lockTypesData?.options || [];

  const propertiesDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'siteConfiguration', 'properties') : null),
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
      {} as Record<string, DoorCode[]>
    );

    // Sort codes within each property group by location using natural sort
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
      adminProgrammingCode: '',
      guestCode: '',
      doorLockType: lockTypes[0] || '',
      property: properties[0] || '',
    });
    setIsDialogOpen(true);
  };

  const handleEditClick = (code: DoorCode) => {
    setEditingCode(code);
    setFormData({
      location: code.location,
      adminProgrammingCode: code.adminProgrammingCode || '',
      guestCode: code.guestCode || '',
      doorLockType: code.doorLockType || '',
      property: code.property || '',
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = async (codeId: string) => {
    if (!user) return;
    if (confirm('Are you sure you want to delete this door code?')) {
      const docRef = doc(firestore, 'users', user.uid, 'doorCodes', codeId);
      await deleteDoc(docRef);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingCode(null);
    setFormData({
      location: '',
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
    if (
      !user ||
      !formData.location ||
      !formData.doorLockType ||
      !formData.property
    )
      return;

    const codeData = {
      ...formData,
      lastChanged: serverTimestamp(),
    };

    if (editingCode) {
      const docRef = doc(
        firestore,
        'users',
        user.uid,
        'doorCodes',
        editingCode.id
      );
      await updateDoc(docRef, codeData);
    } else {
      if (!doorCodesCollectionRef) return;
      await addDoc(doorCodesCollectionRef, codeData);
    }
    handleDialogClose();
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const isLoading = codesLoading || lockTypesLoading || propertiesLoading;

  return (
    <MainLayout>
      <div className="w-full max-w-4xl px-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Door Codes</CardTitle>
              <CardDescription>
                Manage your property door codes here.
              </CardDescription>
            </div>
            <Button onClick={handleAddClick}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Code
            </Button>
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
                                    <TableCell>{code.doorLockType}</TableCell>
                                    <TableCell className="font-mono">
                                      {code.adminProgrammingCode}
                                    </TableCell>
                                    <TableCell className="font-mono">
                                      {code.guestCode}
                                    </TableCell>
                                    <TableCell>
                                      {code.lastChanged?.toDate &&
                                        format(
                                          code.lastChanged.toDate(),
                                          'PPP p'
                                        )}
                                    </TableCell>
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
                                          handleDeleteClick(code.id)
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                    {properties.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
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
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
    </MainLayout>
  );
}
