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
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface UploadedFile {
  name: string;
  url: string;
}

export default function UploadTestPage() {
  const { user, isUserLoading } = useUser();
  const storage = useStorage();
  const router = useRouter();
  const { toast } = useToast();

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isListingFiles, setIsListingFiles] = useState(true);

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
      try {
        const listRef = ref(storage, ''); // List root directory
        const res = await listAll(listRef);
        
        const files = await Promise.all(
          res.items.map(async (itemRef) => {
            const url = await getDownloadURL(itemRef);
            return { name: itemRef.name, url };
          })
        );
        setUploadedFiles(files);
      } catch (error) {
        console.error('Error listing files:', error);
        toast({
          variant: 'destructive',
          title: 'Error listing files',
          description:
            error instanceof Error ? error.message : 'An unknown error occurred.',
        });
      } finally {
        setIsListingFiles(false);
      }
    };
    
    if(!isUserLoading) {
      listFiles();
    }
  }, [storage, user, isUserLoading, toast]);
  
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
            {isListingFiles ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
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
                        No files found.
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
