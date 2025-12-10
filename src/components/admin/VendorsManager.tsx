'use client';

import * as React from 'react';
import { useFirestore, useMemoFirebase, useUser, useAuth, useDoc } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Vendor } from '@/types/expense';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Label } from '../ui/label';

export function VendorsManager() {
  const auth = useAuth();
  const { user } = useUser(auth);
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newVendorName, setNewVendorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const vendorsDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'siteConfiguration', 'vendors') : null),
    [firestore, user]
  );

  const {
    data: vendorsData,
    isLoading,
    error,
  } = useDoc<{ vendors: Vendor[] }>(vendorsDocRef);

  const [localVendors, setLocalVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    if (vendorsData) {
      setLocalVendors(vendorsData.vendors || []);
    } else if (!isLoading && !vendorsData) {
      setLocalVendors([]);
    }
  }, [vendorsData, isLoading]);
  
  const showSuccessToast = (description: string) => {
    toast({ title: 'Success', description, duration: 5000 });
  };

  const showErrorToast = (description: string) => {
    toast({ variant: 'destructive', title: 'Error', description });
  };

  const updateFirestore = async (
    updatedVendors: Vendor[],
    successMessage?: string
  ) => {
    if (!vendorsDocRef) return;
    setIsSubmitting(true);
    try {
      await setDoc(vendorsDocRef, { vendors: updatedVendors }, { merge: true });
      if (successMessage) showSuccessToast(successMessage);
    } catch (e) {
      showErrorToast('Failed to save changes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddVendor = async () => {
    if (newVendorName && !localVendors.some((c) => c.name.toLowerCase() === newVendorName.toLowerCase())) {
      const newVendor: Vendor = {
        id: new Date().toISOString(),
        name: newVendorName,
      };
      const updatedVendors = [...localVendors, newVendor].sort((a,b) => a.name.localeCompare(b.name));
      await updateFirestore(updatedVendors, `Added "${newVendorName}".`);
      setNewVendorName('');
    } else {
        showErrorToast('Vendor name cannot be empty or already exist.');
    }
  };

  const handleDeleteVendor = async (idToDelete: string) => {
    const vendorNameToDelete = localVendors.find((c) => c.id === idToDelete)?.name || 'item';
    if(confirm(`Are you sure you want to delete the "${vendorNameToDelete}" vendor? This cannot be undone.`)){
        const updatedVendors = localVendors.filter((cat) => cat.id !== idToDelete);
        await updateFirestore(updatedVendors, `Removed "${vendorNameToDelete}".`);
    }
  };

  const handleUpdateName = (id: string, value: string) => {
    const updatedVendors = localVendors.map((cat) =>
      cat.id === id ? { ...cat, name: value } : cat
    );
    setLocalVendors(updatedVendors);
  };
  
  const handleSaveChangesForVendor = async (id: string) => {
    const vendorToSave = localVendors.find((t) => t.id === id);
    if (!vendorToSave) return;

    const isDuplicate = localVendors.some(c => c.id !== id && c.name.toLowerCase() === vendorToSave.name.toLowerCase());
    if (isDuplicate) {
        showErrorToast(`Vendor name "${vendorToSave.name}" already exists.`);
        // Revert local state
        if (vendorsData) setLocalVendors(vendorsData.vendors || []);
        return;
    }

    const currentDataInFirestore = vendorsData?.vendors?.find((t) => t.id === id);
    if (JSON.stringify(vendorToSave) === JSON.stringify(currentDataInFirestore)) {
      return;
    }

    const sortedVendors = [...localVendors].sort((a,b) => a.name.localeCompare(b.name));
    await updateFirestore(sortedVendors, 'Changes saved successfully.');
  };


  if (isLoading) {
    return <Loader2 className="mx-auto h-8 w-8 animate-spin" />;
  }

  if (error) {
    return <p className="text-destructive">Error: {error.message}</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Vendors</CardTitle>
        <CardDescription>
          Add, remove, or edit the available vendors.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {localVendors.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-2">
              {localVendors.map((vendor) => (
                <AccordionItem
                  value={vendor.id}
                  key={vendor.id}
                  className="p-4 border rounded-lg"
                >
                  <AccordionTrigger className="flex justify-between w-full p-0 hover:no-underline">
                    <span className="font-semibold text-left">{vendor.name}</span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteVendor(vendor.id)}
                      disabled={isSubmitting}
                      className="absolute top-2 right-2 text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="space-y-2">
                      <Label htmlFor={`name-${vendor.id}`}>Vendor Name</Label>
                      <Input
                        id={`name-${vendor.id}`}
                        value={vendor.name}
                        onChange={(e) => handleUpdateName(vendor.id, e.target.value)}
                        onBlur={() => handleSaveChangesForVendor(vendor.id)}
                        disabled={isSubmitting}
                        className="flex-grow font-semibold"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No vendors defined.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 pt-4 border-t">
          <Input
            placeholder="New vendor name..."
            value={newVendorName}
            onChange={(e) => setNewVendorName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddVendor()}
            disabled={isSubmitting}
          />
          <Button
            onClick={handleAddVendor}
            size="sm"
            disabled={isSubmitting || !newVendorName}
          >
            {isSubmitting && newVendorName ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle className="mr-2 h-4 w-4" />
            )}
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
