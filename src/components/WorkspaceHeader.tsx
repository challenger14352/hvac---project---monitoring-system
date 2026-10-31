import React from "react";
import { Link, useLocation } from "wouter";
import { Activity, Building2, LogOut, Menu, Settings, Users } from "lucide-react";
import eagleLogo from "@assets/AOF_eagle_1771799559884.png";
import { useClerk } from "@clerk/react";
import { basePath } from "@/lib/clerk-config";

type WorkspaceHeaderProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
};

const navigation = [
  { href: "/", label: "Customers", icon: Building2, testId: "nav-customers" },
  { href: "/technicians", label: "Technicians", icon: Users, testId: "nav-technicians" },
  { href: "/settings", label: "Settings", icon: Settings, testId: "nav-settings" },
  { href: "/connect", label: "Connect ESP32", icon: Activity, testId: "nav-esp32-connect" },
];

export default function WorkspaceHeader({ title, description, children }: WorkspaceHeaderProps) {
  const [location] = useLocation();
  const { signOut } = useClerk();

  return (
    <header className="border-b border-border/80 bg-background/90">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 py-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="On The Spot customers"
          >
            <img src={eagleLogo} alt="" className="h-9 w-9 rounded-md object-cover" />
            <span className="font-semibold tracking-tight">On The Spot</span>
          </Link>

          <nav aria-label="Workspace navigation" className="hidden items-center gap-1 sm:flex">
            {navigation.map(({ href, label, icon: Icon, testId }) => {
              const active = location === href || (href === "/" && location.startsWith("/customer"));
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  data-testid={testId}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? "border border-primary/20 bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => signOut({ redirectUrl: basePath || "/" })}
              className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="link-logout"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </nav>

          <details className="relative sm:hidden">
            <summary
              aria-label="Open workspace navigation"
              className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-md border border-border text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </summary>
            <nav
              aria-label="Mobile workspace navigation"
              className="absolute right-0 top-12 z-30 flex min-w-52 flex-col rounded-lg border border-border bg-card p-2 shadow-xl"
            >
              {navigation.map(({ href, label, icon: Icon, testId }) => {
                const active = location === href || (href === "/" && location.startsWith("/customer"));
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    data-testid={testId}
                    className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => signOut({ redirectUrl: basePath || "/" })}
                className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="link-logout-mobile"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </nav>
          </details>
        </div>

        <div className="flex flex-col gap-4 pb-5 pt-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Account workspace</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
          </div>
          {children && <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">{children}</div>}
        </div>
      </div>
    </header>
  );
}
