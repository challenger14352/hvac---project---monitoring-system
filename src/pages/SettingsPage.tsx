import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Clock3, LoaderCircle, Save, UserRound } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useUser } from "@clerk/react";
import WorkspaceHeader from "@/components/WorkspaceHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AccountSettings = {
  organizationName: string;
  defaultTimezone: string;
  refreshSeconds: 15 | 30 | 60;
};

const settingsKey = ["/api/account/settings"];
const fallbackSettings: AccountSettings = {
  organizationName: "",
  defaultTimezone: "America/New_York",
  refreshSeconds: 15,
};

function isValidTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { user, isLoaded } = useUser();
  const authLoading = !isLoaded;
  const { data, isLoading, error, refetch } = useQuery<AccountSettings>({ queryKey: settingsKey });
  const [form, setForm] = useState<AccountSettings>(fallbackSettings);
  const [savedNotice, setSavedNotice] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const dirty = useMemo(
    () => !!data && (
      form.organizationName !== data.organizationName ||
      form.defaultTimezone !== data.defaultTimezone ||
      form.refreshSeconds !== data.refreshSeconds
    ),
    [data, form],
  );

  const saveMutation = useMutation({
    mutationFn: async (body: AccountSettings) => {
      const response = await apiRequest("PUT", "/api/account/settings", body);
      return response.json() as Promise<AccountSettings>;
    },
    onSuccess: (saved) => {
      setForm(saved);
      setSavedNotice("Workspace settings saved.");
      setValidationError("");
      queryClient.setQueryData(settingsKey, saved);
      queryClient.invalidateQueries({ queryKey: settingsKey });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavedNotice("");
    setValidationError("");
    const organizationName = form.organizationName.trim();
    if (organizationName.length > 120) {
      setValidationError("Organization name must be 120 characters or fewer.");
      return;
    }
    if (!isValidTimezone(form.defaultTimezone.trim())) {
      setValidationError("Enter a valid IANA timezone, such as America/New_York.");
      return;
    }
    saveMutation.mutate({
      organizationName,
      defaultTimezone: form.defaultTimezone.trim(),
      refreshSeconds: form.refreshSeconds,
    });
  };

  const identity = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.primaryEmailAddress?.emailAddress || "Signed-in account"
    : "Account identity unavailable";

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <WorkspaceHeader title="Settings" description="Set the defaults your account uses across customers and equipment." />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-7 sm:px-6 md:grid-cols-[minmax(0,1fr)_300px] lg:px-8 lg:py-10">
        <section>
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
              <Clock3 className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Workspace defaults</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">Account preferences</h2>
            </div>
          </div>

          {isLoading ? (
            <Card className="border-border bg-card/60" aria-label="Loading settings">
              <CardContent className="space-y-6 p-6">
                <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                <div className="h-11 animate-pulse rounded-md bg-muted/70" />
                <div className="h-4 w-44 animate-pulse rounded bg-muted" />
                <div className="h-11 animate-pulse rounded-md bg-muted/70" />
              </CardContent>
            </Card>
          ) : error ? (
            <Card className="border-destructive/30 bg-card/60">
              <CardContent className="p-6">
                <div role="alert" className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
                  <div className="flex-1">
                    <h2 className="font-semibold">Settings could not be loaded</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{(error as Error).message}</p>
                    <Button type="button" variant="outline" className="mt-4" onClick={() => void refetch()}>Try again</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border bg-card/60">
              <CardHeader className="border-b border-border/80">
                <CardTitle className="text-base">Operational defaults</CardTitle>
                <CardDescription>These preferences are used by the account’s customer and equipment views.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-2">
                    <Label htmlFor="organization-name">Organization name <span className="font-normal text-muted-foreground">· optional</span></Label>
                    <Input
                      id="organization-name"
                      value={form.organizationName}
                      maxLength={120}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, organizationName: event.target.value }));
                        setSavedNotice("");
                      }}
                      placeholder="For example, Northside Mechanical"
                      data-testid="organization-name"
                    />
                    <p className="text-xs text-muted-foreground">Shown as your workspace name. Leave blank if you work independently.</p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="default-timezone">Default equipment timezone</Label>
                    <Input
                      id="default-timezone"
                      value={form.defaultTimezone}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, defaultTimezone: event.target.value }));
                        setSavedNotice("");
                      }}
                      placeholder="America/New_York"
                      autoComplete="off"
                      data-testid="default-timezone"
                      aria-describedby="timezone-help"
                    />
                    <p id="timezone-help" className="text-xs text-muted-foreground">Use an IANA timezone identifier, for example America/Chicago or Pacific/Honolulu.</p>
                  </div>

                  <fieldset className="grid gap-3">
                    <legend className="text-sm font-medium">Dashboard refresh interval</legend>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {([15, 30, 60] as const).map((seconds) => (
                        <label
                          key={seconds}
                          className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-md border px-3 transition-colors focus-within:ring-2 focus-within:ring-ring ${
                            form.refreshSeconds === seconds ? "border-primary/50 bg-primary/[0.07]" : "border-border bg-background/50 hover:bg-muted/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="refresh-seconds"
                            value={seconds}
                            checked={form.refreshSeconds === seconds}
                            onChange={() => {
                              setForm((current) => ({ ...current, refreshSeconds: seconds }));
                              setSavedNotice("");
                            }}
                            className="accent-[hsl(var(--primary))]"
                            data-testid={seconds === form.refreshSeconds ? "refresh-seconds" : undefined}
                          />
                          <span className="font-mono text-sm">{seconds}s</span>
                          <span className="text-xs text-muted-foreground">{seconds === 15 ? "Responsive" : seconds === 30 ? "Balanced" : "Conserve data"}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {(validationError || saveMutation.error) && (
                    <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive-foreground">
                      {validationError || (saveMutation.error as Error).message || "Settings could not be saved. Try again."}
                    </div>
                  )}
                  {savedNotice && <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-primary"><Check className="h-4 w-4" aria-hidden="true" />{savedNotice}</p>}

                  <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">{dirty ? "Unsaved changes" : "All changes are up to date"}</p>
                    <Button type="submit" disabled={!dirty || saveMutation.isPending} className="min-h-11 gap-2" data-testid="settings-save">
                      {saveMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                      {saveMutation.isPending ? "Saving…" : "Save settings"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </section>

        <aside className="space-y-4">
          <Card className="border-border bg-card/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-primary" aria-hidden="true" />
                <CardTitle className="text-sm">Signed-in identity</CardTitle>
              </div>
              <CardDescription>Account access is managed separately.</CardDescription>
            </CardHeader>
            <CardContent>
              {authLoading ? (
                <div className="space-y-2" aria-label="Loading account identity">
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-44 animate-pulse rounded bg-muted/70" />
                </div>
              ) : (
                <>
                  <p className="font-medium">{identity}</p>
                  {user?.primaryEmailAddress?.emailAddress && <p className="mt-1 break-all text-sm text-muted-foreground">{user.primaryEmailAddress.emailAddress}</p>}
                </>
              )}
              <p className="mt-4 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
                This page changes workspace defaults only. Profile, email, and password controls are not available here.
              </p>
            </CardContent>
          </Card>
          <div className="rounded-lg border border-primary/20 bg-primary/[0.045] p-4">
            <p className="text-sm font-medium">Account-private by design</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Workspace settings apply to your account and do not change the local USB bench tool.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
