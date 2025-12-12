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
import { listUsers, updateUserRole } from '@/ai/flows/list-users-flow';
import { useAuth } from '@/firebase';

type User = {
  uid: string;
  email?: string;
  role?: 'superadmin' | 'manager' | 'contractor' | 'user' | 'admin';
};

export function UserRoleManager() {
  const { toast } = useToast();
  const auth = useAuth();
  const currentUserUid = auth?.currentUser?.uid;

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listUsers();
      if (result.error) {
        throw new Error(result.error);
      }
      const sorted = result.users.sort((a,b) => (a.email || '').localeCompare(b.email || ''));
      setUsers(sorted);
    } catch (e: any) {
      const errorMessage = e.message || 'Could not retrieve user list.';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Failed to load users',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (uid: string, newRole: User['role']) => {
    if (!newRole || newRole === 'admin') {
       toast({
           variant: 'destructive',
           title: 'Invalid Role',
           description: 'Please select a valid role.',
       });
       return;
    }
    
    setIsUpdating((prev) => ({ ...prev, [uid]: true }));
    try {
      const result = await updateUserRole({ uid, role: newRole as any });

      if (result.success) {
        toast({
            title: 'Role Updated',
            description: "User's role has been successfully changed.",
        });
        // Refetch users to show the updated role
        fetchUsers();
      } else {
        throw new Error(result.message || 'An unknown error occurred.');
      }
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>User Role Management</CardTitle>
            <CardDescription>View and manage user roles.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchUsers} disabled={isLoading}>
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
            <p className="text-sm">{error}</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No users found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell className="font-medium">{user.email || 'N/A'}</TableCell>
                  <TableCell>
                    {isUpdating[user.uid] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Select
                        value={user.role}
                        onValueChange={(newRole: any) =>
                          handleRoleChange(user.uid, newRole)
                        }
                        disabled={user.uid === currentUserUid}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="contractor">Contractor</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="superadmin">Super Admin</SelectItem>
                          {/* Only show 'admin' if it's the user's current, invalid role */}
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
