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
import { migrateDoorCodes } from '@/ai/flows/migrate-door-codes-flow';
import { listCollections } from '@/ai/flows/list-collections-flow';
import { Loader2, DatabaseZap, List, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function DataMigrationManager() {
  const { toast } = useToast();
  const [isMigrating, setIsMigrating] = useState(false);
  const [isListing, setIsListing] = useState(false);
  const [collections, setCollections] = useState<string[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const handleMigration = async () => {
    setIsMigrating(true);
    try {
      const result = await migrateDoorCodes();
      if (result.success) {
        toast({
          title: 'Migration Successful',
          description: result.message,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast({
        variant: 'destructive',
        title: 'Migration Failed',
        description: errorMessage,
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleListCollections = async () => {
    setIsListing(true);
    setCollections(null);
    setListError(null);
    try {
      const result = await listCollections();
      if (result.success && result.collections) {
        setCollections(result.collections);
        toast({
          title: 'Collections Found',
          description: 'Successfully listed top-level collections.',
        });
      } else {
        throw new Error(result.message || 'Failed to list collections.');
      }
    } catch (error) {
       const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred.';
       setListError(errorMessage);
    } finally {
      setIsListing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Utilities</CardTitle>
        <CardDescription>
          Use these tools to diagnose and migrate your Firestore data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            <h3 className="font-semibold">1. Find Collections</h3>
            <p className="text-sm text-muted-foreground">First, run this to see all top-level collections in your database. This will help us find the right path.</p>
            <Button onClick={handleListCollections} disabled={isListing}>
            {isListing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <List className="mr-2 h-4 w-4" />
            )}
            {isListing ? 'Listing...' : 'List Top-Level Collections'}
            </Button>
            {listError && (
                 <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Listing Failed</AlertTitle>
                    <AlertDescription>
                        <pre className="text-xs whitespace-pre-wrap font-mono">{listError}</pre>
                    </AlertDescription>
                </Alert>
            )}
            {collections && (
                <Alert className="mt-4">
                    <AlertTitle>Found Collections:</AlertTitle>
                    <AlertDescription>
                        <ul className="list-disc pl-5 font-mono text-sm">
                            {collections.map(c => <li key={c}>{c}</li>)}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}
        </div>
         <div className="space-y-2 pt-4 border-t">
            <h3 className="font-semibold">2. Migrate Door Codes</h3>
            <p className="text-sm text-muted-foreground">
                Once you have identified the correct path, this script will move existing door codes to the new top-level `doorCodes` collection.
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
