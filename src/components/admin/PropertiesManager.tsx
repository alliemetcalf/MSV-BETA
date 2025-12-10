'use client';

import { useFirestore, useUser, useDoc, useMemoFirebase, useAuth } from '@/firebase';
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
  const auth = useAuth();
  const { user } = useUser(auth);
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newProperty, setNewProperty] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const propertiesDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'siteConfiguration', 'properties') : null),
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

  const updateFirestore = async (updatedProperties: string[]) => {
    if (!propertiesDocRef) return false;
    setIsSubmitting(true);
    try {
      await setDoc(propertiesDocRef, { options: updatedProperties }, { merge: true });
      return true;
    } catch (e) {
      showErrorToast('Failed to save changes.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddProperty = async () => {
    if (newProperty && !properties.includes(newProperty)) {
      const updatedProperties = [...properties, newProperty];
      const success = await updateFirestore(updatedProperties);
      if (success) {
        setProperties(updatedProperties);
        setNewProperty('');
        showSuccessToast(`Added "${newProperty}".`);
      }
    }
  };

  const handleDeleteProperty = async (propertyToDelete: string) => {
    const updatedProperties = properties.filter((prop) => prop !== propertyToDelete);
    const success = await updateFirestore(updatedProperties);
    if(success) {
      setProperties(updatedProperties);
      showSuccessToast(`Removed "${propertyToDelete}".`);
    }
  };

  const handleEditProperty = async (index: number, value: string) => {
    const updatedProperties = [...properties];
    updatedProperties[index] = value;
    const success = await updateFirestore(updatedProperties);
    if(success) {
      setProperties(updatedProperties);
      showSuccessToast('Property updated.');
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
        <CardTitle>Manage Properties</CardTitle>
        <CardDescription>
          Add or remove the available properties for the platform. Changes are saved automatically.
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
                onBlur={(e) => handleEditProperty(index, e.target.value)}
                disabled={isSubmitting}
                className="flex-grow"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteProperty(type)}
                disabled={isSubmitting}
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
            disabled={isSubmitting}
          />
          <Button onClick={handleAddProperty} size="sm" disabled={isSubmitting}>
             {isSubmitting && newProperty ? (
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
