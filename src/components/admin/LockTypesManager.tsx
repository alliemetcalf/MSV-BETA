'use client';

import * as React from 'react';
import { useFirestore, useMemoFirebase, useUser, useStorage, useDoc, useAuth } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
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
  Image as ImageIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DoorLockType } from '@/types/door-code';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';

function ImageUploader({
  type,
  onUploadComplete,
}: {
  type: DoorLockType;
  onUploadComplete: (id: string, url: string) => void;
}) {
  const storage = useStorage();
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = (file: File) => {
    if(!storage) return;
    setIsUploading(true);
    setUploadProgress(0);

    const storageRef = ref(
      storage,
      `lock-type-instructions/${type.id}/${file.name}`
    );
    
    // The missing piece: metadata with content type
    const metadata = {
      contentType: file.type,
    };

    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        setIsUploading(false);
        setUploadProgress(null);
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: error.message,
        });
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          onUploadComplete(type.id, downloadURL);
          setIsUploading(false);
          setUploadProgress(null);
          toast({
            title: 'Upload Complete',
            description: 'Image has been successfully uploaded.',
          });
        });
      }
    );
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`imageUrl-${type.id}`}>Instruction Image</Label>
      <div
        className="relative w-full aspect-video border rounded-md flex items-center justify-center bg-muted/50 cursor-pointer hover:bg-muted"
        onClick={() => fileInputRef.current?.click()}
      >
        {type.instructionImageUrl ? (
          <Image
            src={type.instructionImageUrl}
            alt={`${type.name} instruction sheet`}
            fill
            className="object-contain rounded-md"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <span>Click to upload</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          id={`imageUrl-${type.id}`}
          type="file"
          accept="image/jpeg,image/png,image/tiff"
          className="hidden"
          onChange={handleFileSelect}
          disabled={isUploading}
        />
      </div>
      {isUploading && uploadProgress !== null && (
        <div className="flex items-center gap-2">
          <Progress value={uploadProgress} className="w-full" />
          <span className="text-sm text-muted-foreground">
            {Math.round(uploadProgress)}%
          </span>
        </div>
      )}
    </div>
  );
}

export function LockTypesManager() {
  const auth = useAuth();
  const { user } = useUser(auth);
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newLockTypeName, setNewLockTypeName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lockTypesDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'siteConfiguration', 'lockTypes') : null),
    [firestore, user]
  );

  const {
    data: lockTypesData,
    isLoading,
    error,
  } = useDoc<{ types: DoorLockType[] }>(lockTypesDocRef);

  const [lockTypes, setLockTypes] = useState<DoorLockType[]>([]);

  useEffect(() => {
    if (isLoading || !firestore) return;
    if (error) {
      console.error('Error loading lock types:', error);
      return;
    }

    if (lockTypesData) {
      // Data exists, check if it's the old string[] format
      if (
        lockTypesData.types &&
        lockTypesData.types.length > 0 &&
        typeof lockTypesData.types[0] === 'string'
      ) {
        const migratedTypes = (lockTypesData.types as unknown as string[]).map(
          (name, index) => ({
            id: `${Date.now()}-${index}`,
            name,
            textInstructions: '',
            instructionImageUrl: '',
          })
        );
        setLockTypes(migratedTypes);
        if (lockTypesDocRef) {
          setDoc(lockTypesDocRef, { types: migratedTypes }, { merge: true })
            .then(() =>
              toast({
                title: 'Data Migrated',
                description: 'Lock types updated to new format.',
              })
            )
            .catch((e) =>
              toast({
                variant: 'destructive',
                title: 'Migration Failed',
                description: e.message,
              })
            );
        }
      } else {
        // Data is in the new DoorLockType[] format (or is an empty array)
        setLockTypes(lockTypesData.types || []);
      }
    } else if (!lockTypesData && !isLoading) {
      // Document does not exist yet. Initialize with empty array locally.
      setLockTypes([]);
      // Create the document with empty 'types' array if it doesn't exist
      if (lockTypesDocRef) {
        setDoc(lockTypesDocRef, { types: [] }, { merge: true });
      }
    }
  }, [lockTypesData, isLoading, error, lockTypesDocRef, toast, firestore]);

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

  const updateFirestore = async (
    updatedTypes: DoorLockType[],
    showToast = true
  ) => {
    if (!lockTypesDocRef) return false;
    setIsSubmitting(true);
    try {
      await setDoc(lockTypesDocRef, { types: updatedTypes }, { merge: true });
      if (showToast) showSuccessToast('Changes saved successfully.');
      return true;
    } catch (e) {
      showErrorToast('Failed to save changes.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddLockType = async () => {
    if (newLockTypeName && !lockTypes.some((t) => t.name === newLockTypeName)) {
      const newType: DoorLockType = {
        id: new Date().toISOString(), // simple unique id
        name: newLockTypeName,
        textInstructions: '',
        instructionImageUrl: '',
      };
      const updatedTypes = [...lockTypes, newType];
      const success = await updateFirestore(updatedTypes, false);
      if (success) {
        setLockTypes(updatedTypes);
        setNewLockTypeName('');
        showSuccessToast(`Added "${newLockTypeName}".`);
      }
    }
  };

  const handleDeleteLockType = async (idToDelete: string) => {
    const typeNameToDelete =
      lockTypes.find((t) => t.id === idToDelete)?.name || 'item';
    const updatedTypes = lockTypes.filter((type) => type.id !== idToDelete);
    const success = await updateFirestore(updatedTypes, false);
    if (success) {
      setLockTypes(updatedTypes);
      showSuccessToast(`Removed "${typeNameToDelete}".`);
    }
  };

  const handleUpdateField = (
    id: string,
    field: 'name' | 'textInstructions',
    value: string
  ) => {
    const updatedTypes = lockTypes.map((type) =>
      type.id === id ? { ...type, [field]: value } : type
    );
    setLockTypes(updatedTypes);
  };

  const handleUploadComplete = async (id: string, url: string) => {
    const updatedTypes = lockTypes.map((type) =>
      type.id === id ? { ...type, instructionImageUrl: url } : type
    );
    const success = await updateFirestore(updatedTypes, false);
    if (success) {
      setLockTypes(updatedTypes);
    }
  };

  const handleSaveChangesForType = async (id: string) => {
    const typeToSave = lockTypes.find((t) => t.id === id);
    if (!typeToSave) return;

    const currentDataInFirestore = lockTypesData?.types?.find(
      (t) => t.id === id
    );

    // Only save if there is a change
    if (JSON.stringify(typeToSave) === JSON.stringify(currentDataInFirestore)) {
      return;
    }

    const updatedTypes = lockTypesData?.types
      ? lockTypesData.types.map((t) => (t.id === id ? typeToSave : t))
      : [typeToSave];

    await updateFirestore(updatedTypes);
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
          Add, remove, or edit the available door lock types for the platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {lockTypes.map((type) => (
            <div
              key={type.id}
              className="p-4 border rounded-lg space-y-4 relative"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteLockType(type.id)}
                disabled={isSubmitting}
                className="absolute top-2 right-2 text-destructive hover:text-destructive/80"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="space-y-2">
                <Label htmlFor={`name-${type.id}`}>Lock Type Name</Label>
                <Input
                  id={`name-${type.id}`}
                  value={type.name}
                  onChange={(e) =>
                    handleUpdateField(type.id, 'name', e.target.value)
                  }
                  onBlur={() => handleSaveChangesForType(type.id)}
                  disabled={isSubmitting}
                  className="flex-grow font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`instructions-${type.id}`}>
                  Text Instructions
                </Label>
                <Textarea
                  id={`instructions-${type.id}`}
                  value={type.textInstructions || ''}
                  onChange={(e) =>
                    handleUpdateField(
                      type.id,
                      'textInstructions',
                      e.target.value
                    )
                  }
                  onBlur={() => handleSaveChangesForType(type.id)}
                  placeholder="Enter step-by-step instructions..."
                  disabled={isSubmitting}
                />
              </div>
              <ImageUploader
                type={type}
                onUploadComplete={handleUploadComplete}
              />
            </div>
          ))}
          {lockTypes.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No lock types defined.
            </p>
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
          <Button
            onClick={handleAddLockType}
            size="sm"
            disabled={isSubmitting || !newLockTypeName}
          >
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
