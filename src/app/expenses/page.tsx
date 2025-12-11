'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  useUser,
  useFirestore,
  useMemoFirebase,
  useCollection,
  useDoc,
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
  setDoc,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Loader2, PlusCircle, Edit, Trash2, Paperclip, X, CalendarIcon } from 'lucide-react';
import { Expense, ExpenseCategory, Vendor } from '@/types/expense';
import { Property } from '@/types/property';
import { Tenant } from '@/types/tenant';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';


const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const NONE_VALUE = '_NONE_';
const CREATE_NEW_VALUE = '_CREATE_NEW_';

export default function ExpensesPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser(auth);
  const firestore = useFirestore();
  const storage = useStorage();
  const router = useRouter();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [isSavingVendor, setIsSavingVendor] = useState(false);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [formData, setFormData] = useState<{
    date: Date;
    amount: string;
    description: string;
    category: string;
    vendor: string;
    property: string;
    room: string;
    receiptUrl?: string;
  }>({
    date: new Date(),
    amount: '',
    description: '',
    category: '',
    vendor: '',
    property: '',
    room: '',
    receiptUrl: '',
  });

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const expensesCollectionRef = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'expenses') : null),
    [firestore, user]
  );
  const { data: expenses, isLoading: expensesLoading, error: expensesError } =
    useCollection<Expense>(expensesCollectionRef);

  const categoriesDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'siteConfiguration', 'expenseCategories') : null),
    [firestore, user]
  );
  const { data: categoriesData, isLoading: categoriesLoading } = useDoc<{ categories: ExpenseCategory[] }>(categoriesDocRef);
  const categories = useMemo(() => categoriesData?.categories || [], [categoriesData]);

  const vendorsDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'siteConfiguration', 'vendors') : null),
    [firestore, user]
  );
  const { data: vendorsData, isLoading: vendorsLoading } = useDoc<{ vendors: Vendor[] }>(vendorsDocRef);
  const vendors = useMemo(() => vendorsData?.vendors.sort((a,b) => a.name.localeCompare(b.name)) || [], [vendorsData]);


  const propertiesCollectionRef = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'properties') : null),
    [firestore, user]
  );
  const { data: properties, isLoading: propertiesLoading } = useCollection<Property>(propertiesCollectionRef);
  const propertyNames = useMemo(() => properties?.map(p => p.name).sort() || [], [properties]);

  const tenantsCollectionRef = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'tenants') : null),
    [firestore, user]
  );
  const { data: tenants, isLoading: tenantsLoading } = useCollection<Tenant>(tenantsCollectionRef);
  
  const availableRooms = useMemo(() => {
    const allRooms = new Set<string>();
    if (formData.property && tenants) {
        tenants.forEach(tenant => {
            if (tenant.property === formData.property && tenant.room) {
                allRooms.add(tenant.room);
            }
        });
    }
    return Array.from(allRooms).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [formData.property, tenants]);

  const sortedExpenses = useMemo(() => {
    if (!expenses) return [];
    return [...expenses].sort((a, b) => b.date.toMillis() - a.date.toMillis());
  }, [expenses]);


  const handleAddClick = () => {
    setEditingExpense(null);
    setFormData({
      date: new Date(),
      amount: '',
      description: '',
      category: '',
      vendor: '',
      property: '',
      room: '',
      receiptUrl: '',
    });
    setIsFormOpen(true);
  };

  const handleEditClick = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      date: expense.date.toDate(),
      amount: String(expense.amount),
      description: expense.description,
      category: expense.category,
      vendor: expense.vendor || '',
      property: expense.property || '',
      room: expense.room || '',
      receiptUrl: expense.receiptUrl || '',
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (expense: Expense) => {
    setExpenseToDelete(expense);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!firestore || !expenseToDelete) return;
    try {
      if (expenseToDelete.receiptUrl && storage) {
        const receiptRef = ref(storage, expenseToDelete.receiptUrl);
        await deleteObject(receiptRef).catch(e => console.warn("Could not delete old receipt:", e));
      }
      await deleteDoc(doc(firestore, 'expenses', expenseToDelete.id));
      toast({ title: 'Expense Deleted', description: 'The expense has been successfully removed.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error Deleting', description: 'Could not delete the expense.' });
    } finally {
      setIsConfirmDialogOpen(false);
      setExpenseToDelete(null);
    }
  };


  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { date, category } = formData;
    if (!firestore || !user || !date || !category) {
      toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill out all required fields.' });
      return;
    }
    setIsSubmitting(true);

    const amount = parseFloat(formData.amount);
    if (isNaN(amount)) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid number for the amount.' });
      setIsSubmitting(false);
      return;
    }

    const expenseDate = formData.date;

    const dataToSave = {
      date: Timestamp.fromDate(expenseDate),
      amount,
      description: formData.description,
      category: formData.category,
      vendor: formData.vendor === NONE_VALUE ? null : formData.vendor,
      property: formData.property === NONE_VALUE ? null : formData.property,
      room: formData.room === NONE_VALUE ? null : formData.room,
      receiptUrl: formData.receiptUrl || null,
    };

    try {
      if (editingExpense) {
        await updateDoc(doc(firestore, 'expenses', editingExpense.id), dataToSave);
        toast({ title: 'Expense Updated', description: 'Your changes have been saved.' });
      } else {
        await addDoc(collection(firestore, 'expenses'), dataToSave);
        toast({ title: 'Expense Added', description: 'The new expense has been recorded.' });
      }
      setIsFormOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the expense.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleReceiptUpload = async (file: File) => {
    if (!storage || !user) return;
    setIsUploading(true);
    setUploadProgress(0);

    const storageRef = ref(storage, `receipts/${user.uid}/${Date.now()}-${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload receipt.' });
        setIsUploading(false);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setFormData(prev => ({...prev, receiptUrl: downloadURL}));
          setIsUploading(false);
        });
      }
    );
  };
  
  const handleReceiptDelete = async () => {
    if (!storage || !formData.receiptUrl) return;
    if (!confirm('Are you sure you want to remove this receipt?')) return;
    
    const receiptRef = ref(storage, formData.receiptUrl);
    try {
      await deleteObject(receiptRef);
      setFormData(prev => ({...prev, receiptUrl: ''}));
      toast({ title: 'Receipt Removed' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not remove receipt.' });
    }
  }

  const handleVendorSelectChange = (value: string) => {
    if (value === CREATE_NEW_VALUE) {
        setIsVendorDialogOpen(true);
    } else {
        setFormData(p => ({ ...p, vendor: value }));
    }
  };
  
  const handleSaveNewVendor = async () => {
    if (!vendorsDocRef || !newVendorName.trim()) {
        toast({ variant: 'destructive', title: 'Invalid Name', description: 'Vendor name cannot be empty.' });
        return;
    }
    if (vendors.some(v => v.name.toLowerCase() === newVendorName.trim().toLowerCase())) {
        toast({ variant: 'destructive', title: 'Duplicate Vendor', description: 'This vendor already exists.' });
        return;
    }
    setIsSavingVendor(true);
    try {
        const newVendor: Vendor = { id: new Date().toISOString(), name: newVendorName.trim() };
        const updatedVendors = [...vendors, newVendor].sort((a,b) => a.name.localeCompare(b.name));
        await setDoc(vendorsDocRef, { vendors: updatedVendors }, { merge: true });
        toast({ title: 'Vendor Added', description: `Successfully added "${newVendor.name}".` });
        setFormData(p => ({ ...p, vendor: newVendor.name }));
        setNewVendorName('');
        setIsVendorDialogOpen(false);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save the new vendor.' });
    } finally {
        setIsSavingVendor(false);
    }
  };

  const isLoading = isUserLoading || expensesLoading || categoriesLoading || propertiesLoading || tenantsLoading || vendorsLoading;

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <MainLayout>
        <div className="w-full max-w-6xl px-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Expenses</CardTitle>
                <CardDescription>Track and manage all business expenses.</CardDescription>
              </div>
              <Button onClick={handleAddClick}><PlusCircle className="mr-2 h-4 w-4" />Add Expense</Button>
            </CardHeader>
            <CardContent>
              {expensesError && <p className="text-destructive text-center py-8">Error: {expensesError.message}</p>}
              {!expensesError && sortedExpenses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Property/Room</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedExpenses.map(expense => (
                      <TableRow key={expense.id}>
                        <TableCell>{expense.date.toDate().toLocaleDateString()}</TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>{expense.vendor}</TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell>{expense.property}{expense.room ? ` / ${expense.room}` : ''}</TableCell>
                        <TableCell className="text-right font-mono">{moneyFormatter.format(expense.amount)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(expense)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(expense)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4"/></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                !expensesError && <div className="text-center text-muted-foreground py-8">No expenses found. Click "Add Expense" to start.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
              <DialogDescription>Fill in the details for the expense record.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleFormSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">Date</Label>
                   <div className="col-span-3">
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen} modal={true}>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.date ? format(formData.date, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" onInteractOutside={(e) => { if (e.target !== e.currentTarget) e.preventDefault(); }}>
                        <Calendar
                          mode="single"
                          selected={formData.date}
                          onSelect={(day) => {
                            if (day) {
                              setFormData(p => ({...p, date: day}));
                            }
                            setIsCalendarOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                   </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">Amount</Label>
                  <Input id="amount" type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData(p => ({...p, amount: e.target.value}))} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">Description</Label>
                  <Input id="description" value={formData.description} onChange={(e) => setFormData(p => ({...p, description: e.target.value}))} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="vendor" className="text-right">Vendor</Label>
                   <Select onValueChange={handleVendorSelectChange} value={formData.vendor}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Select a vendor (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CREATE_NEW_VALUE}>
                        <span className="flex items-center gap-2 text-primary">
                            <PlusCircle className="h-4 w-4" /> Create new vendor...
                        </span>
                      </SelectItem>
                      <SelectItem value={NONE_VALUE}>None</SelectItem>
                      {vendors.map(v => <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">Category</Label>
                  <Select onValueChange={(v) => setFormData(p => ({...p, category: v}))} value={formData.category} required>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="property" className="text-right">Property</Label>
                  <Select onValueChange={(v) => setFormData(p => ({...p, property: v, room: ''}))} value={formData.property}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Select a property (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>None (Company Expense)</SelectItem>
                      {propertyNames.map(prop => <SelectItem key={prop} value={prop}>{prop}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {formData.property && formData.property !== NONE_VALUE && availableRooms.length > 0 && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="room" className="text-right">Room</Label>
                    <Select onValueChange={(v) => setFormData(p => ({...p, room: v}))} value={formData.room}>
                      <SelectTrigger className="col-span-3"><SelectValue placeholder="Select a room (optional)" /></SelectTrigger>
                      <SelectContent>
                         <SelectItem value={NONE_VALUE}>None (Property-level Expense)</SelectItem>
                        {availableRooms.map(room => <SelectItem key={room} value={room}>{room}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                 <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="receipt" className="text-right pt-2">Receipt</Label>
                    <div className="col-span-3 space-y-2">
                      {formData.receiptUrl ? (
                        <div className="relative group w-32 h-32 border rounded-md">
                          <Image src={formData.receiptUrl} alt="Receipt" fill className="object-cover rounded-md" />
                          <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100" onClick={handleReceiptDelete}><X className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <>
                          <Label htmlFor="receipt-upload" className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background h-10 px-4 py-2 hover:bg-accent hover:text-accent-foreground">
                              <Paperclip className="mr-2 h-4 w-4" /> Upload File
                          </Label>
                          <Input id="receipt-upload" type="file" accept="image/*" className="hidden" onChange={e => e.target.files && handleReceiptUpload(e.target.files[0])} disabled={isUploading} />
                          {isUploading && <Progress value={uploadProgress} className="w-full h-2 mt-2" />}
                        </>
                      )}
                    </div>
                 </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting || isUploading}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the expense
                record.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isVendorDialogOpen} onOpenChange={(open) => { if (!open) { setIsVendorDialogOpen(false); setFormData(p => ({...p, vendor: ''})); }}}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Vendor</DialogTitle>
                    <DialogDescription>Add a new vendor to the list.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="new-vendor-name" className="text-right">
                            Vendor Name
                        </Label>
                        <Input
                            id="new-vendor-name"
                            value={newVendorName}
                            onChange={(e) => setNewVendorName(e.target.value)}
                            className="col-span-3"
                            autoFocus
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => { setIsVendorDialogOpen(false); setFormData(p => ({...p, vendor: ''})); }}>Cancel</Button>
                    <Button onClick={handleSaveNewVendor} disabled={isSavingVendor}>
                        {isSavingVendor && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Vendor
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </MainLayout>
    </>
  );
}
