'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  useUser,
  useFirestore,
  useMemoFirebase,
  useCollection,
  useAuth,
  useDoc,
} from '@/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { format, getYear, getMonth, getDate } from 'date-fns';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { RentPayment } from '@/types/rent-payment';
import { IncomeType } from '@/types/income';
import { PaymentMethod } from '@/types/payment-method';


const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: format(new Date(currentYear, i), 'MMMM') }));

export default function RentPaymentsPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser(auth);
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<RentPayment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<RentPayment | null>(null);

  const [formData, setFormData] = useState<{
    tenantId: string;
    year: number;
    month: number;
    day: number;
    amount: string;
    category: string;
    paymentMethod: string;
    notes: string;
  }>({
    tenantId: '',
    year: currentYear,
    month: getMonth(new Date()) + 1,
    day: getDate(new Date()),
    amount: '',
    category: '',
    paymentMethod: '',
    notes: '',
  });

   const daysInMonth = useMemo(() => {
    return new Date(formData.year, formData.month, 0).getDate();
  }, [formData.year, formData.month]);


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const paymentsCollectionRef = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'rentPayments') : null),
    [firestore, user]
  );
  const { data: payments, isLoading: paymentsLoading, error: paymentsError } =
    useCollection<RentPayment>(paymentsCollectionRef);

  const tenantsCollectionRef = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'tenants') : null),
    [firestore, user]
  );
  const { data: tenants, isLoading: tenantsLoading } = useCollection<Tenant>(tenantsCollectionRef);
  const sortedTenants = useMemo(() => tenants?.filter(t => t.active).sort((a,b) => a.name.localeCompare(b.name)) || [], [tenants]);

  const incomeTypesDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'siteConfiguration', 'incomeTypes') : null),
    [firestore, user]
  );
  const { data: incomeTypesData, isLoading: incomeTypesLoading } = useDoc<{ types: IncomeType[] }>(incomeTypesDocRef);
  const incomeTypes = useMemo(() => incomeTypesData?.types.sort((a,b) => a.name.localeCompare(b.name)) || [], [incomeTypesData]);
  
  const paymentMethodsDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'siteConfiguration', 'paymentMethods') : null),
    [firestore, user]
  );
  const { data: paymentMethodsData, isLoading: paymentMethodsLoading } = useDoc<{ methods: PaymentMethod[] }>(paymentMethodsDocRef);
  const paymentMethods = useMemo(() => paymentMethodsData?.methods.sort((a,b) => a.name.localeCompare(b.name)) || [], [paymentMethodsData]);


  const sortedPayments = useMemo(() => {
    if (!payments) return [];
    return [...payments].sort((a, b) => b.date.toMillis() - a.date.toMillis());
  }, [payments]);


  const handleAddClick = () => {
    setEditingPayment(null);
    setFormData({
      tenantId: '',
      year: currentYear,
      month: getMonth(new Date()) + 1,
      day: getDate(new Date()),
      amount: '',
      category: '',
      paymentMethod: '',
      notes: '',
    });
    setIsFormOpen(true);
  };

  const handleEditClick = (payment: RentPayment) => {
    const paymentDate = payment.date.toDate();
    setEditingPayment(payment);
    setFormData({
      tenantId: payment.tenantId,
      year: getYear(paymentDate),
      month: getMonth(paymentDate) + 1,
      day: getDate(paymentDate),
      amount: String(payment.amount),
      category: payment.category,
      paymentMethod: payment.paymentMethod,
      notes: payment.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (payment: RentPayment) => {
    setPaymentToDelete(payment);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!firestore || !paymentToDelete) return;
    try {
      await deleteDoc(doc(firestore, 'rentPayments', paymentToDelete.id));
      toast({ title: 'Payment Deleted', description: 'The payment has been successfully removed.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error Deleting', description: 'Could not delete the payment.' });
    } finally {
      setIsConfirmDialogOpen(false);
      setPaymentToDelete(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { tenantId, year, month, day, paymentMethod, category } = formData;
    if (!firestore || !user || !tenantId || !year || !month || !day || !paymentMethod || !category) {
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

    const selectedTenant = tenants?.find(t => t.id === formData.tenantId);
    if (!selectedTenant) {
        toast({ variant: 'destructive', title: 'Invalid Tenant', description: 'Selected tenant not found.' });
        setIsSubmitting(false);
        return;
    }

    const paymentDate = new Date(year, month - 1, day);

    const dataToSave = {
      tenantId: selectedTenant.id,
      tenantName: selectedTenant.name,
      property: selectedTenant.property,
      date: Timestamp.fromDate(paymentDate),
      amount,
      category: formData.category,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes,
    };

    try {
      if (editingPayment) {
        await updateDoc(doc(firestore, 'rentPayments', editingPayment.id), dataToSave);
        toast({ title: 'Payment Updated', description: 'Your changes have been saved.' });
      } else {
        await addDoc(collection(firestore, 'rentPayments'), dataToSave);
        toast({ title: 'Payment Added', description: 'The new rent payment has been recorded.' });
      }
      setIsFormOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the payment.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
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


  const isLoading = isUserLoading || paymentsLoading || tenantsLoading || incomeTypesLoading || paymentMethodsLoading;

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <MainLayout>
      <div className="w-full max-w-6xl px-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Rent Payments</CardTitle>
              <CardDescription>Track and manage all tenant rent payments.</CardDescription>
            </div>
            <Button onClick={handleAddClick}><PlusCircle className="mr-2 h-4 w-4" /> Add Payment</Button>
          </CardHeader>
          <CardContent>
            {paymentsError && <p className="text-destructive text-center py-8">Error: {paymentsError.message}</p>}
            {!paymentsError && sortedPayments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPayments.map(payment => (
                    <TableRow key={payment.id}>
                      <TableCell>{format(payment.date.toDate(), 'PPP')}</TableCell>
                      <TableCell>{payment.tenantName}</TableCell>
                      <TableCell>{payment.property}</TableCell>
                      <TableCell>{payment.category}</TableCell>
                      <TableCell>{payment.paymentMethod}</TableCell>
                      <TableCell>{payment.notes}</TableCell>
                      <TableCell className="text-right font-mono">{moneyFormatter.format(payment.amount)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(payment)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(payment)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              !paymentsError && <div className="text-center text-muted-foreground py-8">No payments found. Click "Add Payment" to start.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPayment ? 'Edit Payment' : 'Add New Payment'}</DialogTitle>
            <DialogDescription>Fill in the details for the rent payment.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit}>
            <div className="grid gap-4 py-4">
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tenantId" className="text-right">Tenant</Label>
                <Select onValueChange={(v) => setFormData(p => ({...p, tenantId: v}))} value={formData.tenantId} required>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Select a tenant" /></SelectTrigger>
                  <SelectContent>
                    {sortedTenants.map(tenant => <SelectItem key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.property} / {tenant.room || 'N/A'})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
                <Label htmlFor="category" className="text-right">Category</Label>
                <Select onValueChange={(v) => setFormData(p => ({...p, category: v}))} value={formData.category} required>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Select an income category" /></SelectTrigger>
                  <SelectContent>
                    {incomeTypes.map(type => <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentMethod" className="text-right">Method</Label>
                <Select onValueChange={(v) => setFormData(p => ({...p, paymentMethod: v}))} value={formData.paymentMethod} required>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Select a payment method" /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => <SelectItem key={method.id} value={method.name}>{method.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">Notes</Label>
                <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData(p => ({...p, notes: e.target.value}))} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
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
              This action cannot be undone. This will permanently delete the rent
              payment record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}

    