import { SignIn, SignUp } from "@clerk/react";
import { Link } from "wouter";
import { basePath } from "@/lib/clerk-config";

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold">On The Spot</h1>
        <p className="text-muted-foreground mt-2">Remote HVAC monitoring for your team</p>
      </div>
      {children}
      <Link href="/" className="text-sm text-primary hover:underline">Back to home</Link>
      <Link href="/demo" className="text-sm text-muted-foreground hover:underline">Explore the sample-data demo</Link>
    </main>
  );
}

export function SignInPage() {
  return <AuthLayout><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></AuthLayout>;
}

export function SignUpPage() {
  return <AuthLayout><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></AuthLayout>;
}
