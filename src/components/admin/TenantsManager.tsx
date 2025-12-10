'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import {
  useUser,
  useFirestore,
  useMemoFirebase,
  useCollection,
  useAuth,
  useStorage,
} from '@/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';
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
import {
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { Property } from '@/types/property';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '../ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

function TenantImageUploader({
  tenantId,
  currentPhotoUrl,
  onUploadComplete,
}: {
  tenantId: string | undefined;
  currentPhotoUrl?: string;
  onUploadComplete: (url: string) => void;
}) {
  const storage = useStorage();
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && tenantId) {
      handleFileUpload(file);
    } else {
      toast({
        variant: 'destructive',
        title: 'Cannot Upload',
        description: 'Please save the tenant before uploading a photo.',
      });
    }
  };

  const handleFileUpload = (file: File) => {
    if (!storage || !tenantId) return;
    setIsUploading(true);
    setUploadProgress(0);

    const storageRef = ref(storage, `tenant-photos/${tenantId}/${file.name}`);
    const metadata = { contentType: file.type };
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        setIsUploading(false);
        setUploadProgress(null);
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: error.message,
        });
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          onUploadComplete(downloadURL);
          setIsUploading(false);
          setUploadProgress(null);
          toast({
            title: 'Upload Complete',
            description: 'Image has been successfully uploaded.',
          });
        });
      }
    );
  };

  return (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label htmlFor="photo" className="text-right">
        Photo
      </Label>
      <div className="col-span-3 space-y-2">
        <div
          className="relative w-24 h-24 border rounded-full flex items-center justify-center bg-muted/50 cursor-pointer hover:bg-muted overflow-hidden"
          onClick={() => fileInputRef.current?.click()}
        >
          {currentPhotoUrl ? (
            <Image
              src={currentPhotoUrl}
              alt="Tenant photo"
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground text-xs text-center">
              <UserIcon className="h-6 w-6" />
              <span>Upload</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            id="photo"
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
        </div>
        {isUploading && uploadProgress !== null && (
          <div className="flex items-center gap-2">
            <Progress value={uploadProgress} className="w-full" />
            <span className="text-sm text-muted-foreground">
              {Math.round(uploadProgress)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

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
    photoUrl: '',
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

  const propertiesCollectionRef = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'properties') : null),
    [firestore, user]
  );
  const { data: propertiesData, isLoading: propertiesLoading } =
    useCollection<Property>(propertiesCollectionRef);
  const properties = propertiesData?.map(p => p.name) || [];

  const groupedTenants = useMemo(() => {
    if (!tenants) return {};
    const grouped = tenants.reduce(
      (acc, tenant) => {
        const { property } = tenant;
        if (!acc[property]) {
          acc[property] = [];
        }
        acc[property].push(tenant);
        return acc;
      },
      {} as Record<string, Tenant[]>
    );
    // Sort tenants within each property group by name
    for (const property in grouped) {
      grouped[property].sort((a, b) => a.name.localeCompare(b.name));
    }
    // Sort properties by name
    return Object.fromEntries(Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)));
  }, [tenants]);

  const handleAddClick = () => {
    setEditingTenant(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      property: properties[0] || '',
      room: '',
      notes: '',
      photoUrl: '',
    });
    setIsFormDialogOpen(true);
  };

  const handleEditClick = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      email: tenant.email || '',
      phone: tenant.phone || '',
      property: tenant.property,
      room: tenant.room || '',
      notes: tenant.notes || '',
      photoUrl: tenant.photoUrl || '',
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

  const handleUploadComplete = async (url: string) => {
    setFormData((prev) => ({ ...prev, photoUrl: url }));
    if(editingTenant && firestore){
        const docRef = doc(firestore, 'tenants', editingTenant.id);
        await updateDoc(docRef, { photoUrl: url });
        toast({ title: 'Success', description: 'Tenant photo updated.' });
    }
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
      const dataToSave = {
          ...formData,
          photoUrl: formData.photoUrl || ''
      };
      if (editingTenant) {
        const docRef = doc(firestore, 'tenants', editingTenant.id);
        await updateDoc(docRef, dataToSave);
        toast({ title: 'Success', description: 'Tenant updated.' });
      } else {
        const newDocRef = await addDoc(
          collection(firestore, 'tenants'),
          dataToSave
        );
        setEditingTenant({ ...dataToSave, id: newDocRef.id });
        toast({ title: 'Success', description: 'Tenant added. You can now upload a photo.' });
        return;
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
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            </div>
          ) : tenantsError ? (
            <p className="text-destructive text-center py-8">Error: {tenantsError.message}</p>
          ) : tenants && tenants.length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {Object.entries(groupedTenants).map(([property, tenantList]) => (
                <AccordionItem value={property} key={property}>
                  <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                    {property} ({tenantList.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Room</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tenantList.map((tenant) => (
                          <TableRow key={tenant.id}>
                            <TableCell className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0">
                                {tenant.photoUrl ? (
                                  <Image
                                    src={tenant.photoUrl}
                                    alt={tenant.name}
                                    width={32}
                                    height={32}
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <UserIcon className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              {tenant.name}
                            </TableCell>
                            <TableCell>{tenant.room}</TableCell>
                            <TableCell>{tenant.email}</TableCell>
                            <TableCell>{tenant.phone}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditClick(tenant)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(tenant.id)}
                                className="text-destructive hover:text-destructive/80"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
             <div className="text-center text-muted-foreground py-8">
                No tenants found. Click "Add Tenant" to get started.
             </div>
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
              <TenantImageUploader
                tenantId={editingTenant?.id}
                currentPhotoUrl={formData.photoUrl}
                onUploadComplete={handleUploadComplete}
              />
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
                  value={formData.room || ''}
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
                  value={formData.email || ''}
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
                  value={formData.phone || ''}
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
                  value={formData.notes || ''}
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
                {editingTenant ? 'Close' : 'Cancel'}
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
