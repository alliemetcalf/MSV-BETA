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
import { Loader2, DatabaseZap } from 'lucide-react';

export function DataMigrationManager() {
  const { toast } = useToast();
  const [isMigrating, setIsMigrating] = useState(false);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Door Code Migration</CardTitle>
        <CardDescription>
          Run this one-time script to move existing door codes from user subcollections to a new top-level `doorCodes` collection.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleMigration} disabled={isMigrating}>
          {isMigrating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <DatabaseZap className="mr-2 h-4 w-4" />
          )}
          {isMigrating ? 'Migrating...' : 'Migrate Door Codes'}
        </Button>
      </CardContent>
    </Card>
  );
}
