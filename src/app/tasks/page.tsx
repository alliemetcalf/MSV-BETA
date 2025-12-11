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
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Edit, Trash2, CalendarIcon } from 'lucide-react';
import { ContractorTask } from '@/types/contractor-task';
import { Property } from '@/types/property';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const NONE_VALUE = '_NONE_';

export default function TasksPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser(auth);
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ContractorTask | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<ContractorTask | null>(null);
  
  const [isDateOfTaskCalendarOpen, setIsDateOfTaskCalendarOpen] = useState(false);
  const [isDatePaidCalendarOpen, setIsDatePaidCalendarOpen] = useState(false);

  const [formData, setFormData] = useState<Omit<ContractorTask, 'id'>>({
    dateOfTask: Timestamp.now(),
    taskType: '',
    property: '',
    status: 'Pending',
    invoiceNumber: undefined,
    room: undefined,
    description: undefined,
    hoursWorked: undefined,
    hourlyRate: undefined,
    mileage: undefined,
    mileageRate: undefined,
    totalPaid: undefined,
    datePaid: undefined,
    totalInvoiceAmount: undefined,
  });

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const tasksCollectionRef = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'contractorTasks') : null),
    [firestore, user]
  );
  const { data: tasks, isLoading: tasksLoading, error: tasksError } =
    useCollection<ContractorTask>(tasksCollectionRef);

  const propertiesCollectionRef = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'properties') : null),
    [firestore, user]
  );
  const { data: properties, isLoading: propertiesLoading } = useCollection<Property>(propertiesCollectionRef);
  const propertyNames = useMemo(() => properties?.map(p => p.name).sort() || [], [properties]);

  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    return [...tasks].sort((a, b) => b.dateOfTask.toMillis() - a.dateOfTask.toMillis());
  }, [tasks]);

  const handleAddClick = () => {
    setEditingTask(null);
    setFormData({
      dateOfTask: Timestamp.now(),
      taskType: '',
      property: '',
      status: 'Pending',
      invoiceNumber: undefined,
      room: undefined,
      description: undefined,
      hoursWorked: undefined,
      hourlyRate: undefined,
      mileage: undefined,
      mileageRate: 0.70, // Default mileage rate
      totalPaid: undefined,
      datePaid: undefined,
      totalInvoiceAmount: undefined,
    });
    setIsFormOpen(true);
  };

  const handleEditClick = (task: ContractorTask) => {
    setEditingTask(task);
    setFormData({
      ...task,
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (task: ContractorTask) => {
    setTaskToDelete(task);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!firestore || !taskToDelete) return;
    try {
      await deleteDoc(doc(firestore, 'contractorTasks', taskToDelete.id));
      toast({ title: 'Task Deleted', description: 'The task has been successfully removed.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error Deleting', description: 'Could not delete the task.' });
    } finally {
      setIsConfirmDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    
    setIsSubmitting(true);

    const dataToSave = { ...formData };

    try {
      if (editingTask) {
        await updateDoc(doc(firestore, 'contractorTasks', editingTask.id), dataToSave);
        toast({ title: 'Task Updated', description: 'Your changes have been saved.' });
      } else {
        await addDoc(collection(firestore, 'contractorTasks'), dataToSave);
        toast({ title: 'Task Added', description: 'The new task has been created.' });
      }
      setIsFormOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the task.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
     const parsedValue = type === 'number' && value !== '' ? parseFloat(value) : value;
    setFormData((prev) => ({ ...prev, [id]: parsedValue }));
  };

  const handleSelectChange = (field: keyof ContractorTask) => (value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isLoading = isUserLoading || tasksLoading || propertiesLoading;

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <MainLayout>
        <div className="w-full max-w-7xl px-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Contractor Tasks</CardTitle>
                <CardDescription>Track and manage all contractor tasks.</CardDescription>
              </div>
              <Button onClick={handleAddClick}><PlusCircle className="mr-2 h-4 w-4" />Add Task</Button>
            </CardHeader>
            <CardContent>
              {tasksError && <p className="text-destructive text-center py-8">Error: {tasksError.message}</p>}
              {!tasksError && sortedTasks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Inv #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Task Type</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Mileage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTasks.map(task => (
                      <TableRow key={task.id}>
                        <TableCell>{task.invoiceNumber}</TableCell>
                        <TableCell>{format(task.dateOfTask.toDate(), 'PPP')}</TableCell>
                        <TableCell>{task.taskType}</TableCell>
                        <TableCell>{task.property}</TableCell>
                        <TableCell>{task.room}</TableCell>
                        <TableCell>{task.description}</TableCell>
                        <TableCell>{task.hoursWorked}</TableCell>
                        <TableCell>{task.hourlyRate ? moneyFormatter.format(task.hourlyRate) : ''}</TableCell>
                        <TableCell>{task.mileage}</TableCell>
                        <TableCell><Badge variant={task.status === 'Paid' ? 'default' : 'secondary'}>{task.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(task)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(task)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4"/></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                !tasksError && <div className="text-center text-muted-foreground py-8">No tasks found. Click "Add Task" to start.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleFormSubmit}>
              <div className="grid gap-4 py-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice #</Label>
                  <Input id="invoiceNumber" type="number" value={formData.invoiceNumber || ''} onChange={handleFormChange} />
                </div>
                <div className="space-y-2">
                   <Label htmlFor="dateOfTask">Date of Task</Label>
                   <Popover open={isDateOfTaskCalendarOpen} onOpenChange={setIsDateOfTaskCalendarOpen} modal={true}>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn("w-full justify-start text-left font-normal", !formData.dateOfTask && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.dateOfTask ? format(formData.dateOfTask.toDate(), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" onInteractOutside={(e) => { if (e.target !== e.currentTarget) e.preventDefault(); }}>
                        <Calendar
                          mode="single"
                          selected={formData.dateOfTask.toDate()}
                          onSelect={(d) => {
                              if (d) setFormData(p => ({...p, dateOfTask: Timestamp.fromDate(d)}));
                              setIsDateOfTaskCalendarOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taskType">Task Type</Label>
                  <Input id="taskType" value={formData.taskType || ''} onChange={handleFormChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="property">Property</Label>
                   <Select onValueChange={handleSelectChange('property')} value={formData.property} required>
                    <SelectTrigger><SelectValue placeholder="Select a property" /></SelectTrigger>
                    <SelectContent>
                      {propertyNames.map(prop => <SelectItem key={prop} value={prop}>{prop}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room">Room #</Label>
                  <Input id="room" value={formData.room || ''} onChange={handleFormChange} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                   <Select onValueChange={handleSelectChange('status')} value={formData.status} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-full">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" value={formData.description || ''} onChange={handleFormChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hoursWorked">Hours Worked</Label>
                  <Input id="hoursWorked" type="number" step="0.1" value={formData.hoursWorked || ''} onChange={handleFormChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Rate</Label>
                  <Input id="hourlyRate" type="number" step="0.01" value={formData.hourlyRate || ''} onChange={handleFormChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mileage">Mileage</Label>
                  <Input id="mileage" type="number" step="0.1" value={formData.mileage || ''} onChange={handleFormChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mileageRate">Mileage Rate</Label>
                  <Input id="mileageRate" type="number" step="0.01" value={formData.mileageRate || ''} onChange={handleFormChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalPaid">Total Paid</Label>
                  <Input id="totalPaid" type="number" step="0.01" value={formData.totalPaid || ''} onChange={handleFormChange} />
                </div>
                 <div className="space-y-2">
                   <Label htmlFor="datePaid">Date Paid</Label>
                   <Popover open={isDatePaidCalendarOpen} onOpenChange={setIsDatePaidCalendarOpen} modal={true}>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn("w-full justify-start text-left font-normal", !formData.datePaid && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.datePaid ? format(formData.datePaid.toDate(), "PPP") : <span>Pick a date (optional)</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" onInteractOutside={(e) => { if (e.target !== e.currentTarget) e.preventDefault(); }}>
                        <Calendar
                          mode="single"
                          selected={formData.datePaid?.toDate()}
                          onSelect={(d) => {
                            setFormData(p => ({...p, datePaid: d ? Timestamp.fromDate(d) : undefined}));
                            setIsDatePaidCalendarOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalInvoiceAmount">Total Invoice Amount</Label>
                  <Input id="totalInvoiceAmount" type="number" step="0.01" value={formData.totalInvoiceAmount || ''} onChange={handleFormChange} />
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
                This action cannot be undone. This will permanently delete the task record.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MainLayout>
    </>
  );
}
