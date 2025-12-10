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
import { PaymentMethod } from '@/types/payment-method';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Label } from '../ui/label';

export function PaymentMethodsManager() {
  const auth = useAuth();
  const { user } = useUser(auth);
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newMethodName, setNewMethodName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const paymentMethodsDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'siteConfiguration', 'paymentMethods') : null),
    [firestore, user]
  );

  const {
    data: paymentMethodsData,
    isLoading,
    error,
  } = useDoc<{ methods: PaymentMethod[] }>(paymentMethodsDocRef);

  const [localPaymentMethods, setLocalPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    if (paymentMethodsData) {
      setLocalPaymentMethods(paymentMethodsData.methods || []);
    } else if (!isLoading && !paymentMethodsData) {
      setLocalPaymentMethods([]);
    }
  }, [paymentMethodsData, isLoading]);
  
  const showSuccessToast = (description: string) => {
    toast({ title: 'Success', description, duration: 5000 });
  };

  const showErrorToast = (description: string) => {
    toast({ variant: 'destructive', title: 'Error', description });
  };

  const updateFirestore = async (
    updatedMethods: PaymentMethod[],
    successMessage?: string
  ) => {
    if (!paymentMethodsDocRef) return;
    setIsSubmitting(true);
    try {
      await setDoc(paymentMethodsDocRef, { methods: updatedMethods }, { merge: true });
      if (successMessage) showSuccessToast(successMessage);
    } catch (e) {
      showErrorToast('Failed to save changes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMethod = async () => {
    if (newMethodName && !localPaymentMethods.some((c) => c.name.toLowerCase() === newMethodName.toLowerCase())) {
      const newMethod: PaymentMethod = {
        id: new Date().toISOString(),
        name: newMethodName,
      };
      const updatedMethods = [...localPaymentMethods, newMethod].sort((a,b) => a.name.localeCompare(b.name));
      await updateFirestore(updatedMethods, `Added "${newMethodName}".`);
      setNewMethodName('');
    } else {
        showErrorToast('Payment method name cannot be empty or already exist.');
    }
  };

  const handleDeleteMethod = async (idToDelete: string) => {
    const methodNameToDelete = localPaymentMethods.find((c) => c.id === idToDelete)?.name || 'item';
    if(confirm(`Are you sure you want to delete the "${methodNameToDelete}" payment method? This cannot be undone.`)){
        const updatedMethods = localPaymentMethods.filter((cat) => cat.id !== idToDelete);
        await updateFirestore(updatedMethods, `Removed "${methodNameToDelete}".`);
    }
  };

  const handleUpdateName = (id: string, value: string) => {
    const updatedMethods = localPaymentMethods.map((cat) =>
      cat.id === id ? { ...cat, name: value } : cat
    );
    setLocalPaymentMethods(updatedMethods);
  };
  
  const handleSaveChangesForMethod = async (id: string) => {
    const methodToSave = localPaymentMethods.find((t) => t.id === id);
    if (!methodToSave) return;

    const isDuplicate = localPaymentMethods.some(c => c.id !== id && c.name.toLowerCase() === methodToSave.name.toLowerCase());
    if (isDuplicate) {
        showErrorToast(`Payment method name "${methodToSave.name}" already exists.`);
        if (paymentMethodsData) setLocalPaymentMethods(paymentMethodsData.methods || []);
        return;
    }

    const currentDataInFirestore = paymentMethodsData?.methods?.find((t) => t.id === id);
    if (JSON.stringify(methodToSave) === JSON.stringify(currentDataInFirestore)) {
      return;
    }

    const sortedMethods = [...localPaymentMethods].sort((a,b) => a.name.localeCompare(b.name));
    await updateFirestore(sortedMethods, 'Changes saved successfully.');
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
        <CardTitle>Manage Payment Methods</CardTitle>
        <CardDescription>
          Add, remove, or edit the available payment methods.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {localPaymentMethods.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-2">
              {localPaymentMethods.map((method) => (
                <AccordionItem
                  value={method.id}
                  key={method.id}
                  className="p-4 border rounded-lg"
                >
                  <AccordionTrigger className="flex justify-between w-full p-0 hover:no-underline">
                    <span className="font-semibold text-left">{method.name}</span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteMethod(method.id)}
                      disabled={isSubmitting}
                      className="absolute top-2 right-2 text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="space-y-2">
                      <Label htmlFor={`name-${method.id}`}>Method Name</Label>
                      <Input
                        id={`name-${method.id}`}
                        value={method.name}
                        onChange={(e) => handleUpdateName(method.id, e.target.value)}
                        onBlur={() => handleSaveChangesForMethod(method.id)}
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
              No payment methods defined. Start by adding one.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 pt-4 border-t">
          <Input
            placeholder="New payment method..."
            value={newMethodName}
            onChange={(e) => setNewMethodName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddMethod()}
            disabled={isSubmitting}
          />
          <Button
            onClick={handleAddMethod}
            size="sm"
            disabled={isSubmitting || !newMethodName}
          >
            {isSubmitting && newMethodName ? (
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

    