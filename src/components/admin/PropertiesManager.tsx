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

export function PropertiesManager() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newProperty, setNewProperty] = useState('');

  const propertiesDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'siteConfiguration', 'properties') : null),
    [firestore, user]
  );
  const {
    data: propertiesData,
    isLoading,
    error,
  } = useDoc<{ options: string[] }>(propertiesDocRef);

  const [properties, setProperties] = useState<string[]>([]);

  useEffect(() => {
    if (propertiesData?.options) {
      setProperties(propertiesData.options);
    } else if (!isLoading && !propertiesData) {
      setProperties([]);
    }
  }, [propertiesData, isLoading]);

  const handleSave = async () => {
    if (!propertiesDocRef) return;
    try {
      await setDoc(propertiesDocRef, { options: properties }, { merge: true });
      toast({
        title: 'Success',
        description: 'Properties saved successfully.',
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save properties.',
      });
    }
  };

  const handleAddProperty = () => {
    if (newProperty && !properties.includes(newProperty)) {
      setProperties([...properties, newProperty]);
      setNewProperty('');
    }
  };

  const handleDeleteProperty = (typeToDelete: string) => {
    setProperties(properties.filter((type) => type !== typeToDelete));
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
        <CardTitle>Manage Properties</CardTitle>
        <CardDescription>
          Add, edit, or remove the available properties for the platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {properties.map((type, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={type}
                onChange={(e) => {
                  const newTypes = [...properties];
                  newTypes[index] = e.target.value;
                  setProperties(newTypes);
                }}
                className="flex-grow"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteProperty(type)}
                className="text-destructive hover:text-destructive/80"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {properties.length === 0 && (
             <p className="text-sm text-muted-foreground text-center py-4">No properties defined.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="New property..."
            value={newProperty}
            onChange={(e) => setNewProperty(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddProperty()}
          />
          <Button onClick={handleAddProperty} size="sm">
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
