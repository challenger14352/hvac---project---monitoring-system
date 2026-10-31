import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Archive, Edit3, Mail, Phone, Plus, RotateCcw, Search, UserRound, Users, X } from "lucide-react";
import WorkspaceHeader from "@/components/WorkspaceHeader";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Technician = {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
type TechnicianForm = { name: string; email: string; phone: string; notes: string };
type RosterFilter = "active" | "archived";
const rosterKey = ["/api/technicians"];
const blankForm: TechnicianForm = { name: "", email: "", phone: "", notes: "" };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The request could not be completed. Try again.";
}

export default function TechniciansPage() {
  const queryClient = useQueryClient();
  const { data: technicians = [], isLoading, error, refetch } = useQuery<Technician[]>({ queryKey: rosterKey });
  const [filter, setFilter] = useState<RosterFilter>("active");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Technician | null>(null);
  const [form, setForm] = useState<TechnicianForm>(blankForm);
  const [formError, setFormError] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<Technician | null>(null);
  const [actionError, setActionError] = useState("");

  const refreshRoster = () => queryClient.invalidateQueries({ queryKey: rosterKey });
  const saveMutation = useMutation({
    mutationFn: async ({ id, body }: { id?: string; body: TechnicianForm }) => {
      const response = await apiRequest(id ? "PATCH" : "POST", id ? `/api/technicians/${id}` : "/api/technicians", body);
      return response.json();
    },
    onSuccess: () => {
      void refreshRoster();
      setFormOpen(false);
      setEditing(null);
      setForm(blankForm);
      setFormError("");
    },
    onError: (cause) => setFormError(errorMessage(cause)),
  });
  const statusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/technicians/${id}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      void refreshRoster();
      setArchiveTarget(null);
      setActionError("");
    },
    onError: (cause) => setActionError(errorMessage(cause)),
  });

  const visibleTechnicians = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return technicians
      .filter((technician) => technician.isActive === (filter === "active"))
      .filter((technician) => !normalizedSearch || [technician.name, technician.email, technician.phone, technician.notes]
        .some((value) => value.toLowerCase().includes(normalizedSearch)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [technicians, filter, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm);
    setFormError("");
    setFormOpen(true);
  };
  const openEdit = (technician: Technician) => {
    setEditing(technician);
    setForm({ name: technician.name, email: technician.email, phone: technician.phone, notes: technician.notes });
    setFormError("");
    setFormOpen(true);
  };
  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const body = { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), notes: form.notes.trim() };
    if (!body.name || body.name.length > 120) {
      setFormError("Enter a name of 1–120 characters.");
      return;
    }
    if (body.email.length > 254 || (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))) {
      setFormError("Enter a valid email address or leave the field blank (254 characters maximum).");
      return;
    }
    if (body.phone.length > 40) {
      setFormError("Phone number must be 40 characters or fewer.");
      return;
    }
    if (body.notes.length > 1000) {
      setFormError("Notes must be 1,000 characters or fewer.");
      return;
    }
    saveMutation.mutate({ id: editing?.id, body });
  };

  const activeCount = technicians.filter((tech) => tech.isActive).length;
  const archivedCount = technicians.length - activeCount;

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <WorkspaceHeader
        title="Technicians"
        description="Keep a private, practical contact roster for the people who work on your equipment."
      >
        <Button type="button" onClick={openCreate} className="min-h-11 gap-2" data-testid="technician-add">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add technician
        </Button>
      </WorkspaceHeader>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-xl border border-primary/20 bg-primary/[0.045] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
                <UserRound className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">A contact roster, not user access</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Technician details are private to this account. This does not create logins, send invitations, or grant access.
                  Any future technician sign-in should be designed separately.
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active contacts</p>
              <p className="mt-2 font-mono text-2xl text-primary">{activeCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Archived</p>
              <p className="mt-2 font-mono text-2xl">{archivedCount}</p>
            </div>
          </div>
        </div>

        <section aria-label="Technician roster">
          <div className="mb-4 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1" role="tablist" aria-label="Roster filter">
              {(["active", "archived"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={filter === value}
                  onClick={() => { setFilter(value); setActionError(""); }}
                  className={`min-h-10 rounded-md px-3 text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    filter === value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {value} <span className="ml-1 font-mono text-xs opacity-70">({value === "active" ? activeCount : archivedCount})</span>
                </button>
              ))}
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search contacts…" className="pl-9" aria-label="Search technicians" />
            </div>
          </div>

          {actionError && <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{actionError}</div>}
          {isLoading ? (
            <div className="space-y-3" aria-label="Loading technicians">
              {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl border border-border bg-card/50" />)}
            </div>
          ) : error ? (
            <Card className="border-destructive/30 bg-card/50">
              <CardContent className="flex flex-col items-center p-8 text-center">
                <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
                <h2 className="mt-3 font-semibold">Roster could not be loaded</h2>
                <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{errorMessage(error)}</p>
                <Button type="button" variant="outline" className="mt-4" onClick={() => void refetch()}>Retry</Button>
              </CardContent>
            </Card>
          ) : visibleTechnicians.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/30 px-5 py-12 text-center" data-testid="technician-empty">
              <Users className="mx-auto h-9 w-9 text-muted-foreground/70" aria-hidden="true" />
              <h2 className="mt-3 font-semibold">{search ? "No matching contacts" : filter === "active" ? "No active technicians yet" : "No archived technicians"}</h2>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                {search ? "Try a different name, phone, email, or note." : filter === "active" ? "Add a technician to keep their service contact details close at hand." : "Archived contacts will stay here for reference and can be restored."}
              </p>
              {!search && filter === "active" && <Button type="button" onClick={openCreate} variant="outline" className="mt-4 gap-2"><Plus className="h-4 w-4" aria-hidden="true" /> Add technician</Button>}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleTechnicians.map((technician) => (
                <Card key={technician.id} className="border-border bg-card/55 transition-colors hover:border-primary/30" data-testid={`technician-row-${technician.id}`}>
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{technician.name}</h3>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          technician.isActive ? "border-primary/25 bg-primary/10 text-primary" : "border-border bg-muted/50 text-muted-foreground"
                        }`}>{technician.isActive ? "Active" : "Archived"}</span>
                      </div>
                      <div className="mt-2 flex flex-col gap-x-5 gap-y-1 text-sm text-muted-foreground sm:flex-row sm:flex-wrap">
                        {technician.email && <a href={`mailto:${technician.email}`} className="inline-flex min-h-7 items-center gap-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{technician.email}</a>}
                        {technician.phone && <a href={`tel:${technician.phone}`} className="inline-flex min-h-7 items-center gap-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{technician.phone}</a>}
                      </div>
                      {technician.notes && <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{technician.notes}</p>}
                    </div>
                    <div className="flex shrink-0 gap-2 border-t border-border pt-3 sm:border-0 sm:pt-0">
                      <Button type="button" variant="outline" size="sm" className="min-h-10 gap-2" onClick={() => openEdit(technician)} data-testid={`technician-edit-${technician.id}`}>
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                      </Button>
                      {technician.isActive ? (
                        <Button type="button" variant="outline" size="sm" className="min-h-10 gap-2 hover:border-destructive/40 hover:text-destructive" onClick={() => { setArchiveTarget(technician); setActionError(""); }} data-testid={`technician-archive-${technician.id}`}>
                          <Archive className="h-3.5 w-3.5" aria-hidden="true" /> Archive
                        </Button>
                      ) : (
                        <Button type="button" variant="outline" size="sm" className="min-h-10 gap-2" disabled={statusMutation.isPending} onClick={() => { setActionError(""); statusMutation.mutate({ id: technician.id, isActive: true }); }} data-testid={`technician-restore-${technician.id}`}>
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Restore
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog open={formOpen} onOpenChange={(open) => { if (!saveMutation.isPending) setFormOpen(open); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-primary/20 bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit technician contact" : "Add technician contact"}</DialogTitle>
            <DialogDescription>This account-private roster does not create a login or send an invitation.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitForm} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="technician-name">Name <span className="text-destructive">*</span></Label>
              <Input id="technician-name" required maxLength={120} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} data-testid="technician-name" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="technician-email">Email <span className="text-muted-foreground">· optional</span></Label>
                <Input id="technician-email" type="email" maxLength={254} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} data-testid="technician-email" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="technician-phone">Phone <span className="text-muted-foreground">· optional</span></Label>
                <Input id="technician-phone" type="tel" maxLength={40} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} data-testid="technician-phone" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="technician-notes">Notes <span className="text-muted-foreground">· optional</span></Label>
              <Textarea id="technician-notes" maxLength={1000} rows={4} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} data-testid="technician-notes" />
              <p className="text-right text-xs text-muted-foreground">{form.notes.length}/1,000</p>
            </div>
            {formError && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{formError}</p>}
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" disabled={saveMutation.isPending} onClick={() => setFormOpen(false)}><X className="mr-2 h-4 w-4" aria-hidden="true" />Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending} data-testid="technician-save">
                {saveMutation.isPending ? "Saving…" : editing ? "Save changes" : "Add contact"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!archiveTarget} onOpenChange={(open) => { if (!open && !statusMutation.isPending) setArchiveTarget(null); }}>
        <DialogContent className="border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archive {archiveTarget?.name}?</DialogTitle>
            <DialogDescription>This contact will move to the archived roster. You can restore it later; no account access is affected.</DialogDescription>
          </DialogHeader>
          {actionError && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{actionError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={statusMutation.isPending} onClick={() => setArchiveTarget(null)}>Keep active</Button>
            <Button
              type="button"
              variant="destructive"
              disabled={statusMutation.isPending}
              onClick={() => archiveTarget && statusMutation.mutate({ id: archiveTarget.id, isActive: false })}
            >
              {statusMutation.isPending ? "Archiving…" : "Archive contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
