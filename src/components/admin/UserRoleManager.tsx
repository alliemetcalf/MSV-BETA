'use client';
import { useEffect, useState } from 'react';
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
import { listUsers, ListUsersOutput } from '@/ai/flows/list-users-flow';
import { updateUserRole } from '@/ai/flows/update-user-role-flow';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { getAuth } from 'firebase/auth';

type User = ListUsersOutput[0];

export function UserRoleManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const userList = await listUsers();
      setUsers(userList);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load users',
        description: 'Could not retrieve user list.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (uid: string, newRole: 'admin' | 'user' | 'assistant') => {
    setIsUpdating((prev) => ({ ...prev, [uid]: true }));
    try {
      const result = await updateUserRole({ uid, role: newRole });
      if (result.success) {
        // Find the user in the list and update their role locally
        const updatedUsers = users.map((user) =>
          user.uid === uid ? { ...user, role: newRole } : user
        );
        setUsers(updatedUsers);

        // Force a token refresh for the current user if they are the one being changed
        const auth = getAuth();
        if (auth.currentUser && auth.currentUser.uid === uid) {
          await auth.currentUser.getIdTokenResult(true);
        }

        toast({
          title: 'Role Updated',
          description: "User role has been successfully changed. The user may need to log in again for it to take full effect.",
        });
      } else {
        throw new Error(result.message || 'Failed to update role.');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: errorMessage,
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
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    {isUpdating[user.uid] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Select
                        value={user.role}
                        onValueChange={(newRole: 'admin' | 'user' | 'assistant') =>
                          handleRoleChange(user.uid, newRole)
                        }
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="assistant">Assistant</SelectItem>
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
