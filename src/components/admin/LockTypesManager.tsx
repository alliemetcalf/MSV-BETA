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
      // If there's no data and we're not loading, it might be an empty state
      setLockTypes([]);
    }
  }, [lockTypesData, isLoading]);

  const handleSave = async () => {
    if (!lockTypesDocRef) return;
    try {
      await setDoc(lockTypesDocRef, { options: lockTypes }, { merge: true });
      toast({
        title: 'Success',
        description: 'Lock types saved successfully.',
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save lock types.',
      });
    }
  };

  const handleAddLockType = () => {
    if (newLockType && !lockTypes.includes(newLockType)) {
      setLockTypes([...lockTypes, newLockType]);
      setNewLockType('');
    }
  };

  const handleDeleteLockType = (typeToDelete: string) => {
    setLockTypes(lockTypes.filter((type) => type !== typeToDelete));
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
        <CardTitle>Manage Door Lock Types</CardTitle>
        <CardDescription>
          Add, edit, or remove the available door lock types for the entire
          platform.
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
                className="flex-grow"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteLockType(type)}
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
          />
          <Button onClick={handleAddLockType} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
        <div>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </CardContent>
    </Card>
  );
}
