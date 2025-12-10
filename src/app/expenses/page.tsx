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
import { format, getYear, getMonth, getDate } from 'date-fns';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Loader2, PlusCircle, Edit, Trash2, Paperclip, X } from 'lucide-react';
import { Expense, ExpenseCategory, Vendor } from '@/types/expense';
import { Property } from '@/types/property';
import { Tenant } from '@/types/tenant';


const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const NONE_VALUE = '_NONE_';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: format(new Date(currentYear, i), 'MMMM') }));

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
  
  const [formData, setFormData] = useState<{
    year: number;
    month: number;
    day: number;
    amount: string;
    description: string;
    category: string;
    vendor: string;
    property: string;
    room: string;
    receiptUrl?: string;
  }>({
    year: currentYear,
    month: getMonth(new Date()) + 1,
    day: getDate(new Date()),
    amount: '',
    description: '',
    category: '',
    vendor: '',
    property: '',
    room: '',
    receiptUrl: '',
  });

  const daysInMonth = useMemo(() => {
    return new Date(formData.year, formData.month, 0).getDate();
  }, [formData.year, formData.month]);

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
  
  const roomsByProperty = useMemo(() => {
    if (!tenants) return {};
    return tenants.reduce((acc, tenant) => {
      if (tenant.property && tenant.room && tenant.active) {
        if (!acc[tenant.property]) acc[tenant.property] = new Set();
        acc[tenant.property].add(tenant.room);
      }
      return acc;
    }, {} as Record<string, Set<string>>);
  }, [tenants]);

  const availableRooms = useMemo(() => {
    return formData.property ? Array.from(roomsByProperty[formData.property] || []).sort((a,b) => a.localeCompare(b, undefined, { numeric: true })) : [];
  }, [formData.property, roomsByProperty]);

  const sortedExpenses = useMemo(() => {
    if (!expenses) return [];
    return [...expenses].sort((a, b) => b.date.toMillis() - a.date.toMillis());
  }, [expenses]);


  const handleAddClick = () => {
    setEditingExpense(null);
    setFormData({
      year: currentYear,
      month: getMonth(new Date()) + 1,
      day: getDate(new Date()),
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
    const expenseDate = expense.date.toDate();
    setEditingExpense(expense);
    setFormData({
      year: getYear(expenseDate),
      month: getMonth(expenseDate) + 1,
      day: getDate(expenseDate),
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

  const handleDeleteClick = async (expense: Expense) => {
    if (!firestore) return;
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        if (expense.receiptUrl && storage) {
          const receiptRef = ref(storage, expense.receiptUrl);
          await deleteObject(receiptRef).catch(e => console.warn("Could not delete old receipt:", e));
        }
        await deleteDoc(doc(firestore, 'expenses', expense.id));
        toast({ title: 'Expense Deleted', description: 'The expense has been successfully removed.' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error Deleting', description: 'Could not delete the expense.' });
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { year, month, day, category } = formData;
    if (!firestore || !user || !year || !month || !day || !category) {
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

    const expenseDate = new Date(year, month - 1, day);

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
  
  const handleDateChange = (part: 'year' | 'month' | 'day', value: string) => {
    const numValue = parseInt(value, 10);
    const newDate = { ...formData, [part]: numValue };

    if (part === 'year' || part === 'month') {
        const newDaysInMonth = new Date(newDate.year, newDate.month, 0).getDate();
        if (newDate.day > newDaysInMonth) {
            newDate.day = newDaysInMonth;
        }
    }
    setFormData(newDate);
  };


  const isLoading = isUserLoading || expensesLoading || categoriesLoading || propertiesLoading || tenantsLoading || vendorsLoading;

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
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
                      <TableCell>{format(expense.date.toDate(), 'PPP')}</TableCell>
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
                 <div className="col-span-3 grid grid-cols-3 gap-2">
                    <Select value={String(formData.month)} onValueChange={v => handleDateChange('month', v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            {months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={String(formData.day)} onValueChange={v => handleDateChange('day', v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={String(formData.year)} onValueChange={v => handleDateChange('year', v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
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
                 <Select onValueChange={(v) => setFormData(p => ({...p, vendor: v}))} value={formData.vendor}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Select a vendor (optional)" /></SelectTrigger>
                  <SelectContent>
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
                        <Image src={formData.receiptUrl} alt="Receipt" layout="fill" className="object-cover rounded-md" />
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
    </MainLayout>
  );
}
