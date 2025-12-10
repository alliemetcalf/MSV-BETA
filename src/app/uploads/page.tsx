
'use client';

import { useState, useEffect, useRef } from 'react';
import { useStorage, useUser } from '@/firebase';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  listAll,
  StorageReference,
  UploadTask,
} from 'firebase/storage';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
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
import { Loader2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UploadedFile {
  name: string;
  url: string;
}

export default function UploadsPage() {
  const { user, isUserLoading } = useUser();
  const storage = useStorage();
  const router = useRouter();
  const { toast } = useToast();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isListingFiles, setIsListingFiles] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const listFiles = async () => {
    if (!storage || !user) return;
    setIsListingFiles(true);
    try {
      const listRef = ref(storage, '');
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

  useEffect(() => {
    if (storage && user) {
      listFiles();
    }
  }, [storage, user]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = (file: File) => {
    if (!storage) {
      toast({
        variant: 'destructive',
        title: 'Upload Error',
        description: 'Storage service is not available.',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const storageRef = ref(storage, file.name);
    const metadata = { contentType: file.type };
    const uploadTask: UploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        setIsUploading(false);
        console.error('Upload Error:', error);
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: error.message,
        });
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then(() => {
          toast({
            title: 'Upload Complete',
            description: `${file.name} has been successfully uploaded.`,
          });
          setIsUploading(false);
          listFiles(); // Refresh the file list
        });
      }
    );
  };
  
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
            <CardTitle>File Upload</CardTitle>
            <CardDescription>
              Upload a file to Firebase Storage and view all uploaded files.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? 'Uploading...' : 'Choose File to Upload'}
            </Button>
            {isUploading && (
              <div className="space-y-2">
                 <Progress value={uploadProgress} className="w-full" />
                 <p className="text-sm text-muted-foreground text-center">{Math.round(uploadProgress)}%</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uploaded Files</CardTitle>
            <CardDescription>
              List of files in the root of your storage bucket.
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
