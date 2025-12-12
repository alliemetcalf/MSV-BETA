'use client';
import { useEffect, useState, useCallback } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth, useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { UserProfile } from '@/types/user-profile';
import { collection, doc, updateDoc } from 'firebase/firestore';

export function UserRoleManager() {
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const currentUserUid = auth?.currentUser?.uid;

  const usersCollectionRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  
  const userProfileRef = useMemoFirebase(
    () => (currentUserUid ? doc(firestore, 'users', currentUserUid) : null),
    [firestore, currentUserUid]
  );
  const { data: currentUserProfile } = useDoc<UserProfile>(userProfileRef);


  const { data: users, isLoading, error, refetch } = useCollection<UserProfile>(usersCollectionRef);

  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});

  const sortedUsers = users?.sort((a,b) => (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '')) || [];

  const handleRoleChange = async (uid: string, newRole: UserProfile['role']) => {
    if (!newRole || !firestore) {
       toast({
           variant: 'destructive',
           title: 'Invalid Role',
           description: 'Please select a valid role.',
       });
       return;
    }
    
    setIsUpdating((prev) => ({ ...prev, [uid]: true }));
    try {
        const userDocRef = doc(firestore, 'users', uid);
        await updateDoc(userDocRef, { role: newRole });
        toast({
            title: 'Role Updated',
            description: "User's role has been successfully changed.",
        });
        refetch(); // Refetch to show the updated role
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: e.message,
      });
    } finally {
      setIsUpdating((prev) => ({ ...prev, [uid]: false }));
    }
  };
  
  const canManageRoles = currentUserProfile?.role === 'superadmin';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>User Role Management</CardTitle>
            <CardDescription>View and manage user roles.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={refetch} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
           <div className="text-center text-destructive py-8">
            <p>Error loading users:</p>
            <p className="text-sm">{error.message}</p>
          </div>
        ) : sortedUsers.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No users found in the 'users' collection.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.displayName || user.email || 'N/A'}</TableCell>
                  <TableCell>
                    {isUpdating[user.id] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Select
                        value={user.role}
                        onValueChange={(newRole: any) =>
                          handleRoleChange(user.id, newRole)
                        }
                        disabled={!canManageRoles || user.id === currentUserUid}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="contractor">Contractor</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="superadmin">Super Admin</SelectItem>
                          {user.role === 'admin' && <SelectItem value="admin" disabled>Admin (Invalid)</SelectItem>}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
