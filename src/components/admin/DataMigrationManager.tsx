'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DatabaseZap } from 'lucide-react';
import { useFirestore, useUser, useAuth } from '@/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

export function DataMigrationManager() {
  const { toast } = useToast();
  const [isMigrating, setIsMigrating] = useState(false);
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser(auth);

  const handleMigration = async () => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore is not available or you are not logged in.',
      });
      return;
    }

    setIsMigrating(true);
    let codesMigrated = 0;

    try {
      // Hardcoded, direct path to the source subcollection
      const sourcePath = 'users/Ix3LurGh12PFTTkvS1ompsIEzqb2/doorCodes';
      const sourceCollectionRef = collection(firestore, sourcePath);
      const snapshot = await getDocs(sourceCollectionRef);

      if (snapshot.empty) {
        toast({
          variant: 'destructive',
          title: 'No Documents Found',
          description: `No documents found at path: ${sourcePath}. Please double-check the path.`,
        });
        setIsMigrating(false);
        return;
      }

      const batch = writeBatch(firestore);
      const destinationCollectionRef = collection(firestore, 'doorCodes');
      
      snapshot.forEach(sourceDoc => {
        const newDocRef = doc(destinationCollectionRef); // Create new doc with a new ID in the destination
        batch.set(newDocRef, sourceDoc.data());
        codesMigrated++;
      });

      await batch.commit();

      toast({
        title: 'Migration Successful',
        description: `Successfully migrated ${codesMigrated} door codes to the top-level 'doorCodes' collection.`,
      });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Migration Failed',
        description: error.message || 'An unknown error occurred during migration.',
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Utilities</CardTitle>
        <CardDescription>
          Use this tool to migrate your Firestore data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
         <div className="space-y-2 pt-4 border-t">
            <h3 className="font-semibold">Migrate Door Codes</h3>
            <p className="text-sm text-muted-foreground">
                This script will move existing door codes from a user subcollection to the new top-level `doorCodes` collection.
            </p>
            <Button onClick={handleMigration} disabled={isMigrating}>
            {isMigrating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <DatabaseZap className="mr-2 h-4 w-4" />
            )}
            {isMigrating ? 'Migrating...' : 'Migrate Door Codes'}
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
