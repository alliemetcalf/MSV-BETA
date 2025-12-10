'use client';

import { useState, useEffect, useMemo } from 'react';
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
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
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
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { useToast } from '@/hooks/use-toast';

export function TenantsManager() {
  const auth = useAuth();
  const { user } = useUser(auth);
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState<Omit<Tenant, 'id'>>({
    name: '',
    email: '',
    phone: '',
    property: '',
    room: '',
    notes: '',
  });

  const tenantsCollectionRef = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'tenants') : null),
    [firestore, user]
  );
  const {
    data: tenants,
    isLoading: tenantsLoading,
    error: tenantsError,
  } = useCollection<Tenant>(tenantsCollectionRef);

  const propertiesDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'siteConfiguration', 'properties') : null),
    [firestore, user]
  );
  const { data: propertiesData, isLoading: propertiesLoading } =
    useDoc<{ options: string[] }>(propertiesDocRef);
  const properties = propertiesData?.options || [];

  const handleAddClick = () => {
    setEditingTenant(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      property: properties[0] || '',
      room: '',
      notes: '',
    });
    setIsFormDialogOpen(true);
  };

  const handleEditClick = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      property: tenant.property,
      room: tenant.room,
      notes: tenant.notes,
    });
    setIsFormDialogOpen(true);
  };

  const handleDeleteClick = async (tenantId: string) => {
    if (!firestore) return;
    if (confirm('Are you sure you want to delete this tenant?')) {
      try {
        const docRef = doc(firestore, 'tenants', tenantId);
        await deleteDoc(docRef);
        toast({ title: 'Success', description: 'Tenant deleted.' });
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: e.message,
        });
      }
    }
  };

  const handleDialogClose = () => {
    setIsFormDialogOpen(false);
    setEditingTenant(null);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, property: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !formData.name || !formData.property) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Name and Property are required.',
      });
      return;
    }

    try {
      if (editingTenant) {
        const docRef = doc(firestore, 'tenants', editingTenant.id);
        await updateDoc(docRef, formData);
        toast({ title: 'Success', description: 'Tenant updated.' });
      } else {
        await addDoc(collection(firestore, 'tenants'), formData);
        toast({ title: 'Success', description: 'Tenant added.' });
      }
      handleDialogClose();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: e.message,
      });
    }
  };

  const isLoading = tenantsLoading || propertiesLoading;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manage Tenants</CardTitle>
            <CardDescription>
              Add, edit, or remove tenant information.
            </CardDescription>
          </div>
          <Button onClick={handleAddClick}>
            <PlusCircle className="mr-2" />
            Add Tenant
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && <Loader2 className="mx-auto h-8 w-8 animate-spin" />}
          {tenantsError && (
            <p className="text-destructive">Error: {tenantsError.message}</p>
          )}
          {!isLoading && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants && tenants.length > 0 ? (
                  tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>{tenant.name}</TableCell>
                      <TableCell>{tenant.property}</TableCell>
                      <TableCell>{tenant.room}</TableCell>
                      <TableCell>{tenant.email}</TableCell>
                      <TableCell>{tenant.phone}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(tenant)}
                        >
                          <Edit />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(tenant.id)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      No tenants found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTenant ? 'Edit Tenant' : 'Add New Tenant'}
            </DialogTitle>
            <DialogDescription>
              Fill in the details for the tenant.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="property" className="text-right">
                  Property
                </Label>
                <Select
                  onValueChange={handleSelectChange}
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
                <Label htmlFor="room" className="text-right">
                  Room #
                </Label>
                <Input
                  id="room"
                  value={formData.room}
                  onChange={handleFormChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleFormChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
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
    </>
  );
}
