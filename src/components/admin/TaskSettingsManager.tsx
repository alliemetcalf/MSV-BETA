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
import { TaskType } from '@/types/contractor-task';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Label } from '../ui/label';

interface ContractorTasksConfiguration {
    mileageRate: number;
    taskTypes: TaskType[];
}

export function TaskSettingsManager() {
  const auth = useAuth();
  const { user } = useUser(auth);
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newTypeName, setNewTypeName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const settingsDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'siteConfiguration', 'contractorTasks') : null),
    [firestore, user]
  );

  const {
    data: settingsData,
    isLoading,
    error,
  } = useDoc<ContractorTasksConfiguration>(settingsDocRef);

  const [localSettings, setLocalSettings] = useState<ContractorTasksConfiguration>({ mileageRate: 0.70, taskTypes: []});

  useEffect(() => {
    if (settingsData) {
      setLocalSettings({
          mileageRate: settingsData.mileageRate || 0.70,
          taskTypes: settingsData.taskTypes || []
      });
    } else if (!isLoading && !settingsData) {
      setLocalSettings({ mileageRate: 0.70, taskTypes: [] });
    }
  }, [settingsData, isLoading]);
  
  const showSuccessToast = (description: string) => {
    toast({ title: 'Success', description, duration: 5000 });
  };

  const showErrorToast = (description: string) => {
    toast({ variant: 'destructive', title: 'Error', description });
  };

  const updateFirestore = async (
    updatedSettings: ContractorTasksConfiguration,
    successMessage?: string
  ) => {
    if (!settingsDocRef) return;
    setIsSubmitting(true);
    try {
      await setDoc(settingsDocRef, updatedSettings, { merge: true });
      if (successMessage) showSuccessToast(successMessage);
    } catch (e) {
      showErrorToast('Failed to save changes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddType = async () => {
    if (newTypeName && !localSettings.taskTypes.some((t) => t.name.toLowerCase() === newTypeName.toLowerCase())) {
      const newType: TaskType = {
        id: new Date().toISOString(),
        name: newTypeName,
      };
      const updatedTypes = [...localSettings.taskTypes, newType].sort((a,b) => a.name.localeCompare(b.name));
      await updateFirestore({ ...localSettings, taskTypes: updatedTypes }, `Added "${newTypeName}".`);
      setNewTypeName('');
    } else {
        showErrorToast('Task type name cannot be empty or already exist.');
    }
  };

  const handleDeleteType = async (idToDelete: string) => {
    const typeNameToDelete = localSettings.taskTypes.find((t) => t.id === idToDelete)?.name || 'item';
    if(confirm(`Are you sure you want to delete the "${typeNameToDelete}" task type? This cannot be undone.`)){
        const updatedTypes = localSettings.taskTypes.filter((t) => t.id !== idToDelete);
        await updateFirestore({ ...localSettings, taskTypes: updatedTypes }, `Removed "${typeNameToDelete}".`);
    }
  };

  const handleUpdateName = (id: string, value: string) => {
    const updatedTypes = localSettings.taskTypes.map((t) =>
      t.id === id ? { ...t, name: value } : t
    );
    setLocalSettings(prev => ({...prev, taskTypes: updatedTypes}));
  };
  
  const handleSaveChangesForType = async (id: string) => {
    const typeToSave = localSettings.taskTypes.find((t) => t.id === id);
    if (!typeToSave) return;

    const isDuplicate = localSettings.taskTypes.some(t => t.id !== id && t.name.toLowerCase() === typeToSave.name.toLowerCase());
    if (isDuplicate) {
        showErrorToast(`Task type name "${typeToSave.name}" already exists.`);
        if (settingsData) setLocalSettings(prev => ({...prev, taskTypes: settingsData.taskTypes || []}));
        return;
    }

    const currentDataInFirestore = settingsData?.taskTypes?.find((t) => t.id === id);
    if (JSON.stringify(typeToSave) === JSON.stringify(currentDataInFirestore)) {
      return;
    }

    const sortedTypes = [...localSettings.taskTypes].sort((a,b) => a.name.localeCompare(b.name));
    await updateFirestore({ ...localSettings, taskTypes: sortedTypes }, 'Task type changes saved successfully.');
  };

  const handleMileageRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rate = parseFloat(e.target.value);
      if (!isNaN(rate)) {
          setLocalSettings(prev => ({...prev, mileageRate: rate}));
      }
  }
  
  const handleSaveMileageRate = async () => {
    if (localSettings.mileageRate === settingsData?.mileageRate) return;
    await updateFirestore(localSettings, `Mileage rate updated to $${localSettings.mileageRate.toFixed(2)}.`);
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
        <CardTitle>Manage Task Settings</CardTitle>
        <CardDescription>
          Set the global mileage rate and predefined task types.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
            <Label htmlFor="mileageRate">Global Mileage Rate ($)</Label>
            <div className="flex items-center gap-2">
            <Input
                id="mileageRate"
                type="number"
                step="0.01"
                value={localSettings.mileageRate}
                onChange={handleMileageRateChange}
                onBlur={handleSaveMileageRate}
                disabled={isSubmitting}
            />
            </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium">Task Types</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {localSettings.taskTypes.length > 0 ? (
                    <Accordion type="multiple" className="w-full space-y-2">
                    {localSettings.taskTypes.map((type) => (
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
                            <Label htmlFor={`name-${type.id}`}>Type Name</Label>
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
                    No task types defined.
                    </p>
                )}
            </div>
            <div className="flex items-center gap-2 pt-4 border-t">
                <Input
                    placeholder="New task type name..."
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
        </div>
      </CardContent>
    </Card>
  );
}
