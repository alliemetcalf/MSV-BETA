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
import { IncomeType } from '@/types/income';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Label } from '../ui/label';

export function IncomeTypeManager() {
  const auth = useAuth();
  const { user } = useUser(auth);
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newTypeName, setNewTypeName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const incomeTypesDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'siteConfiguration', 'incomeTypes') : null),
    [firestore, user]
  );

  const {
    data: incomeTypesData,
    isLoading,
    error,
  } = useDoc<{ types: IncomeType[] }>(incomeTypesDocRef);

  const [localIncomeTypes, setLocalIncomeTypes] = useState<IncomeType[]>([]);

  useEffect(() => {
    if (incomeTypesData) {
      setLocalIncomeTypes(incomeTypesData.types || []);
    } else if (!isLoading && !incomeTypesData) {
      setLocalIncomeTypes([]);
    }
  }, [incomeTypesData, isLoading]);
  
  const showSuccessToast = (description: string) => {
    toast({ title: 'Success', description, duration: 5000 });
  };

  const showErrorToast = (description: string) => {
    toast({ variant: 'destructive', title: 'Error', description });
  };

  const updateFirestore = async (
    updatedTypes: IncomeType[],
    successMessage?: string
  ) => {
    if (!incomeTypesDocRef) return;
    setIsSubmitting(true);
    try {
      // Ensure the document exists before trying to set it.
      await setDoc(incomeTypesDocRef, { types: updatedTypes }, { merge: true });
      if (successMessage) showSuccessToast(successMessage);
    } catch (e) {
      showErrorToast('Failed to save changes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddType = async () => {
    if (newTypeName && !localIncomeTypes.some((c) => c.name.toLowerCase() === newTypeName.toLowerCase())) {
      const newType: IncomeType = {
        id: new Date().toISOString(),
        name: newTypeName,
      };
      const updatedTypes = [...localIncomeTypes, newType].sort((a,b) => a.name.localeCompare(b.name));
      await updateFirestore(updatedTypes, `Added "${newTypeName}".`);
      setNewTypeName('');
    } else {
        showErrorToast('Income type name cannot be empty or already exist.');
    }
  };

  const handleDeleteType = async (idToDelete: string) => {
    const typeNameToDelete = localIncomeTypes.find((c) => c.id === idToDelete)?.name || 'item';
    if(confirm(`Are you sure you want to delete the "${typeNameToDelete}" income type? This cannot be undone.`)){
        const updatedTypes = localIncomeTypes.filter((cat) => cat.id !== idToDelete);
        await updateFirestore(updatedTypes, `Removed "${typeNameToDelete}".`);
    }
  };

  const handleUpdateName = (id: string, value: string) => {
    const updatedTypes = localIncomeTypes.map((cat) =>
      cat.id === id ? { ...cat, name: value } : cat
    );
    setLocalIncomeTypes(updatedTypes);
  };
  
  const handleSaveChangesForType = async (id: string) => {
    const typeToSave = localIncomeTypes.find((t) => t.id === id);
    if (!typeToSave) return;

    const isDuplicate = localIncomeTypes.some(c => c.id !== id && c.name.toLowerCase() === typeToSave.name.toLowerCase());
    if (isDuplicate) {
        showErrorToast(`Income type name "${typeToSave.name}" already exists.`);
        if (incomeTypesData) setLocalIncomeTypes(incomeTypesData.types || []);
        return;
    }

    const currentDataInFirestore = incomeTypesData?.types?.find((t) => t.id === id);
    if (JSON.stringify(typeToSave) === JSON.stringify(currentDataInFirestore)) {
      return;
    }

    const sortedTypes = [...localIncomeTypes].sort((a,b) => a.name.localeCompare(b.name));
    await updateFirestore(sortedTypes, 'Changes saved successfully.');
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
        <CardTitle>Manage Income Types</CardTitle>
        <CardDescription>
          Add, remove, or edit the available income categories.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {localIncomeTypes.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-2">
              {localIncomeTypes.map((type) => (
                <AccordionItem
                  value={type.id}
                  key={type.id}
                  className="p-4 border rounded-lg"
                >
                  <AccordionTrigger className="flex justify-between w-full p-0 hover:no-underline">
                    <span className="font-semibold text-left">{type.name}</span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteType(type.id)}
                      disabled={isSubmitting}
                      className="absolute top-2 right-2 text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="space-y-2">
                      <Label htmlFor={`name-${type.id}`}>Income Type Name</Label>
                      <Input
                        id={`name-${type.id}`}
                        value={type.name}
                        onChange={(e) => handleUpdateName(type.id, e.target.value)}
                        onBlur={() => handleSaveChangesForType(type.id)}
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
              No income types defined. Start by adding one.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 pt-4 border-t">
          <Input
            placeholder="New income type..."
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddType()}
            disabled={isSubmitting}
          />
          <Button
            onClick={handleAddType}
            size="sm"
            disabled={isSubmitting || !newTypeName}
          >
            {isSubmitting && newTypeName ? (
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
