"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login after a short delay
    const timer = setTimeout(() => {
      router.push("/login");
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Registration Disabled</CardTitle>
          <CardDescription>
            This application is configured for a single user only.
            Registration of new accounts is not permitted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Redirecting you to the login page in a few seconds...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


