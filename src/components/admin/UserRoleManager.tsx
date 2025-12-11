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
import { useAuth } from '@/firebase';

type User = ListUsersOutput[0];
type Role = 'superadmin' | 'manager' | 'contractor' | 'user' | 'admin';

export function UserRoleManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const auth = useAuth();

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const currentUserUid = auth?.currentUser?.uid;
      const userList = await listUsers();
      // Filter out the current user from the list
      const filteredUsers = userList.filter(user => user.uid !== currentUserUid);
      setUsers(filteredUsers);
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
    if (auth) {
      fetchUsers();
    }
  }, [auth]);

  const handleRoleChange = async (uid: string, newRole: Role) => {
    if (newRole === 'admin') {
        toast({
            variant: 'destructive',
            title: 'Invalid Role',
            description: '"admin" is not a standard role. Please select a different one.',
        });
        return;
    }
    
    setIsUpdating((prev) => ({ ...prev, [uid]: true }));
    try {
      const result = await updateUserRole({ uid, role: newRole as 'superadmin' | 'manager' | 'contractor' | 'user' });
      if (result.success) {
        setUsers((currentUsers) =>
          currentUsers.map((user) =>
            user.uid === uid ? { ...user, role: newRole } : user
          )
        );
        toast({
          title: 'Role Updated',
          description: "User's role has been successfully changed.",
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
      // Re-fetch users to get the correct state from the server on failure
      fetchUsers();
    } finally {
      setIsUpdating((prev) => ({ ...prev, [uid]: false }));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>User Role Management</CardTitle>
            <CardDescription>View and manage user roles. You cannot change your own role.</CardDescription>
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
                        onValueChange={(newRole: Role) =>
                          handleRoleChange(user.uid, newRole)
                        }
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
