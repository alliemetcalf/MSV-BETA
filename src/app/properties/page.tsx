'use client';

import { useState, useEffect } from 'react';
import {
  useUser,
  useFirestore,
  useMemoFirebase,
  useCollection,
  useAuth,
} from '@/firebase';
import { collection } from 'firebase/firestore';
import { MainLayout } from '@/components/MainLayout';
import Image from 'next/image';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Loader2, Building, MapPin } from 'lucide-react';
import { Property } from '@/types/property';
import { useRouter } from 'next/navigation';

export default function PropertiesPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser(auth);
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const propertiesCollectionRef = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'properties') : null),
    [firestore, user]
  );

  const {
    data: properties,
    isLoading: propertiesLoading,
    error: propertiesError,
  } = useCollection<Property>(propertiesCollectionRef);

  const sortedProperties = React.useMemo(() => {
    return properties ? [...properties].sort((a, b) => a.name.localeCompare(b.name)) : [];
  }, [properties]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="w-full max-w-6xl px-4">
        <Card>
          <CardHeader>
            <CardTitle>Properties</CardTitle>
            <CardDescription>
              A directory of all managed properties.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {propertiesLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="mx-auto h-8 w-8 animate-spin" />
              </div>
            )}
            {propertiesError && (
              <p className="text-destructive text-center py-8">Error: {propertiesError.message}</p>
            )}
            {!propertiesLoading && sortedProperties.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sortedProperties.map((property) => (
                  <Card key={property.id} className="overflow-hidden flex flex-col">
                    <div className="relative w-full aspect-video bg-muted">
                      {property.photoUrl ? (
                         <Image
                          src={property.photoUrl}
                          alt={`Photo of ${property.name}`}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                           <Building className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardHeader>
                      <CardTitle>{property.name}</CardTitle>
                      {property.address && (
                        <CardDescription className="flex items-center gap-2 pt-1">
                          <MapPin className="w-4 h-4" />
                          {property.address}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-sm text-muted-foreground line-clamp-4">
                        {property.description || 'No description available.'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              !propertiesLoading && (
                <div className="text-center text-muted-foreground py-8">
                  No properties found. Admins can add properties from the Admin page.
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
