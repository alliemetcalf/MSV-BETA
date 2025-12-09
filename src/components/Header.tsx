'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { KeyRound, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export function Header() {
  const pathname = usePathname();
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();

  const handleLogout = async () => {
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
  ];

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
              <span>Auth App</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center">
            <Button onClick={handleLogout} variant="ghost" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
