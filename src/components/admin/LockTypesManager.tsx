'use client';

import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-collection';
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
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function LockTypesManager() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newLockType, setNewLockType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lockTypesDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'siteConfiguration', 'lockTypes') : null),
    [firestore, user]
  );

  const {
    data: lockTypesData,
    isLoading,
    error,
  } = useDoc<{ options: string[] }>(lockTypesDocRef);

  const [lockTypes, setLockTypes] = useState<string[]>([]);

  useEffect(() => {
    if (lockTypesData?.options) {
      setLockTypes(lockTypesData.options);
    } else if (!isLoading && !lockTypesData) {
      setLockTypes([]);
    }
  }, [lockTypesData, isLoading]);
  
  const showSuccessToast = (description: string) => {
    toast({
      title: 'Success',
      description,
    });
  };

  const showErrorToast = (description: string) => {
    toast({
      variant: 'destructive',
      title: 'Error',
      description,
    });
  };

  const updateFirestore = async (updatedTypes: string[]) => {
    if (!lockTypesDocRef) return false;
    setIsSubmitting(true);
    try {
      await setDoc(lockTypesDocRef, { options: updatedTypes }, { merge: true });
      return true;
    } catch (e) {
      showErrorToast('Failed to save changes.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddLockType = async () => {
    if (newLockType && !lockTypes.includes(newLockType)) {
      const updatedTypes = [...lockTypes, newLockType];
      const success = await updateFirestore(updatedTypes);
      if (success) {
        setLockTypes(updatedTypes);
        setNewLockType('');
        showSuccessToast(`Added "${newLockType}".`);
      }
    }
  };

  const handleDeleteLockType = async (typeToDelete: string) => {
    const updatedTypes = lockTypes.filter((type) => type !== typeToDelete);
    const success = await updateFirestore(updatedTypes);
    if(success) {
      setLockTypes(updatedTypes);
      showSuccessToast(`Removed "${typeToDelete}".`);
    }
  };

  const handleEditLockType = async (index: number, value: string) => {
    const updatedTypes = [...lockTypes];
    updatedTypes[index] = value;
    const success = await updateFirestore(updatedTypes);
    if(success) {
      setLockTypes(updatedTypes);
      showSuccessToast('Lock type updated.');
    }
  }


  if (isLoading) {
    return <Loader2 className="mx-auto h-8 w-8 animate-spin" />;
  }

  if (error) {
    return <p className="text-destructive">Error: {error.message}</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Door Lock Types</CardTitle>
        <CardDescription>
          Add or remove the available door lock types for the platform. Changes are saved automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {lockTypes.map((type, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={type}
                onChange={(e) => {
                  const newTypes = [...lockTypes];
                  newTypes[index] = e.target.value;
                  setLockTypes(newTypes);
                }}
                onBlur={(e) => handleEditLockType(index, e.target.value)}
                disabled={isSubmitting}
                className="flex-grow"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteLockType(type)}
                disabled={isSubmitting}
                className="text-destructive hover:text-destructive/80"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {lockTypes.length === 0 && (
             <p className="text-sm text-muted-foreground text-center py-4">No lock types defined.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="New lock type..."
            value={newLockType}
            onChange={(e) => setNewLockType(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddLockType()}
            disabled={isSubmitting}
          />
          <Button onClick={handleAddLockType} size="sm" disabled={isSubmitting}>
            {isSubmitting && newLockType ? (
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
