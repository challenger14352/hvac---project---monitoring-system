import { useEffect, useRef } from "react";
import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from "wouter";
import { ClerkProvider, useAuth, useClerk } from "@clerk/react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { clerkPubKey, clerkProxyUrl, clerkAppearance, basePath, stripBase } from "@/lib/clerk-config";
import { SignInPage, SignUpPage } from "@/pages/AuthPages";
import NotFound from "@/pages/not-found";
import CompanyDashboard from "@/pages/CompanyDashboard";
import CustomerDetail from "@/pages/CustomerDetail";
import UnitDashboard from "@/pages/UnitDashboard";
import LandingPage from "@/pages/LandingPage";
import PublicDemo from "@/pages/PublicDemo";
import Esp32Connect from "@/pages/Esp32Connect";
import SettingsPage from "@/pages/SettingsPage";
import TechniciansPage from "@/pages/TechniciansPage";
import BenchTest from "@/pages/BenchTest";

function AuthenticatedRouter() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const account = useQuery({
    queryKey: ["/api/account"],
    enabled: isLoaded && !!isSignedIn,
    staleTime: 0,
  });

  if (!isLoaded || (isSignedIn && account.isPending)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Redirect to="/sign-in" />;
  }

  if (account.isError) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center" data-testid="account-access-denied">
        <h1 className="text-2xl font-semibold">Account access unavailable</h1>
        <p className="text-muted-foreground">Your account may have been removed, or the service is temporarily unavailable. No account data has been loaded.</p>
        <button onClick={() => account.refetch()} className="text-primary">Try again</button>
        <button onClick={() => signOut({ redirectUrl: basePath || "/" })} className="text-primary">Sign out</button>
        <a href="/connect" className="text-primary hover:underline">Open the local bench tool</a>
      </main>
    );
  }

  return (
    <Switch>
      <Route path="/dashboard" component={CompanyDashboard} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/technicians" component={TechniciansPage} />
      <Route path="/customer/:id" component={CustomerDetail} />
      <Route path="/unit/:id" component={UnitDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  return isSignedIn ? <Redirect to="/dashboard" /> : <LandingPage />;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);
  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      signInFallbackRedirectUrl={`${basePath}/dashboard`}
      signUpFallbackRedirectUrl={`${basePath}/dashboard`}
      localization={{
        signIn: { start: { title: "Welcome back", subtitle: "Sign in to On The Spot" } },
        signUp: { start: { title: "Create your account", subtitle: "Get started with On The Spot" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
    <QueryClientProvider client={queryClient}>
      <ClerkQueryClientCacheInvalidator />
      <TooltipProvider>
        <Toaster />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/connect" component={Esp32Connect} />
          <Route path="/bench" component={BenchTest} />
          <Route path="/demo" component={PublicDemo} />
          <Route path="/demo/customer/:id" component={PublicDemo} />
          <Route path="/demo/unit/:id" component={PublicDemo} />
          <Route component={AuthenticatedRouter} />
        </Switch>
      </TooltipProvider>
    </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return <WouterRouter base={basePath}><ClerkProviderWithRoutes /></WouterRouter>;
}

export default App;
