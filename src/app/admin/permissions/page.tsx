'use client';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@/firebase';
import { useEffect } from 'react';

type Role = 'superadmin' | 'manager' | 'contractor' | 'user';

interface Permission {
  page: string;
  path: string;
  superadmin: string;
  manager: string;
  contractor: string;
  user: string;
}

const permissionsData: Permission[] = [
  { page: 'Home', path: '/', superadmin: 'read/write', manager: 'read', contractor: 'read', user: 'read' },
  { page: 'Profile', path: '/profile', superadmin: 'read/write', manager: 'read/write', contractor: 'read/write', user: 'read/write' },
  { page: 'Door Codes', path: '/door-codes', superadmin: 'read/write', manager: 'read/write', contractor: 'none', user: 'none' },
  { page: 'Tenants', path: '/tenants', superadmin: 'read/write', manager: 'read', contractor: 'none', user: 'none' },
  { page: 'Properties', path: '/properties', superadmin: 'read/write', manager: 'read', contractor: 'read', user: 'read' },
  { page: 'Rooms', path: '/rooms', superadmin: 'read/write', manager: 'read', contractor: 'none', user: 'read' },
  { page: 'Expenses', path: '/expenses', superadmin: 'read/write', manager: 'read/write', contractor: 'none', user: 'none' },
  { page: 'Rent Payments', path: '/rent-payments', superadmin: 'read/write', manager: 'read/write', contractor: 'none', user: 'none' },
  { page: 'Tasks', path: '/tasks', superadmin: 'read/write', manager: 'read/write', contractor: 'read', user: 'none' },
  { page: 'Admin Panel', path: '/admin', superadmin: 'read/write', manager: 'read/write', contractor: 'none', user: 'none' },
  { page: 'Permissions', path: '/admin/permissions', superadmin: 'read/write', manager: 'none', contractor: 'none', user: 'none' },
  { page: 'Site Config', path: '/siteConfiguration/*', superadmin: 'read/write', manager: 'none', contractor: 'none', user: 'none' },
];

const PermissionCell = ({ access }: { access: string }) => {
  if (access === 'read/write') {
    return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Read/Write</Badge>;
  }
  if (access === 'read') {
    return <Badge variant="secondary">Read Only</Badge>;
  }
  return <Badge variant="destructive">None</Badge>;
};


export default function PermissionsPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser(auth);
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  return (
    <MainLayout>
      <div className="w-full max-w-6xl px-4">
        <Card>
          <CardHeader>
            <CardTitle>Role Permissions Matrix</CardTitle>
            <CardDescription>
              This table outlines the access levels for each user role across different pages and data collections.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page/Resource</TableHead>
                  <TableHead className="text-center">Super Admin</TableHead>
                  <TableHead className="text-center">Manager</TableHead>
                  <TableHead className="text-center">Contractor</TableHead>
                  <TableHead className="text-center">User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissionsData.map((perm) => (
                  <TableRow key={perm.page}>
                    <TableCell>
                      <div className="font-medium">{perm.page}</div>
                      <div className="text-xs text-muted-foreground">{perm.path}</div>
                    </TableCell>
                    <TableCell className="text-center"><PermissionCell access={perm.superadmin} /></TableCell>
                    <TableCell className="text-center"><PermissionCell access={perm.manager} /></TableCell>
                    <TableCell className="text-center"><PermissionCell access={perm.contractor} /></TableCell>
                    <TableCell className="text-center"><PermissionCell access={perm.user} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
