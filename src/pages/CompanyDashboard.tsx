import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useWorkspaceSettings } from '@/hooks/use-workspace-settings';
import { 
  Building2,
  Users,
  Settings,
  Plus,
  Search,
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  LogOut,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from 'framer-motion';
import eagleLogo from '@assets/AOF_eagle_1771799559884.png';

import { useUser, useClerk } from '@clerk/react';

  LogOut

type CustomerRow = {
  id: string;
  name: string;
  location: string;
  plan: string;
  unitCount: number;
  healthScore: number | null;
};

type FleetStats = {
  totalUnits: number;
  optimal: number;
  critical: number;
  avgHealth: number;
  assessedUnits?: number;
};

function getStatus(healthScore: number | null): string {
  if (healthScore === null) return "offline";
  if (healthScore >= 85) return "optimal";
  if (healthScore >= 60) return "warning";
  return "critical";
}

export default function CompanyDashboard() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formPlan, setFormPlan] = useState("premium");
  const queryClient = useQueryClient();
  const { data: settings } = useWorkspaceSettings();
  const { user } = useUser();
  const { signOut } = useClerk();

  const { data: customers = [], isLoading: customersLoading, error: customersError } = useQuery<CustomerRow[]>({
    queryKey: ["/api/customers"],
    refetchInterval: (settings?.refreshSeconds ?? 15) * 1000,
  });

  const { data: fleetStats, isLoading: statsLoading, error: statsError } = useQuery<FleetStats>({
    queryKey: ["/api/fleet/stats"],
    refetchInterval: (settings?.refreshSeconds ?? 15) * 1000,
  });

  const addCustomerMutation = useMutation({
    mutationFn: async (body: { name: string; location: string; plan: string }) => {
      const res = await apiRequest("POST", "/api/customers", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fleet/stats"] });
      setIsAddOpen(false);
      setFormName("");
      setFormLocation("");
      setFormPlan("premium");
    },
  });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCustomerClick = (id: string) => {
    setLocation(`/customer/${id}`);
  };

  const handleAddCustomer = () => {
    if (!formName.trim() || !formLocation.trim()) return;
    addCustomerMutation.mutate({ name: formName, location: formLocation, plan: formPlan });
  };

  const isLoading = customersLoading || statsLoading;
  const hasError = customersError || statsError;

  if (hasError) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center" data-testid="error-state">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Failed to load dashboard</h2>
          <p className="text-muted-foreground">{(customersError as Error)?.message || (statsError as Error)?.message}</p>
          <Button onClick={() => { queryClient.invalidateQueries(); }} data-testid="button-retry">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-border/50 bg-card/20 backdrop-blur-sm flex flex-col hidden md:flex">
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <img src={eagleLogo} alt="On The Spot" className="h-8 w-8 rounded object-cover" />
            <h1 className="text-xl font-bold tracking-tight">On The Spot</h1>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <div className="text-xs font-semibold text-muted-foreground tracking-wider mb-4 px-2">PLATFORM</div>
          <a href="/connect" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" data-testid="nav-esp32-connect">
            <Activity className="w-4 h-4" />
            Connect ESP32
          </a>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md bg-primary/10 text-primary font-medium border border-primary/20" data-testid="nav-customers">
            <Building2 className="w-4 h-4" />
            Customers
          </button>
          <button type="button" onClick={() => setLocation("/technicians")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" data-testid="nav-technicians">
            <Users className="w-4 h-4" />
            Technicians
          </button>
          <button type="button" onClick={() => setLocation("/settings")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" data-testid="nav-settings">
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </nav>
        
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 px-2">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-border" data-testid="img-avatar" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center font-mono text-xs">
                {(user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" data-testid="text-username">
                {user?.firstName || user?.primaryEmailAddress?.emailAddress || 'User'}
              </div>
              <div className="text-xs text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress || ''}</div>
            </div>
            <button onClick={() => signOut({ redirectUrl: import.meta.env.BASE_URL })} title="Sign out" aria-label="Sign out" data-testid="link-logout">
              <LogOut className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="p-6 md:p-8 border-b border-border/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-background/50 backdrop-blur-sm z-10">
          <div>
            <p className="text-xs text-primary mb-1" data-testid="workspace-name">{settings?.organizationName || "Your workspace"}</p>
            <h2 className="text-2xl font-bold tracking-tight">Customer Portfolio</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage and monitor your deployed units.</p>
            <a href="/connect" className="inline-block mt-2 text-sm text-primary hover:underline md:hidden" data-testid="mobile-esp32-connect">Connect ESP32</a>
            <nav aria-label="Workspace pages" className="flex flex-wrap gap-4 mt-2 text-sm text-primary md:hidden">
              <a href="/technicians" data-testid="mobile-technicians">Technicians</a>
              <a href="/settings" data-testid="mobile-settings">Settings</a>
            </nav>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search customers..." 
                className="pl-9 bg-card/50 border-border/50 focus-visible:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
              />
            </div>
            
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 shadow-[0_0_15px_rgba(230,180,50,0.3)]" data-testid="button-add-customer">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] border-primary/20 bg-card/95 backdrop-blur-xl">
                <DialogHeader>
                  <DialogTitle className="text-xl">Onboard New Customer</DialogTitle>
                  <DialogDescription>
                    Add a new facility to the On The Spot monitoring platform.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Facility Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Westside Data Center"
                      className="bg-background/50 border-border"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      data-testid="input-customer-name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="City, State"
                      className="bg-background/50 border-border"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      data-testid="input-customer-location"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="plan">Service Plan</Label>
                    <Select value={formPlan} onValueChange={setFormPlan}>
                      <SelectTrigger className="bg-background/50 border-border" data-testid="select-plan">
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic" data-testid="select-plan-basic">Basic (MVP Core)</SelectItem>
                        <SelectItem value="premium" data-testid="select-plan-premium">Premium (Ultimate Mode)</SelectItem>
                        <SelectItem value="enterprise" data-testid="select-plan-enterprise">Enterprise (Predictive AI)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)} className="border-border" data-testid="button-cancel">Cancel</Button>
                  <Button
                    onClick={handleAddCustomer}
                    className="bg-primary text-primary-foreground"
                    disabled={addCustomerMutation.isPending}
                    data-testid="button-submit-customer"
                  >
                    {addCustomerMutation.isPending ? "Deploying..." : "Deploy Configuration"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1">
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="tech-border bg-card/40 backdrop-blur-sm border-border">
              <CardContent className="p-6 flex flex-col justify-center">
                <div className="text-sm text-muted-foreground mb-2">Total Monitored Units</div>
                {isLoading ? (
                  <div className="h-10 w-16 bg-muted/30 animate-pulse rounded" />
                ) : (
                  <div className="text-4xl font-mono text-foreground data-value" data-testid="stat-total-units">{fleetStats?.totalUnits ?? 0}</div>
                )}
              </CardContent>
            </Card>
            
            <Card className="tech-border bg-card/40 backdrop-blur-sm border-accent/20 border-l-4 border-l-accent">
              <CardContent className="p-6 flex flex-col justify-center">
                <div className="text-sm text-muted-foreground mb-2 flex items-center justify-between">
                  Optimal State
                  <CheckCircle2 className="w-4 h-4 text-accent" />
                </div>
                {isLoading ? (
                  <div className="h-10 w-16 bg-muted/30 animate-pulse rounded" />
                ) : (
                  <div className="text-4xl font-mono text-accent data-value" data-testid="stat-optimal">{fleetStats?.optimal ?? 0}</div>
                )}
              </CardContent>
            </Card>
            
            <Card className="tech-border bg-card/40 backdrop-blur-sm border-destructive/20 border-l-4 border-l-destructive">
              <CardContent className="p-6 flex flex-col justify-center">
                <div className="text-sm text-muted-foreground mb-2 flex items-center justify-between">
                  Critical Faults
                  <ShieldAlert className="w-4 h-4 text-destructive" />
                </div>
                {isLoading ? (
                  <div className="h-10 w-16 bg-muted/30 animate-pulse rounded" />
                ) : (
                  <div className="text-4xl font-mono text-destructive data-value" data-testid="stat-critical">{fleetStats?.critical ?? 0}</div>
                )}
              </CardContent>
            </Card>

            <Card className="tech-border bg-primary/10 backdrop-blur-sm border-primary/30">
              <CardContent className="p-6 flex flex-col justify-center items-center text-center">
                <div className="text-sm text-primary mb-2">Fleet Health Score</div>
                {isLoading ? (
                  <div className="h-10 w-16 bg-muted/30 animate-pulse rounded" />
                ) : (
                  <div className="text-4xl font-mono text-primary data-value" data-testid="stat-avg-health">{fleetStats?.assessedUnits === 0 || !fleetStats ? "—" : `${Math.round(fleetStats.avgHealth)}%`}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Customer List */}
          <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Active Deployments</h3>
          
          {customersLoading ? (
            <div className="grid gap-4" data-testid="loading-skeleton">
              {[1, 2, 3].map(i => (
                <Card key={i} className="tech-border bg-card/40 backdrop-blur-sm border-border">
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="h-5 w-48 bg-muted/30 animate-pulse rounded" />
                        <div className="h-4 w-32 bg-muted/30 animate-pulse rounded" />
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="h-8 w-12 bg-muted/30 animate-pulse rounded" />
                        <div className="h-8 w-12 bg-muted/30 animate-pulse rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="empty-state">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p className="text-lg font-medium">No customers found</p>
              <p className="text-sm mt-1">Add a customer to get started.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredCustomers.map((customer, i) => {
                const status = getStatus(customer.healthScore);
                return (
                  <motion.div
                    key={customer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card 
                      className={`group tech-border bg-card/40 hover:bg-card/80 backdrop-blur-sm transition-all cursor-pointer border-l-4 ${
                        status === 'optimal' ? 'border-l-accent border-accent/20' : 
                        status === 'critical' ? 'border-l-destructive border-destructive/20' : 
                        'border-l-primary border-primary/20'
                      }`}
                      onClick={() => handleCustomerClick(customer.id)}
                      data-testid={`card-customer-${customer.id}`}
                    >
                      <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        
                        {/* Left details */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-lg font-semibold group-hover:text-primary transition-colors" data-testid={`text-customer-name-${customer.id}`}>{customer.name}</h4>
                            <Badge variant="outline" className="font-mono text-xs text-muted-foreground border-border bg-background/50">
                              {customer.id.slice(0, 8)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {customer.location}</span>
                            <span className="flex items-center gap-1.5">
                              <Badge variant="outline" className={`text-xs ${
                                customer.plan === 'enterprise' ? 'border-primary text-primary' :
                                customer.plan === 'premium' ? 'border-accent text-accent' :
                                'border-border text-muted-foreground'
                              }`}>
                                {customer.plan}
                              </Badge>
                            </span>
                          </div>
                        </div>
                        
                        {/* Right stats */}
                        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-border/50 pt-4 md:pt-0">
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground mb-1">UNITS</div>
                            <div className="font-mono text-lg" data-testid={`text-units-${customer.id}`}>{customer.unitCount}</div>
                          </div>
                          
                          <div className="text-center px-4 md:px-6 md:border-x border-border/50">
                            <div className="text-xs text-muted-foreground mb-1">FLEET HEALTH</div>
                            <div className={`font-mono text-lg ${
                              customer.healthScore === null ? 'text-muted-foreground' :
                              customer.healthScore >= 90 ? 'text-accent' : 
                              customer.healthScore >= 70 ? 'text-primary' : 
                              'text-destructive'
                            }`} data-testid={`text-health-${customer.id}`}>
                              {customer.healthScore !== null ? Math.round(customer.healthScore) : "N/A"}
                            </div>
                          </div>
                          
                          <div className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-background/50 group-hover:bg-primary/20 transition-colors">
                            <ChevronRight className="w-4 h-4 group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
