"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signOut } from "firebase/auth";
import { auth as mainAuth } from "@/lib/firebase"; // Renamed to avoid conflict
import { useToast } from "@/hooks/use-toast";
import { LogOut, UserCheck, UserPlus, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { createUser } from "@/ai/flows/create-user-flow";


const addUserFormSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  isAdmin: z.boolean().default(false),
});

export default function Home() {
  const { user, loading, role, claimsLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof addUserFormSchema>>({
    resolver: zodResolver(addUserFormSchema),
    defaultValues: {
      email: "",
      password: "",
      isAdmin: false,
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await signOut(mainAuth);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      router.push("/login");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: errorMessage,
      });
    }
  };
  
  async function onAddUserSubmit(values: z.infer<typeof addUserFormSchema>) {
    setIsSubmitting(true);
    try {
      const result = await createUser({
        email: values.email,
        password: values.password,
        role: values.isAdmin ? 'admin' : 'user',
      });
      if (result.success) {
        toast({
          title: "User Created",
          description: `Successfully created user: ${values.email}`,
        });
        form.reset();
      } else {
        throw new Error(result.message || "Failed to create user.");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({
        variant: "destructive",
        title: "Failed to create user",
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  }


  if (loading || claimsLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-4 bg-background">
      <Card className="w-full max-w-md shadow-2xl animate-in fade-in-50 zoom-in-95 duration-500">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit">
            <UserCheck className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="mt-4 text-3xl font-headline font-bold text-primary">Login Successful</CardTitle>
          <CardDescription className="font-body">
            Welcome back, {user.email}! (Role: {role})
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={handleLogout} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </CardContent>
      </Card>
      
      {role === 'admin' && (
        <Card className="w-full max-w-md shadow-2xl animate-in fade-in-50 zoom-in-95 duration-500 delay-200">
          <CardHeader>
            <CardTitle className="text-2xl font-headline font-bold text-primary">Add New User</CardTitle>
            <CardDescription>Create a new user account manually.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onAddUserSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New User's Email</FormLabel>
                      <FormControl>
                        <Input placeholder="new.user@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isAdmin"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Make Admin
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  {isSubmitting ? 'Creating User...' : 'Add User'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
