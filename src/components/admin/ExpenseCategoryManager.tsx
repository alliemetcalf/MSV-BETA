'use client';

import * as React from 'react';
import { useFirestore, useMemoFirebase, useUser, useAuth } from '@/firebase';
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
import { ExpenseCategory } from '@/types/expense';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Label } from '../ui/label';

export function ExpenseCategoryManager() {
  const auth = useAuth();
  const { user } = useUser(auth);
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoriesDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'siteConfiguration', 'expenseCategories') : null),
    [firestore, user]
  );

  const {
    data: categoriesData,
    isLoading,
    error,
  } = useDoc<{ categories: ExpenseCategory[] }>(categoriesDocRef);

  const [localCategories, setLocalCategories] = useState<ExpenseCategory[]>([]);

  useEffect(() => {
    if (categoriesData) {
      setLocalCategories(categoriesData.categories || []);
    } else if (!isLoading && !categoriesData) {
      setLocalCategories([]);
    }
  }, [categoriesData, isLoading]);
  
  const showSuccessToast = (description: string) => {
    toast({ title: 'Success', description, duration: 5000 });
  };

  const showErrorToast = (description: string) => {
    toast({ variant: 'destructive', title: 'Error', description });
  };

  const updateFirestore = async (
    updatedCategories: ExpenseCategory[],
    successMessage?: string
  ) => {
    if (!categoriesDocRef) return;
    setIsSubmitting(true);
    try {
      await setDoc(categoriesDocRef, { categories: updatedCategories }, { merge: true });
      if (successMessage) showSuccessToast(successMessage);
    } catch (e) {
      showErrorToast('Failed to save changes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCategory = async () => {
    if (newCategoryName && !localCategories.some((c) => c.name.toLowerCase() === newCategoryName.toLowerCase())) {
      const newCategory: ExpenseCategory = {
        id: new Date().toISOString(),
        name: newCategoryName,
      };
      const updatedCategories = [...localCategories, newCategory].sort((a,b) => a.name.localeCompare(b.name));
      await updateFirestore(updatedCategories, `Added "${newCategoryName}".`);
      setNewCategoryName('');
    } else {
        showErrorToast('Category name cannot be empty or already exist.');
    }
  };

  const handleDeleteCategory = async (idToDelete: string) => {
    const categoryNameToDelete = localCategories.find((c) => c.id === idToDelete)?.name || 'item';
    if(confirm(`Are you sure you want to delete the "${categoryNameToDelete}" category? This cannot be undone.`)){
        const updatedCategories = localCategories.filter((cat) => cat.id !== idToDelete);
        await updateFirestore(updatedCategories, `Removed "${categoryNameToDelete}".`);
    }
  };

  const handleUpdateName = (id: string, value: string) => {
    const updatedCategories = localCategories.map((cat) =>
      cat.id === id ? { ...cat, name: value } : cat
    );
    setLocalCategories(updatedCategories);
  };
  
  const handleSaveChangesForCategory = async (id: string) => {
    const categoryToSave = localCategories.find((t) => t.id === id);
    if (!categoryToSave) return;

    const isDuplicate = localCategories.some(c => c.id !== id && c.name.toLowerCase() === categoryToSave.name.toLowerCase());
    if (isDuplicate) {
        showErrorToast(`Category name "${categoryToSave.name}" already exists.`);
        // Revert local state
        if (categoriesData) setLocalCategories(categoriesData.categories || []);
        return;
    }

    const currentDataInFirestore = categoriesData?.categories?.find((t) => t.id === id);
    if (JSON.stringify(categoryToSave) === JSON.stringify(currentDataInFirestore)) {
      return;
    }

    const sortedCategories = [...localCategories].sort((a,b) => a.name.localeCompare(b.name));
    await updateFirestore(sortedCategories, 'Changes saved successfully.');
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
        <CardTitle>Manage Expense Categories</CardTitle>
        <CardDescription>
          Add, remove, or edit the available expense categories.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {localCategories.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-2">
              {localCategories.map((category) => (
                <AccordionItem
                  value={category.id}
                  key={category.id}
                  className="p-4 border rounded-lg"
                >
                  <AccordionTrigger className="flex justify-between w-full p-0 hover:no-underline">
                    <span className="font-semibold text-left">{category.name}</span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCategory(category.id)}
                      disabled={isSubmitting}
                      className="absolute top-2 right-2 text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="space-y-2">
                      <Label htmlFor={`name-${category.id}`}>Category Name</Label>
                      <Input
                        id={`name-${category.id}`}
                        value={category.name}
                        onChange={(e) => handleUpdateName(category.id, e.target.value)}
                        onBlur={() => handleSaveChangesForCategory(category.id)}
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
              No expense categories defined.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 pt-4 border-t">
          <Input
            placeholder="New category name..."
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            disabled={isSubmitting}
          />
          <Button
            onClick={handleAddCategory}
            size="sm"
            disabled={isSubmitting || !newCategoryName}
          >
            {isSubmitting && newCategoryName ? (
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
