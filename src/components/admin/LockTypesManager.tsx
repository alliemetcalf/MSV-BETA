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
import { DoorLockType } from '@/types/door-code';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

export function LockTypesManager() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newLockTypeName, setNewLockTypeName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lockTypesDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'siteConfiguration', 'lockTypes') : null),
    [firestore, user]
  );

  const {
    data: lockTypesData,
    isLoading,
    error,
  } = useDoc<{ types: DoorLockType[] | string[] }>(lockTypesDocRef);

  const [lockTypes, setLockTypes] = useState<DoorLockType[]>([]);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    
    const rawTypes = lockTypesData?.types;

    if (rawTypes && rawTypes.length > 0) {
      // Check if migration is needed
      if (typeof rawTypes[0] === 'string') {
        const migratedTypes = (rawTypes as string[]).map(
          (name, index) => ({
            id: `${Date.now()}-${index}`, // More robust unique ID
            name,
            textInstructions: '',
            instructionImageUrl: '',
          })
        );
        // Set state immediately to update UI
        setLockTypes(migratedTypes);
        // Update Firestore in the background
        if (lockTypesDocRef) {
          setDoc(lockTypesDocRef, { types: migratedTypes }, { merge: true })
            .then(() => {
              toast({
                title: 'Data Migrated',
                description: 'Your lock types have been updated to the new format.',
              });
            })
            .catch((e) => {
              toast({
                variant: 'destructive',
                title: 'Migration Failed',
                description: 'Could not save migrated lock types.',
              });
            });
        }
      } else {
        // Data is in the correct format
        setLockTypes(rawTypes as DoorLockType[]);
      }
    } else {
      // Handle case where there are no types
      setLockTypes([]);
    }
  }, [lockTypesData, isLoading, lockTypesDocRef, toast]);

  const showSuccessToast = (description: string) => {
    toast({
      title: 'Success',
      description,
      duration: 5000,
    });
  };

  const showErrorToast = (description: string) => {
    toast({
      variant: 'destructive',
      title: 'Error',
      description,
    });
  };

  const updateFirestore = async (updatedTypes: DoorLockType[]) => {
    if (!lockTypesDocRef) return false;
    setIsSubmitting(true);
    try {
      await setDoc(lockTypesDocRef, { types: updatedTypes }, { merge: true });
      return true;
    } catch (e) {
      showErrorToast('Failed to save changes.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddLockType = async () => {
    if (newLockTypeName && !lockTypes.some(t => t.name === newLockTypeName)) {
      const newType: DoorLockType = {
        id: new Date().toISOString(), // simple unique id
        name: newLockTypeName,
        textInstructions: '',
        instructionImageUrl: '',
      };
      const updatedTypes = [...lockTypes, newType];
      const success = await updateFirestore(updatedTypes);
      if (success) {
        setLockTypes(updatedTypes);
        setNewLockTypeName('');
        showSuccessToast(`Added "${newLockTypeName}".`);
      }
    }
  };

  const handleDeleteLockType = async (idToDelete: string) => {
    const typeNameToDelete = lockTypes.find(t => t.id === idToDelete)?.name || 'item';
    const updatedTypes = lockTypes.filter((type) => type.id !== idToDelete);
    const success = await updateFirestore(updatedTypes);
    if (success) {
      setLockTypes(updatedTypes);
      showSuccessToast(`Removed "${typeNameToDelete}".`);
    }
  };

  const handleUpdateField = (id: string, field: keyof DoorLockType, value: string) => {
     const updatedTypes = lockTypes.map(type => 
      type.id === id ? { ...type, [field]: value } : type
    );
    setLockTypes(updatedTypes);
  };

  const handleSaveChangesForType = async (id: string) => {
    const typeToSave = lockTypes.find(t => t.id === id);
    if (!typeToSave) return;
    
    // The local state `lockTypes` already has the change from handleUpdateField
    const success = await updateFirestore(lockTypes);
    if (success) {
      showSuccessToast(`Saved changes for "${typeToSave.name}".`);
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
          Add, remove, or edit the available door lock types for the platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {lockTypes.map((type) => (
            <div key={type.id} className="p-4 border rounded-lg space-y-4 relative">
               <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteLockType(type.id)}
                  disabled={isSubmitting}
                  className="absolute top-2 right-2 text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              <div className='space-y-2'>
                <Label htmlFor={`name-${type.id}`}>Lock Type Name</Label>
                <Input
                  id={`name-${type.id}`}
                  value={type.name}
                  onChange={(e) => handleUpdateField(type.id, 'name', e.target.value)}
                  disabled={isSubmitting}
                  className="flex-grow font-semibold"
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor={`instructions-${type.id}`}>Text Instructions</Label>
                <Textarea
                  id={`instructions-${type.id}`}
                  value={type.textInstructions || ''}
                  onChange={(e) => handleUpdateField(type.id, 'textInstructions', e.target.value)}
                  placeholder="Enter step-by-step instructions..."
                  disabled={isSubmitting}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor={`imageUrl-${type.id}`}>Instruction Image URL</Label>
                <Input
                  id={`imageUrl-${type.id}`}
                  value={type.instructionImageUrl || ''}
                  onChange={(e) => handleUpdateField(type.id, 'instructionImageUrl', e.target.value)}
                  placeholder="https://example.com/image.png"
                  disabled={isSubmitting}
                />
              </div>
              <Button
                onClick={() => handleSaveChangesForType(type.id)}
                size="sm"
                disabled={isSubmitting}
                className='w-full'
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes for {type.name}
              </Button>
            </div>
          ))}
          {lockTypes.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-4">No lock types defined.</p>
          )}
        </div>
        <div className="flex items-center gap-2 pt-4 border-t">
          <Input
            placeholder="New lock type name..."
            value={newLockTypeName}
            onChange={(e) => setNewLockTypeName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddLockType()}
            disabled={isSubmitting}
          />
          <Button onClick={handleAddLockType} size="sm" disabled={isSubmitting || !newLockTypeName}>
            {isSubmitting && newLockTypeName ? (
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
