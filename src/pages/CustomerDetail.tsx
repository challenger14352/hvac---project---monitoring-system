import React from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Activity, 
  Building2, 
  Server, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert,
  ChevronRight,
  MapPin
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import eagleLogo from '@assets/AOF_eagle_1771799559884.png';
import UnitCreateDialog from "@/components/UnitCreateDialog";
import CustomerArchiveDialog from "@/components/CustomerArchiveDialog";
import { useWorkspaceSettings } from "@/hooks/use-workspace-settings";

interface Unit {
  id: string;
  customerId: string;
  name: string;
  systemType: string | null;
  timezone: string | null;
}

interface Customer {
  id: string;
  name: string;
  location: string;
  plan: string;
}

export default function CustomerDetail({
  demoData,
  onDemoUnitSelect,
  onDemoBack,
}: {
  params?: { id: string };
  demoData?: { customer: Customer; units: Unit[] };
  onDemoUnitSelect?: (unitId: string) => void;
  onDemoBack?: () => void;
}) {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const customerId = demoData?.customer.id ?? params.id;
  const { data: settings } = useWorkspaceSettings(!demoData);

  const { data: fetchedCustomer, isLoading: custLoading, error: customerError, refetch: retryCustomer } = useQuery<Customer>({
    queryKey: [`/api/customers/${customerId}`],
    enabled: !demoData && !!customerId,
    initialData: demoData?.customer,
    refetchInterval: demoData ? false : (settings?.refreshSeconds ?? 15) * 1000,
  });

  const { data: fetchedUnits = [], isLoading: unitsLoading, error: unitsError, refetch: retryUnits } = useQuery<Unit[]>({
    queryKey: [`/api/customers/${customerId}/units`],
    enabled: !demoData && !!customerId,
    initialData: demoData?.units,
    refetchInterval: demoData ? false : (settings?.refreshSeconds ?? 15) * 1000,
  });

  const customer = demoData?.customer ?? fetchedCustomer;
  const units = demoData?.units ?? fetchedUnits;
  const isLoading = custLoading || unitsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-8 h-8 text-primary animate-pulse" />
          <p className="text-muted-foreground font-mono text-sm">LOADING FACILITY DATA...</p>
        </div>
      </div>
    );
  }

  if (customerError || unitsError) {
    return <main className="min-h-screen bg-background p-8 text-foreground">
      <Link href="/" className="text-primary hover:underline">Back to customers</Link>
      <div role="alert" className="mt-8 space-y-4">
        <h1 className="text-xl font-semibold">Unable to load this customer’s equipment</h1>
        <p className="text-muted-foreground">{(customerError || unitsError)?.message}</p>
        <button type="button" className="text-primary underline" onClick={() => { void retryCustomer(); void retryUnits(); }}>Retry</button>
      </div>
    </main>;
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">Customer Not Found</p>
          <Link href={demoData ? "/demo" : "/"} className="text-primary hover:underline text-sm">
            Back to {demoData ? "Demo Fleet" : "Dashboard"}
          </Link>
        </div>
      </div>
    );
  }

  const formatSystemType = (type: string | null) => {
    if (!type) return 'Unknown';
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 lg:p-8">
      <div className="mb-4">
        {demoData ? (
          <button type="button" onClick={onDemoBack} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Demo Fleet
          </button>
        ) : (
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Fleet Dashboard
          </Link>
        )}
      </div>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-border/50 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <img src={eagleLogo} alt="On The Spot" className="h-8 w-8 rounded object-cover" />
            <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {customer.location}</span>
            <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary">
              {customer.plan.toUpperCase()}
            </Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground mb-1">DEPLOYED UNITS</div>
          <div className="text-3xl font-mono text-primary" data-testid="text-unit-count">{units.length}</div>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h3 className="text-lg font-semibold text-muted-foreground">Monitored Units</h3>
        {!demoData && <div className="flex flex-wrap gap-3">
          <UnitCreateDialog customerId={customerId!} defaultTimezone={settings?.defaultTimezone ?? "America/New_York"} />
          <CustomerArchiveDialog customerId={customerId!} customerName={customer.name} />
        </div>}
      </div>

      {units.length === 0 ? (
        <Card className="tech-border bg-card/40 backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No units deployed yet for this customer.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {units.map((unit, i) => (
            <motion.div
              key={unit.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <button
                type="button"
                className="group block w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Open unit ${unit.name}`}
                onClick={() => demoData ? onDemoUnitSelect?.(unit.id) : setLocation(`/unit/${unit.id}`)}
                data-testid={`card-unit-${unit.id}`}
              >
                <Card className="tech-border bg-card/40 hover:bg-card/80 backdrop-blur-sm transition-all border-primary/20 hover:border-primary/50">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Server className="w-4 h-4 text-primary" />
                        <h4 className="text-lg font-semibold group-hover:text-primary transition-colors" data-testid={`text-unit-name-${unit.id}`}>
                          {unit.name}
                        </h4>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{formatSystemType(unit.systemType)}</p>
                    </div>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background/50 group-hover:bg-primary/20 transition-colors">
                      <ChevronRight className="w-4 h-4 group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
