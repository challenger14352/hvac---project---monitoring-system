import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Gauge,
  Plus,
  Search,
  Server,
  ShieldAlert,
  Wind,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import eagleLogo from "@assets/AOF_eagle_1771799559884.png";
import CustomerDetail from "@/pages/CustomerDetail";
import UnitDashboard from "@/pages/UnitDashboard";
import {
  demoCustomers,
  demoUnits,
  getDemoCustomer,
  getDemoCustomerUnits,
  getDemoUnitDetail,
  getDemoUnitHealth,
  getDemoUnitStatus,
  type DemoCustomer,
} from "@/lib/demo-data";

function healthTone(score: number | null) {
  if (score === null) return "text-muted-foreground";
  if (score >= 85) return "text-emerald-300";
  if (score >= 60) return "text-amber-300";
  return "text-red-300";
}

function StatusPill({ label }: { label: string }) {
  const styles =
    label === "Optimal"
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
      : label === "Needs attention"
        ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
        : "border-slate-400/25 bg-slate-400/10 text-slate-300";
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${styles}`}>{label}</span>;
}

const demoCustomerStorageKey = "on-the-spot-demo-customers";

function loadAddedCustomers(): DemoCustomer[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(demoCustomerStorageKey) ?? "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter((customer): customer is DemoCustomer =>
      customer &&
      typeof customer.id === "string" &&
      typeof customer.name === "string" &&
      typeof customer.location === "string" &&
      typeof customer.plan === "string",
    );
  } catch {
    return [];
  }
}

export default function PublicDemo() {
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newPlan, setNewPlan] = useState("premium");
  const [addedCustomers, setAddedCustomers] = useState<DemoCustomer[]>(loadAddedCustomers);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(demoCustomerStorageKey, JSON.stringify(addedCustomers));
    } catch {
      // The demo remains usable when browser storage is unavailable.
    }
  }, [addedCustomers]);

  const customers = [...demoCustomers, ...addedCustomers];
  const unitMatch = location.match(/^\/demo\/unit\/([^/?]+)/);
  const customerMatch = location.match(/^\/demo\/customer\/([^/?]+)/);
  const unitId = unitMatch?.[1] ? decodeURIComponent(unitMatch[1]) : undefined;
  const customerId = customerMatch?.[1] ? decodeURIComponent(customerMatch[1]) : undefined;
  const selectedCustomer = customerId
    ? customers.find((customer) => customer.id === customerId) ?? getDemoCustomer(customerId)
    : undefined;
  const selectedUnitDetail = unitId ? getDemoUnitDetail(unitId) : undefined;

  const filteredCustomers = useMemo(
    () =>
      customers.filter((customer) => {
        const search = searchTerm.trim().toLowerCase();
        return !search ||
          customer.name.toLowerCase().includes(search) ||
          customer.location.toLowerCase().includes(search) ||
          customer.id.toLowerCase().includes(search);
      }),
    [customers, searchTerm],
  );

  const unitScores = demoUnits
    .map((unit) => getDemoUnitHealth(unit))
    .filter((score): score is number => score !== null);
  const optimalCount = unitScores.filter((score) => score >= 85).length;
  const criticalCount = unitScores.filter((score) => score < 60).length;

  const addCustomer = () => {
    if (!newName.trim() || !newLocation.trim()) return;
    const customer: DemoCustomer = {
      id: `demo-added-${Date.now()}`,
      name: newName.trim(),
      location: newLocation.trim(),
      plan: newPlan,
    };
    setAddedCustomers((current) => [...current, customer]);
    setNewName("");
    setNewLocation("");
    setNewPlan("premium");
    setIsAddOpen(false);
  };

  const openCustomer = (id: string) => setLocation(`/demo/customer/${encodeURIComponent(id)}`);
  const openUnit = (id: string) => setLocation(`/demo/unit/${encodeURIComponent(id)}`);
  const goToFleet = () => setLocation("/demo");
  const averageHealth = unitScores.length
    ? Math.round(unitScores.reduce((sum, score) => sum + score, 0) / unitScores.length)
    : 0;

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="public-demo">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button type="button" onClick={goToFleet} className="flex items-center gap-3" aria-label="Demo fleet home">
            <img src={eagleLogo} alt="" className="h-9 w-9 object-contain" />
            <span className="font-mono text-sm font-bold tracking-wide text-primary sm:text-base">ON THE SPOT</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-4">
            <a href="/demo/unit/RTU-001?view=hardware" className="text-xs font-medium text-primary hover:underline" data-testid="demo-hardware-link">
              Sample unit + hardware
            </a>
            <span className="hidden rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary sm:inline-flex">
              Interactive demo · sample data
            </span>
            <a href="/sign-up">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">Sign in</Button>
            </a>
          </div>
        </div>
      </header>

      <div className="border-b border-amber-400/15 bg-amber-400/[0.04] px-4 py-2 text-center text-xs text-muted-foreground">
        Demo mode: unit details and HVAC scores are fictional. The Live hardware section shows only real readings from an ESP32 connected to your own computer; nothing is shared publicly.
      </div>

      {unitId ? (
        selectedUnitDetail ? (
          <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
            <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label="Demo breadcrumb">
              <button type="button" onClick={goToFleet} className="hover:text-primary">Fleet</button>
              <ChevronRight className="h-3.5 w-3.5" />
              <button
                type="button"
                onClick={() => openCustomer(selectedUnitDetail.unit.customerId)}
                className="hover:text-primary"
              >
                {customers.find((customer) => customer.id === selectedUnitDetail.unit.customerId)?.name ?? "Customer"}
              </button>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground">{selectedUnitDetail.unit.name}</span>
            </nav>
            <UnitDashboard
              key={selectedUnitDetail.unit.id}
              demoData={selectedUnitDetail}
              onDemoBack={() => openCustomer(selectedUnitDetail.unit.customerId)}
            />
          </main>
        ) : (
          <DemoNotFound onBack={goToFleet} />
        )
      ) : customerId ? (
        selectedCustomer ? (
          <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
            <CustomerDetail
              demoData={{
                customer: selectedCustomer,
                units: getDemoCustomerUnits(customerId).map((unit) => ({
                  ...unit,
                  timezone: "America/New_York",
                })),
              }}
              onDemoUnitSelect={openUnit}
              onDemoBack={goToFleet}
            />
          </main>
        ) : (
          <DemoNotFound onBack={goToFleet} />
        )
      ) : (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
          <section className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-300">
                <Activity className="h-3.5 w-3.5" />
                Public sample workspace
              </div>
              <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">Fleet dashboard</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Explore the same customer-to-unit workflow used in the application. Open a customer, select equipment,
                and switch between the unit’s diagnostic views.
              </p>
            </div>
            <a href="/" className="shrink-0">
              <Button variant="outline" className="gap-2 border-border">
                Product overview <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </section>

          <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Fleet summary">
            {[
              { label: "Monitored units", value: String(demoUnits.length), icon: Server, color: "text-primary" },
              { label: "Optimal state", value: String(optimalCount), icon: CheckCircle2, color: "text-emerald-300" },
              { label: "Critical faults", value: String(criticalCount), icon: ShieldAlert, color: "text-red-300" },
              { label: "Fleet health score", value: `${averageHealth}%`, icon: Gauge, color: "text-primary" },
            ].map((metric) => (
              <div key={metric.label} className="rounded-xl border border-border bg-card/60 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{metric.label}</span>
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                </div>
                <div className="mt-3 font-mono text-3xl font-bold">{metric.value}</div>
              </div>
            ))}
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card/30">
            <div className="flex flex-col gap-4 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h2 className="font-semibold">Customer portfolio</h2>
                <p className="mt-1 text-xs text-muted-foreground">Select a customer to view deployed equipment and health.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search customers..."
                    className="bg-background/70 pl-9"
                    data-testid="demo-customer-search"
                  />
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-4 w-4" /> Add sample customer
                </Button>
              </div>
            </div>

            <div className="divide-y divide-border/60">
              {filteredCustomers.length ? filteredCustomers.map((customer) => {
                const customerUnits = getDemoCustomerUnits(customer.id);
                const scores = customerUnits.map(getDemoUnitHealth).filter((score): score is number => score !== null);
                const customerHealth = scores.length
                  ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
                  : null;
                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => openCustomer(customer.id)}
                    className="group flex w-full flex-col gap-4 p-4 text-left transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                    data-testid={`demo-customer-${customer.id}`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold group-hover:text-primary">{customer.name}</h3>
                          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{customer.plan}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{customer.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-6 border-t border-border/50 pt-3 sm:border-0 sm:pt-0">
                      <div className="text-center">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Units</div>
                        <div className="mt-1 font-mono text-lg">{customerUnits.length}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Fleet health</div>
                        <div className={`mt-1 font-mono text-lg ${healthTone(customerHealth)}`}>{customerHealth === null ? "N/A" : `${customerHealth}%`}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>
                  </button>
                );
              }) : (
                <div className="p-10 text-center">
                  <Building2 className="mx-auto mb-3 h-9 w-9 text-muted-foreground/60" />
                  <p className="font-medium">No customers found</p>
                  <p className="mt-1 text-sm text-muted-foreground">Try another search or add a sample customer.</p>
                </div>
              )}
            </div>
          </section>

          <section className="mt-7 rounded-xl border border-border bg-card/30">
            <div className="border-b border-border/70 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">Equipment status</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Choose any unit to open its full interactive diagnostic dashboard.</p>
            </div>
            <div className="grid gap-px bg-border/50 sm:grid-cols-2 xl:grid-cols-4">
              {demoUnits.map((unit) => {
                const score = getDemoUnitHealth(unit);
                const status = getDemoUnitStatus(unit);
                return (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => openUnit(unit.id)}
                    className="flex min-w-0 items-center gap-3 bg-background p-4 text-left transition-colors hover:bg-muted/40"
                    data-testid={`demo-unit-${unit.id.toLowerCase()}`}
                  >
                    <Server className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-sm font-semibold">{unit.id}</span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">{unit.site}</span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <StatusPill label={status} />
                      <span className={`font-mono text-xs ${healthTone(score)}`}>{score === null ? "—" : `${Math.round(score)}%`}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogContent className="border-border bg-card">
              <DialogHeader>
                <DialogTitle>Add a sample customer</DialogTitle>
                <DialogDescription>
                  This temporary customer exists only in this demo session. It will not be saved to the application.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="demo-customer-name">Facility name</Label>
                  <Input id="demo-customer-name" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="e.g. Westside Campus" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="demo-customer-location">Location</Label>
                  <Input id="demo-customer-location" value={newLocation} onChange={(event) => setNewLocation(event.target.value)} placeholder="City, State" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="demo-customer-plan">Service plan</Label>
                  <Select value={newPlan} onValueChange={setNewPlan}>
                    <SelectTrigger id="demo-customer-plan"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button onClick={addCustomer} disabled={!newName.trim() || !newLocation.trim()} className="bg-primary text-primary-foreground">
                  Add to demo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      )}
    </div>
  );
}

function DemoNotFound({ onBack }: { onBack: () => void }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-center">
      <Activity className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Demo item not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">This sample link may be out of date.</p>
      <Button onClick={onBack} className="mt-6 bg-primary text-primary-foreground">Back to demo fleet</Button>
    </main>
  );
}
