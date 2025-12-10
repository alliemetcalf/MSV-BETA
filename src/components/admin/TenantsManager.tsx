'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
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
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
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
  Move,
  Info,
  XCircle,
} from 'lucide-react';
import { Tenant, PendingMove } from '@/types/tenant';
import { Property } from '@/types/property';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '../ui/progress';
import { Switch } from '@/components/ui/switch';
import { Badge } from '../ui/badge';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DateDropdowns } from '../ui/DateDropdowns';
import { format, isBefore, startOfDay, sub } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '../ui/alert';

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

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
  const [formData, setFormData] = useState<Omit<Tenant, 'id' | 'pendingMove'>>({
    name: '',
    email: '',
    phone: '',
    property: '',
    room: '',
    rent: 0,
    deposit: 0,
    notes: '',
    photoUrl: '',
    active: true,
  });

  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [moveTenant, setMoveTenant] = useState<Tenant | null>(null);
  const [moveData, setMoveData] = useState<Omit<PendingMove, 'moveDate'> & { moveDate?: Date }>({
    newProperty: '',
    newRoom: '',
    newRent: 0,
    newDeposit: 0,
  });

  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');

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
  const properties = propertiesData?.filter(p => p.active).map((p) => p.name).sort() || [];
  const allProperties = propertiesData?.map((p) => p.name).sort() || [];

  const filteredTenants = useMemo(() => {
    if (!tenants) return [];
    const sorted = [...tenants].sort((a, b) => {
      if (a.property < b.property) return -1;
      if (a.property > b.property) return 1;
      return a.name.localeCompare(b.name);
    });

    if (filter === 'active') {
      return sorted.filter((tenant) => tenant.active);
    }
    if (filter === 'inactive') {
      return sorted.filter((tenant) => !tenant.active);
    }
    return sorted;
  }, [tenants, filter]);

  const isRoomOccupied = (property: string, room: string, date: Date): boolean => {
    if (!tenants) return false;
    return tenants.some(t => 
      t.property === property && 
      t.room === room && 
      t.active &&
      (!t.leaseEnded || !isBefore(t.leaseEnded.toDate(), date))
    );
  };
  
  const handleMoveClick = (tenant: Tenant) => {
    setMoveTenant(tenant);
    setMoveData({
        newProperty: tenant.property,
        newRoom: '',
        moveDate: new Date(),
        newRent: tenant.rent,
        newDeposit: tenant.deposit || 0,
    });
    setIsMoveDialogOpen(true);
  }

  const handleScheduleMove = async () => {
    if (!firestore || !moveTenant || !moveData.moveDate) return;

    if (isRoomOccupied(moveData.newProperty, moveData.newRoom, moveData.moveDate)) {
        toast({
            variant: "destructive",
            title: "Room Occupied",
            description: `Room ${moveData.newRoom} is already occupied on the selected date.`,
        });
        return;
    }
    
    const pendingMove: PendingMove = {
        ...moveData,
        moveDate: Timestamp.fromDate(moveData.moveDate)
    };

    try {
        await updateDoc(doc(firestore, 'tenants', moveTenant.id), { pendingMove });
        toast({ title: "Move Scheduled", description: `Tenant will be moved on ${format(moveData.moveDate, 'PPP')}`});
        setIsMoveDialogOpen(false);
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const handleFinalizeMove = async (tenant: Tenant) => {
     if (!firestore || !tenant.pendingMove) return;

     const { newProperty, newRoom, moveDate, newRent, newDeposit } = tenant.pendingMove;

     if(confirm(`Are you sure you want to finalize the move for ${tenant.name} to ${newProperty}/${newRoom}?`)) {
        const batch = writeBatch(firestore);

        // 1. Deactivate old tenant record by creating a new one
        const oldTenantRef = doc(collection(firestore, 'tenants'));
        const oldTenantData: Omit<Tenant, 'id'> = {
            ...tenant,
            pendingMove: undefined,
            active: false,
            leaseEnded: Timestamp.fromDate(sub(moveDate.toDate(), { days: 1 }))
        };
        delete oldTenantData.pendingMove; // Ensure it's fully removed
        batch.set(oldTenantRef, oldTenantData);

        // 2. Update current tenant record
        const currentTenantRef = doc(firestore, 'tenants', tenant.id);
        batch.update(currentTenantRef, {
            property: newProperty,
            room: newRoom,
            rent: newRent,
            deposit: newDeposit,
            leaseEffective: moveDate,
            pendingMove: null, // Clear pending move
        });

        try {
            await batch.commit();
            toast({ title: "Move Finalized", description: `${tenant.name} has been moved successfully.`});
        } catch(e: any) {
            toast({ variant: 'destructive', title: 'Finalize Failed', description: e.message });
        }
     }
  }
  
  const handleCancelMove = async (tenant: Tenant) => {
    if (!firestore || !tenant.pendingMove) return;
    if (confirm("Are you sure you want to cancel this pending move?")) {
        try {
            await updateDoc(doc(firestore, 'tenants', tenant.id), { pendingMove: null });
            toast({ title: "Move Canceled", description: "The pending move has been canceled." });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    }
  };


  const handleAddClick = () => {
    setEditingTenant(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      property: properties[0] || '',
      room: '',
      rent: 0,
      deposit: 0,
      notes: '',
      photoUrl: '',
      active: true,
      leaseEffective: Timestamp.now(),
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
      rent: tenant.rent || 0,
      deposit: tenant.deposit || 0,
      notes: tenant.notes || '',
      photoUrl: tenant.photoUrl || '',
      active: tenant.active,
      leaseEffective: tenant.leaseEffective,
      leaseEnded: tenant.leaseEnded,
      noticeReceivedDate: tenant.noticeReceivedDate,
    });
    setIsFormDialogOpen(true);
  };

  const handleDeleteClick = async (tenantId: string) => {
    if (!firestore) return;
    if (confirm('Are you sure you want to delete this tenant? This action is permanent.')) {
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
    const { id, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'number' ? parseFloat(value) : value,
    }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, property: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, active: checked }));
  };

  const handleUploadComplete = async (url: string) => {
    setFormData((prev) => ({ ...prev, photoUrl: url }));
    if (editingTenant && firestore) {
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
      const dataToSave: Omit<Tenant, 'id' | 'pendingMove'> = {
        ...formData,
        photoUrl: formData.photoUrl || '',
        rent: Number(formData.rent) || 0,
        deposit: Number(formData.deposit) || 0,
        leaseEffective: formData.leaseEffective || Timestamp.now(),
        leaseEnded: formData.leaseEnded || undefined,
        noticeReceivedDate: formData.noticeReceivedDate || undefined,
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
        setEditingTenant({ ...dataToSave, id: newDocRef.id, pendingMove: undefined });
        toast({
          title: 'Success',
          description: 'Tenant added. You can now upload a photo.',
        });
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
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Manage Tenants</CardTitle>
              <CardDescription>
                Add, edit, or remove tenant information.
              </CardDescription>
            </div>
            <Button onClick={handleAddClick}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Tenant
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
                <RadioGroupItem value="all" id="r-all" />
                <Label htmlFor="r-all">All</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="active" id="r-active" />
                <Label htmlFor="r-active">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inactive" id="r-inactive" />
                <Label htmlFor="r-inactive">Inactive</Label>
              </div>
            </RadioGroup>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            </div>
          ) : tenantsError ? (
            <p className="text-destructive text-center py-8">
              Error: {tenantsError.message}
            </p>
          ) : filteredTenants && filteredTenants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Property / Room</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((tenant) => (
                  <TableRow key={tenant.id} className={cn(tenant.pendingMove && 'bg-amber-50')}>
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
                    <TableCell>{tenant.property} / {tenant.room}</TableCell>
                    <TableCell>
                      <div className='flex flex-col gap-1'>
                        <Badge variant={tenant.active ? 'secondary' : 'outline'}>
                          {tenant.active ? 'Active' : 'Inactive'}
                        </Badge>
                        {tenant.pendingMove && (
                            <Badge variant="outline" className="border-amber-500 text-amber-700">
                                Pending Move
                            </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                       {tenant.pendingMove && isBefore(tenant.pendingMove.moveDate.toDate(), new Date()) && tenant.active && (
                          <Button variant="outline" size="sm" onClick={() => handleFinalizeMove(tenant)} className='mr-2 border-green-600 text-green-700 hover:bg-green-100 hover:text-green-800'>Finalize Move</Button>
                       )}
                       {tenant.active && (
                        <Button variant="outline" size="icon" onClick={() => handleMoveClick(tenant)}>
                            <Move className="w-4 h-4" />
                        </Button>
                       )}
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
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No tenants found for the selected filter.
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
                    {allProperties.map((prop) => (
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
                <Label htmlFor="rent" className="text-right">
                  Rent
                </Label>
                <Input
                  id="rent"
                  type="number"
                  step="0.01"
                  value={formData.rent || ''}
                  onChange={handleFormChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="deposit" className="text-right">
                  Deposit
                </Label>
                <Input
                  id="deposit"
                  type="number"
                  step="0.01"
                  value={formData.deposit || ''}
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
                  <Label htmlFor="leaseEffective" className="text-right">Lease Effective</Label>
                  <div className="col-span-3">
                    <DateDropdowns 
                      date={formData.leaseEffective?.toDate()} 
                      setDate={(d) => setFormData(p => ({...p, leaseEffective: d ? Timestamp.fromDate(d) : undefined}))}
                    />
                  </div>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="leaseEnded" className="text-right">Lease Ended</Label>
                  <div className="col-span-3">
                     <DateDropdowns 
                      date={formData.leaseEnded?.toDate()} 
                      setDate={(d) => setFormData(p => ({...p, leaseEnded: d ? Timestamp.fromDate(d) : undefined}))}
                    />
                  </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="noticeReceivedDate" className="text-right">30 Day Notice</Label>
                  <div className="col-span-3">
                     <DateDropdowns 
                      date={formData.noticeReceivedDate?.toDate()} 
                      setDate={(d) => setFormData(p => ({...p, noticeReceivedDate: d ? Timestamp.fromDate(d) : undefined}))}
                    />
                  </div>
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

      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Move Tenant: {moveTenant?.name}</DialogTitle>
                <DialogDescription>Schedule a move to a new room or property.</DialogDescription>
                 {moveTenant?.pendingMove && (
                    <Alert variant="default" className="bg-amber-50 border-amber-200 text-amber-800">
                        <Info className="h-4 w-4 !text-amber-700" />
                        <AlertDescription>
                            This tenant has a pending move to{' '}
                            <strong>{moveTenant.pendingMove.newProperty} / {moveTenant.pendingMove.newRoom}</strong> on{' '}
                            <strong>{format(moveTenant.pendingMove.moveDate.toDate(), 'PPP')}</strong>.
                            Saving will overwrite this schedule.
                        </AlertDescription>
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-amber-700 hover:bg-amber-100" onClick={() => handleCancelMove(moveTenant)}>
                            <XCircle className="h-4 w-4"/>
                        </Button>
                    </Alert>
                )}
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="moveDate" className="text-right">Move-in Date</Label>
                    <div className='col-span-3'>
                        <DateDropdowns
                          date={moveData.moveDate}
                          setDate={(d) => setMoveData(p => ({...p, moveDate: d}))}
                          disabled={(date) => isBefore(date, startOfDay(new Date()))}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="newProperty" className="text-right">New Property</Label>
                    <Select onValueChange={v => setMoveData(p => ({...p, newProperty: v, newRoom: ''}))} value={moveData.newProperty}>
                        <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {properties.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="newRoom" className="text-right">New Room</Label>
                    <Input id="newRoom" value={moveData.newRoom} onChange={e => setMoveData(p => ({...p, newRoom: e.target.value}))} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="newRent" className="text-right">New Rent</Label>
                    <Input id="newRent" type="number" step="0.01" value={moveData.newRent} onChange={e => setMoveData(p => ({...p, newRent: parseFloat(e.target.value)}))} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="newDeposit" className="text-right">New Deposit</Label>
                    <Input id="newDeposit" type="number" step="0.01" value={moveData.newDeposit} onChange={e => setMoveData(p => ({...p, newDeposit: parseFloat(e.target.value)}))} className="col-span-3" />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsMoveDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleScheduleMove}>Schedule Move</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
