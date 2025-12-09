'use client';

import { useState } from 'react';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
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
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { DoorCode, DoorLockType } from '@/types/door-code';
import { format } from 'date-fns';
import backendConfig from '@/../docs/backend.json';

const lockTypes = backendConfig.entities.DoorCode.properties.doorLockType.enum as DoorLockType[];

export default function DoorCodesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<DoorCode | null>(null);
  const [formData, setFormData] = useState<{
    location: string;
    code: string;
    doorLockType: DoorLockType;
  }>({ location: '', code: '', doorLockType: 'Keypad' });

  const doorCodesCollectionRef = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'doorCodes') : null),
    [firestore, user]
  );

  const {
    data: doorCodes,
    isLoading: codesLoading,
    error,
  } = useCollection<DoorCode>(doorCodesCollectionRef);

  const handleAddClick = () => {
    setEditingCode(null);
    setFormData({ location: '', code: '', doorLockType: 'Keypad' });
    setIsDialogOpen(true);
  };

  const handleEditClick = (code: DoorCode) => {
    setEditingCode(code);
    setFormData({
      location: code.location,
      code: code.code,
      doorLockType: code.doorLockType || 'Keypad',
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
    setFormData({ location: '', code: '', doorLockType: 'Keypad' });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value: DoorLockType) => {
    setFormData((prev) => ({ ...prev, doorLockType: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.location || !formData.code) return;

    const codeData = {
      ...formData,
      lastChanged: serverTimestamp(),
    };

    if (editingCode) {
      // Update existing code
      const docRef = doc(
        firestore,
        'users',
        user.uid,
        'doorCodes',
        editingCode.id
      );
      await updateDoc(docRef, codeData);
    } else {
      // Add new code
      if (!doorCodesCollectionRef) return;
      await addDoc(doorCodesCollectionRef, codeData);
    }
    handleDialogClose();
  };

  if (isUserLoading) {
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
            {codesLoading && (
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            )}
            {error && (
              <p className="text-destructive">Error: {error.message}</p>
            )}
            {!codesLoading && !error && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Lock Type</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Last Changed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doorCodes && doorCodes.length > 0 ? (
                    doorCodes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell>{code.location}</TableCell>
                        <TableCell>{code.doorLockType}</TableCell>
                        <TableCell className="font-mono">{code.code}</TableCell>
                        <TableCell>
                          {code.lastChanged?.toDate &&
                            format(code.lastChanged.toDate(), 'PPP p')}
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
                            onClick={() => handleDeleteClick(code.id)}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        No door codes found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
                  onValueChange={handleSelectChange}
                  value={formData.doorLockType}
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
                <Label htmlFor="code" className="text-right">
                  Code
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={handleFormChange}
                  className="col-span-3"
                  required
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
