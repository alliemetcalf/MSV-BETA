'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronDown,
  KeyRound,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  Home,
  Receipt,
  DollarSign,
  Landmark,
  ListTodo,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { useAuth, useDoc, useFirebaseApp, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserProfile } from '@/types/user-profile';
import { doc } from 'firebase/firestore';

export function Header() {
  const pathname = usePathname();
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser(auth);

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
      router.push('/login');
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.';
      toast({
        variant: 'destructive',
        title: 'Logout failed',
        description: errorMessage,
      });
    }
  };

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/door-codes', label: 'Door Codes' },
    { href: '/tenants', label: 'Tenants' },
    { href: '/properties', label: 'Properties' },
    { href: '/rooms', label: 'Rooms' },
    { href: '/expenses', label: 'Expenses' },
    { href: '/rent-payments', label: 'Rent Payments' },
    { href: '/tasks', label: 'Tasks', icon: ListTodo },
  ];

  const adminNavItems = [{ href: '/admin', label: 'Admin', icon: ShieldCheck }];
  const canSeeAdmin = userProfile?.role === 'superadmin' || userProfile?.role === 'manager';

  return (
    <header className="bg-card border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-primary font-bold"
            >
              <KeyRound className="h-6 w-6" />
              <span className="font-headline text-2xl">AMCP</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                    pathname === item.href
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {item.label === 'Rent Payments' ? <DollarSign/> : null}
                  {item.label === 'Expenses' ? <Receipt/> : null}
                  {item.label === 'Properties' ? <Landmark/> : null}
                  {item.label === 'Tasks' ? <ListTodo/> : null}
                  {item.label}
                </Link>
              ))}
              {user && canSeeAdmin &&
                adminNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                      pathname.startsWith(item.href)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
            </nav>
          </div>
          <div className="flex items-center">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                      {user.displayName || user.email}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
