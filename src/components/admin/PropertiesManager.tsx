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
  writeBatch,
  getDocs,
  query,
  where,
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
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  Building,
} from 'lucide-react';
import { Property } from '@/types/property';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '../ui/progress';
import { DoorCode } from '@/types/door-code';
import { Tenant } from '@/types/tenant';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';


const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function PropertyImageUploader({
  propertyId,
  currentPhotoUrl,
  onUploadComplete,
}: {
  propertyId: string | undefined;
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
    if (file && propertyId) {
      handleFileUpload(file);
    } else {
      toast({
        variant: 'destructive',
        title: 'Cannot Upload',
        description: 'Please save the property before uploading a photo.',
      });
    }
  };

  const handleFileUpload = (file: File) => {
    if (!storage || !propertyId) return;
    setIsUploading(true);
    setUploadProgress(0);

    const storageRef = ref(storage, `property-photos/${propertyId}/${file.name}`);
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
    <div className="grid grid-cols-4 items-start gap-4">
      <Label htmlFor="photo" className="text-right pt-2">
        Photo
      </Label>
      <div className="col-span-3 space-y-2">
        <div
          className="relative w-full aspect-video border rounded-md flex items-center justify-center bg-muted/50 cursor-pointer hover:bg-muted overflow-hidden"
          onClick={() => fileInputRef.current?.click()}
        >
          {currentPhotoUrl ? (
            <Image
              src={currentPhotoUrl}
              alt="Property photo"
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground text-center">
              <Building className="h-8 w-8" />
              <span>Upload Photo</span>
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


export function PropertiesManager() {
  const auth = useAuth();
  const { user } = useUser(auth);
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState<Omit<Property, 'id'>>({
    name: '',
    address: '',
    description: '',
    photoUrl: '',
    mortgage: 0,
    averageExpensePerTenant: 0,
    active: true,
  });
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');

  const propertiesCollectionRef = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'properties') : null),
    [firestore, user]
  );
  const {
    data: properties,
    isLoading: propertiesLoading,
    error: propertiesError,
  } = useCollection<Property>(propertiesCollectionRef);

  const filteredProperties = useMemo(() => {
    if (!properties) return [];
    const sorted = [...properties].sort((a, b) => a.name.localeCompare(b.name));

    if (filter === 'active') {
      return sorted.filter((prop) => prop.active);
    }
    if (filter === 'inactive') {
      return sorted.filter((prop) => !prop.active);
    }
    return sorted;
  }, [properties, filter]);

  // --- Start of Migration Logic ---
  const [isMigrating, setIsMigrating] = React.useState(false);
  const hasRunMigration = React.useRef(false);

  useEffect(() => {
    const runMigration = async () => {
      if (!firestore || !user || hasRunMigration.current || properties === null) return;
      
      hasRunMigration.current = true;
      setIsMigrating(true);

      try {
        // 1. Get all unique property names from door codes and tenants
        const doorCodesSnapshot = await getDocs(collection(firestore, 'doorCodes'));
        const tenantsSnapshot = await getDocs(collection(firestore, 'tenants'));

        const propertyNames = new Set<string>();

        tenantsSnapshot.forEach(doc => {
            const tenant = doc.data() as Tenant;
            if (tenant.property) propertyNames.add(tenant.property);
        });

        doorCodesSnapshot.forEach(doc => {
            const code = doc.data() as DoorCode;
            if (code.property) propertyNames.add(code.property);
        });
        
        const existingPropertyNames = new Set(properties?.map(p => p.name) || []);
        const namesToMigrate = [...propertyNames].filter(name => !existingPropertyNames.has(name));

        if (namesToMigrate.length > 0) {
          const batch = writeBatch(firestore);
          namesToMigrate.forEach(name => {
            const newPropertyRef = doc(collection(firestore, 'properties'));
            batch.set(newPropertyRef, { name: name, address: '', description: '', photoUrl: '', mortgage: 0, active: true });
          });
          await batch.commit();
          toast({
            title: "Properties Migrated",
            description: `Successfully created ${namesToMigrate.length} new property profiles.`,
          });
        }
      } catch (e) {
        console.error("Migration failed:", e);
        toast({ variant: 'destructive', title: "Migration Failed", description: "Could not migrate old property data." });
      } finally {
        setIsMigrating(false);
      }
    };
    
    // Only run migration after initial load is complete
    if(!propertiesLoading && properties !== undefined){
       runMigration();
    }

  }, [firestore, user, properties, propertiesLoading, toast]);
  // --- End of Migration Logic ---

  const handleAddClick = () => {
    setEditingProperty(null);
    setFormData({
      name: '',
      address: '',
      description: '',
      photoUrl: '',
      mortgage: 0,
      averageExpensePerTenant: 0,
      active: true,
    });
    setIsFormDialogOpen(true);
  };

  const handleEditClick = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      name: property.name,
      address: property.address || '',
      description: property.description || '',
      photoUrl: property.photoUrl || '',
      mortgage: property.mortgage || 0,
      averageExpensePerTenant: property.averageExpensePerTenant || 0,
      active: property.active === false ? false : true, // default to true if undefined
    });
    setIsFormDialogOpen(true);
  };

  const handleDeleteClick = async (propertyId: string) => {
    if (!firestore) return;
    if (confirm('Are you sure you want to delete this property? This cannot be undone.')) {
      try {
        const docRef = doc(firestore, 'properties', propertyId);
        await deleteDoc(docRef);
        toast({ title: 'Success', description: 'Property deleted.' });
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
    setEditingProperty(null);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({ 
        ...prev, 
        [id]: type === 'number' ? parseFloat(value) : value 
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, active: checked }));
  };

  const handleUploadComplete = async (url: string) => {
    setFormData((prev) => ({ ...prev, photoUrl: url }));
    if(editingProperty && firestore){
        const docRef = doc(firestore, 'properties', editingProperty.id);
        await updateDoc(docRef, { photoUrl: url });
        toast({ title: 'Success', description: 'Property photo updated.' });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !formData.name) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Name is required.',
      });
      return;
    }

    try {
      const dataToSave: Omit<Property, 'id'> = {
          name: formData.name,
          address: formData.address || '',
          description: formData.description || '',
          photoUrl: formData.photoUrl || '',
          mortgage: Number(formData.mortgage) || 0,
          averageExpensePerTenant: Number(formData.averageExpensePerTenant) || 0,
          active: formData.active,
      };

      if (editingProperty) {
        const docRef = doc(firestore, 'properties', editingProperty.id);
        await updateDoc(docRef, dataToSave);
        toast({ title: 'Success', description: 'Property updated.' });
      } else {
        const newDocRef = await addDoc(
          collection(firestore, 'properties'),
          dataToSave
        );
        setEditingProperty({ ...dataToSave, id: newDocRef.id });
        toast({ title: 'Success', description: 'Property added. You can now upload a photo.' });
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

  const isLoading = propertiesLoading || isMigrating;

  return (
    <>
      <Card>
        <CardHeader>
             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                 <div>
                    <CardTitle>Manage Properties</CardTitle>
                    <CardDescription>
                    Add, edit, or remove property profiles.
                    </CardDescription>
                </div>
                <Button onClick={handleAddClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Property
                </Button>
            </div>
        </CardHeader>
        <CardContent>
             <div className="flex items-center justify-end mb-4">
                <RadioGroup
                defaultValue="active"
                onValueChange={(value: 'all' | 'active' | 'inactive') => setFilter(value)}
                className="flex items-center space-x-4"
                >
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="p-all" />
                    <Label htmlFor="p-all">All</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="active" id="p-active" />
                    <Label htmlFor="p-active">Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="inactive" id="p-inactive" />
                    <Label htmlFor="p-inactive">Inactive</Label>
                </div>
                </RadioGroup>
            </div>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            </div>
          ) : propertiesError ? (
            <p className="text-destructive text-center py-8">Error: {propertiesError.message}</p>
          ) : filteredProperties && filteredProperties.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProperties.map((prop) => (
                  <TableRow key={prop.id}>
                     <TableCell className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-md bg-muted overflow-hidden flex-shrink-0">
                          {prop.photoUrl ? (
                            <Image
                              src={prop.photoUrl}
                              alt={prop.name}
                              width={40}
                              height={40}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        {prop.name}
                      </TableCell>
                    <TableCell>{prop.address}</TableCell>
                     <TableCell>
                      <Badge variant={prop.active ? 'secondary' : 'outline'}>
                        {prop.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(prop)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(prop.id)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
             <div className="text-center text-muted-foreground py-8">
                No properties found for this filter.
             </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProperty ? 'Edit Property' : 'Add New Property'}
            </DialogTitle>
            <DialogDescription>
              Fill in the details for the property profile.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit}>
            <div className="grid gap-4 py-4">
              <PropertyImageUploader
                propertyId={editingProperty?.id}
                currentPhotoUrl={formData.photoUrl}
                onUploadComplete={handleUploadComplete}
              />
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="active" className="text-right">
                  Active
                </Label>
                <div className="col-span-3 flex items-center">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={handleSwitchChange}
                  />
                </div>
              </div>
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
                <Label htmlFor="address" className="text-right">
                  Address
                </Label>
                <Input
                  id="address"
                  value={formData.address || ''}
                  onChange={handleFormChange}
                  className="col-span-3"
                />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="mortgage" className="text-right">
                  Mortgage
                </Label>
                <Input
                  id="mortgage"
                  type="number"
                  step="0.01"
                  value={formData.mortgage || ''}
                  onChange={handleFormChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="averageExpensePerTenant" className="text-right">
                  Avg. Expense / Tenant
                </Label>
                <Input
                  id="averageExpensePerTenant"
                  type="number"
                  step="0.01"
                  value={formData.averageExpensePerTenant || ''}
                  onChange={handleFormChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right pt-2">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={handleFormChange}
                  className="col-span-3"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleDialogClose}
              >
                {editingProperty ? 'Close' : 'Cancel'}
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

    