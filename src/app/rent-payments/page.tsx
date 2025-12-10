'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  useUser,
  useFirestore,
  useMemoFirebase,
  useCollection,
  useAuth,
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
import { format } from 'date-fns';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Edit, Trash2, CalendarIcon } from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { RentPayment } from '@/types/rent-payment';

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const paymentMethods = ['Zelle', 'Cash', 'Check', 'Venmo', 'Other'];

export default function RentPaymentsPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser(auth);
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<RentPayment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    tenantId: string;
    date: Date | undefined;
    amount: string;
    paymentMethod: string;
    notes: string;
  }>({
    tenantId: '',
    date: new Date(),
    amount: '',
    paymentMethod: '',
    notes: '',
  });

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

  const sortedPayments = useMemo(() => {
    if (!payments) return [];
    return [...payments].sort((a, b) => b.date.toMillis() - a.date.toMillis());
  }, [payments]);


  const handleAddClick = () => {
    setEditingPayment(null);
    setFormData({
      tenantId: '',
      date: new Date(),
      amount: '',
      paymentMethod: '',
      notes: '',
    });
    setIsFormOpen(true);
  };

  const handleEditClick = (payment: RentPayment) => {
    setEditingPayment(payment);
    setFormData({
      tenantId: payment.tenantId,
      date: payment.date.toDate(),
      amount: String(payment.amount),
      paymentMethod: payment.paymentMethod,
      notes: payment.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (payment: RentPayment) => {
    if (!firestore) return;
    if (confirm('Are you sure you want to delete this rent payment?')) {
      try {
        await deleteDoc(doc(firestore, 'rentPayments', payment.id));
        toast({ title: 'Payment Deleted', description: 'The payment has been successfully removed.' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error Deleting', description: 'Could not delete the payment.' });
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user || !formData.date || !formData.tenantId || !formData.paymentMethod) {
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

    const dataToSave = {
      tenantId: selectedTenant.id,
      tenantName: selectedTenant.name,
      property: selectedTenant.property,
      date: Timestamp.fromDate(formData.date),
      amount,
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

  const isLoading = isUserLoading || paymentsLoading || tenantsLoading;

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
            <Button onClick={handleAddClick}><PlusCircle /> Add Payment</Button>
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
                      <TableCell>{payment.paymentMethod}</TableCell>
                      <TableCell>{payment.notes}</TableCell>
                      <TableCell className="text-right font-mono">{moneyFormatter.format(payment.amount)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(payment)}><Edit /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(payment)} className="text-destructive hover:text-destructive/80"><Trash2 /></Button>
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('col-span-3 justify-start text-left font-normal', !formData.date && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date ? format(formData.date, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar 
                      mode="single" 
                      selected={formData.date} 
                      onSelect={(date) => setFormData(p => ({...p, date: date}))}
                      initialFocus 
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">Amount</Label>
                <Input id="amount" type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData(p => ({...p, amount: e.target.value}))} className="col-span-3" required />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentMethod" className="text-right">Method</Label>
                <Select onValueChange={(v) => setFormData(p => ({...p, paymentMethod: v}))} value={formData.paymentMethod} required>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Select a payment method" /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}
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
    </MainLayout>
  );
}
