'use client';

import { useState, useEffect } from 'react';
import { useStorage, useUser } from '@/firebase';
import {
  ref,
  listAll,
  getDownloadURL,
} from 'firebase/storage';
import { MainLayout } from '@/components/MainLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface UploadedFile {
  name: string;
  url: string;
}

const LIST_TIMEOUT_MS = 15000; // 15 seconds

export default function UploadTestPage() {
  const { user, isUserLoading } = useUser();
  const storage = useStorage();
  const router = useRouter();
  const { toast } = useToast();

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isListingFiles, setIsListingFiles] = useState(true);
  const [errorState, setErrorState] = useState<Error | null>(null);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const listFiles = async () => {
      if (!storage || !user) {
        return;
      }
      
      setIsListingFiles(true);
      setErrorState(null);

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${LIST_TIMEOUT_MS / 1000} seconds. Check storage rules and bucket name.`)), LIST_TIMEOUT_MS)
      );

      try {
        const listRef = ref(storage, ''); // List root directory

        const listResult: any = await Promise.race([
            listAll(listRef),
            timeoutPromise
        ]);
        
        const files = await Promise.all(
          listResult.items.map(async (itemRef: any) => {
            const url = await getDownloadURL(itemRef);
            return { name: itemRef.name, url };
          })
        );
        setUploadedFiles(files);
      } catch (error: any) {
        console.error('CRITICAL: Error listing files:', error);
        setErrorState(error);
        toast({
          variant: 'destructive',
          title: 'Error listing files',
          description: error.message || 'An unknown error occurred.',
        });
      } finally {
        setIsListingFiles(false);
      }
    };
    
    if(storage && user) {
      listFiles();
    }
  }, [storage, user, toast]);
  
  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="w-full max-w-4xl px-4 flex flex-col gap-8">
        <Card>
          <CardHeader>
            <CardTitle>File List Test</CardTitle>
            <CardDescription>
              A simple list of all files found in the root of your storage bucket.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 border rounded-lg bg-muted/50 text-sm">
                <h3 className="font-semibold mb-2">Diagnostics</h3>
                <p>User Loading: {isUserLoading.toString()}</p>
                <p>User Object Present: {(!!user).toString()}</p>
                <p>Storage Object Present: {(!!storage).toString()}</p>
            </div>

            {isListingFiles ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-4">Loading files from bucket...</p>
              </div>
            ) : errorState ? (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>An Error Occurred</AlertTitle>
                    <AlertDescription>
                        <p>Could not list files from the storage bucket.</p>
                        <pre className="mt-2 w-full whitespace-pre-wrap rounded-md bg-destructive/10 p-2 font-mono text-xs">
                           {errorState.message}
                        </pre>
                    </AlertDescription>
                </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadedFiles.length > 0 ? (
                    uploadedFiles.map((file) => (
                      <TableRow key={file.name}>
                        <TableCell className="font-medium">{file.name}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={file.url} target="_blank" rel="noopener noreferrer">
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center">
                        No files found. The request was successful, but the bucket is empty or the rules are preventing listing.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
