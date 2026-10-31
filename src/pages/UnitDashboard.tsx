import React, { useState } from 'react';
import { 
  Activity,
  Thermometer,
  Wind,
  Zap,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Server,
  Settings,
  ShieldAlert,
  Fan,
  Cpu,
  HeartPulse,
  ArrowLeft,
  Usb
} from 'lucide-react';
import { Link, useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import eagleLogo from '@assets/AOF_eagle_1771799559884.png';
import type { DemoUnitDetail } from '@/lib/demo-data';
import { fahrenheitDeltaToCelsius, formatTemperatureDeltaFahrenheit, formatTemperatureFahrenheit } from '@shared/temperature';
import { useWorkspaceSettings } from "@/hooks/use-workspace-settings";
import { isFreshTelemetry, REQUIRED_HEALTH_KEYS } from "@shared/telemetry-quality";
import LocalHardwarePanel from "@/components/bench/LocalHardwarePanel";

import { DeviceAccess } from '@/components/DeviceAccess';

interface UnitDetail {
  unit: { id: string; customerId: string; name: string; systemType: string | null; timezone: string | null };
  status: { unitId: string; updatedAt: string; healthScore: number; faults: any } | null;
  latestReadings: { unitId: string; ts: string; key: string; value: number }[];
  diagnostics: { unitId: string; ts: string; metric: string; value: number; meta: any }[];
}

function getReading(readings: UnitDetail['latestReadings'], key: string): number | null {
  const r = readings.find(r => r.key === key);
  return r ? r.value : null;
}

function fmt(val: number | null, decimals = 1, suffix = ''): string {
  if (val === null || val === undefined) return '—';
  return val.toFixed(decimals) + suffix;
}

function buildTimeSeries(diagnostics: UnitDetail['diagnostics'], metric: string) {
  return diagnostics
    .filter(d => d.metric === metric)
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
    .map(d => ({
      time: new Date(d.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      value: Number(d.value.toFixed(1)),
    }));
}

export default function Dashboard({
  demoData,
  onDemoBack,
  params: _routeParams,
}: {
  params?: { id: string };
  demoData?: DemoUnitDetail;
  onDemoBack?: () => void;
}) {
  const { id: unitId } = useParams<{ id: string }>();
  const { data: settings } = useWorkspaceSettings(!demoData);
  const [activeTab, setActiveTab] = useState<'mvp' | 'ultimate' | 'health' | 'hardware'>(() =>
    demoData && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "hardware"
      ? "hardware" : "mvp");

  const { data, isLoading, error } = useQuery<UnitDetail>({
    queryKey: demoData ? ["demo-unit", demoData.unit.id] : ["/api/units", unitId],
    enabled: !demoData && !!unitId,
    refetchInterval: demoData ? false : (settings?.refreshSeconds ?? 15) * 1000,
    initialData: demoData,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-mono text-sm">LOADING UNIT DATA...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background text-foreground p-8">
        {demoData ? (
          <button type="button" onClick={onDemoBack} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-8" data-testid="link-back">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Demo Fleet
          </button>
        ) : (
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-8" data-testid="link-back">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Fleet Dashboard
          </Link>
        )}
        <div className="text-center mt-20">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-lg font-mono" data-testid="text-error">UNIT NOT FOUND</p>
          <p className="text-sm text-muted-foreground mt-2">{error?.message || 'Unable to load unit data'}</p>
        </div>
      </div>
    );
  }

  const { unit, status: storedStatus, latestReadings: storedReadings, diagnostics } = data;
  const latestReadings = demoData ? storedReadings : storedReadings.filter(reading => isFreshTelemetry(reading.ts));
  const hasCompleteReadings = REQUIRED_HEALTH_KEYS.every(key => latestReadings.some(reading => reading.key === key));
  const status = demoData ? storedStatus : storedStatus &&
    isFreshTelemetry(storedStatus.updatedAt) && hasCompleteReadings &&
    (storedStatus.faults as any)?.data_quality?.complete === true ? storedStatus : null;

  if (unit.systemType === 'bench_test') {
    return (
      <main className="min-h-[100dvh] bg-background text-foreground p-4 md:p-8">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="mb-8 inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-primary" data-testid="link-back">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet Dashboard
          </Link>
          <section className="mt-8 rounded-xl border border-primary/20 bg-card/60 p-6 shadow-sm sm:p-9">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary"><Activity className="h-6 w-6" /></div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Maker workspace · bench test</p>
            <h1 className="text-3xl font-semibold tracking-tight">{unit.name}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">This is an instrument test unit for locally connected fan and probe hardware. It is not an HVAC diagnostic unit; pressure and airflow are not measured here.</p>
            <Link href="/bench" target="_blank" rel="noopener" className="mt-7 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              Open maker bench workspace <Activity className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const healthScore = status?.healthScore ?? null;
  const faults = status?.faults as any ?? {};
  const restrictionScore = faults?.restriction?.score ?? null;
  const shortCyclingScore = faults?.short_cycling?.score ?? null;
  const lowChargeScore = faults?.low_charge?.score ?? null;

  const tempReturn = getReading(latestReadings, 'temp_return_f');
  const tempSupply = getReading(latestReadings, 'temp_supply_f');
  const ampBlower = getReading(latestReadings, 'amp_blower');
  const ampCondenser = getReading(latestReadings, 'amp_condenser');
  const dpFilter = getReading(latestReadings, 'dp_filter_pa');
  const callY = getReading(latestReadings, 'call_y');

  const deltaT = (tempReturn !== null && tempSupply !== null) ? Math.abs(tempReturn - tempSupply) : null;

  const healthTimeSeries = buildTimeSeries(diagnostics, 'health_score');
  const deltaTTimeSeries = buildTimeSeries(diagnostics, 'delta_t_f');
  const restrictionTimeSeries = buildTimeSeries(diagnostics, 'restriction_score');

  const hasStatus = status !== null;
  const hasReadings = latestReadings.length > 0;

  const healthLabel = healthScore !== null
    ? (healthScore >= 80 ? 'OPTIMAL STATE' : healthScore >= 50 ? 'ATTENTION NEEDED' : 'CRITICAL')
    : 'AWAITING DATA';

  const healthBadgeClass = healthScore !== null
    ? (healthScore >= 80 ? 'border-primary text-primary bg-primary/10' : healthScore >= 50 ? 'border-accent text-accent bg-accent/10' : 'border-destructive text-destructive bg-destructive/10')
    : 'border-muted-foreground text-muted-foreground bg-muted/10';

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 lg:p-8 overflow-hidden">
      {!demoData && !status && <p role="status" className="mb-4 rounded border border-border bg-card p-3 text-sm text-muted-foreground" data-testid="telemetry-quality-notice">
        Health analysis is waiting for complete, recent sensor data and one hour of cooling-call history. USB bench readings stay local and do not establish equipment health.
      </p>}
      <div className="mb-4">
        {demoData ? (
          <button type="button" onClick={onDemoBack} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-back">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Demo Fleet
          </button>
        ) : (
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-back">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Fleet Dashboard
          </Link>
        )}
      </div>
      {!demoData && (
        <div className="mb-4">
          <Link href="/bench" target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10">
            <Activity className="h-4 w-4" /> Open maker bench workspace
          </Link>
        </div>
      )}
      {!demoData && <DeviceAccess key={unitId} unitId={unit.id} />}
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-border/50 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <img src={eagleLogo} alt="On The Spot" className="h-8 w-8 rounded object-cover" />
            <h1 className="text-2xl font-bold tracking-tight uppercase" data-testid="text-unit-name">{unit.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground font-mono" data-testid="text-system-type">
            {unit.systemType?.toUpperCase().replace(/_/g, ' ') || 'HVAC UNIT'} // REMOTE DIAGNOSTIC INTERFACE
          </p>
        </div>
        
        <div className="flex max-w-full flex-wrap items-center gap-1 bg-card/50 p-1.5 rounded-md border border-border" aria-label="Unit views">
          <button 
            onClick={() => setActiveTab('mvp')}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${activeTab === 'mvp' ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(230,180,50,0.3)]' : 'text-muted-foreground hover:text-foreground'}`}
            data-testid="tab-mvp"
          >
            MVP CORE
          </button>
          <button 
            onClick={() => setActiveTab('ultimate')}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'ultimate' ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(230,180,50,0.3)]' : 'text-muted-foreground hover:text-foreground'}`}
            data-testid="tab-ultimate"
          >
            <Server className="w-4 h-4" />
            ULTIMATE MODE
          </button>
          <button 
            onClick={() => setActiveTab('health')}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'health' ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(230,180,50,0.3)]' : 'text-muted-foreground hover:text-foreground'}`}
            data-testid="tab-health"
          >
            <HeartPulse className="w-4 h-4" />
            UNIT HEALTH
          </button>
          {demoData && <button
            type="button"
            onClick={() => setActiveTab('hardware')}
            aria-pressed={activeTab === 'hardware'}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'hardware' ? 'bg-primary text-primary-foreground' : 'text-primary hover:bg-primary/10'}`}
            data-testid="tab-hardware"
          >
            <Usb className="h-4 w-4" /> LIVE HARDWARE
          </button>}
        </div>
      </header>
      {demoData && activeTab !== 'hardware' && <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/25 bg-primary/5 p-4" data-testid="unit-hardware-intro">
        <div><p className="text-sm font-semibold">See your physical ESP32 on this sample unit</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Connect real temperature and current sensors here. Sample HVAC data remains fictional and separate.</p></div>
        <Button type="button" variant="outline" onClick={() => setActiveTab('hardware')} data-testid="unit-open-hardware"><Usb className="mr-2 h-4 w-4" /> Open live hardware</Button>
      </div>}
      {demoData && <section hidden={activeTab !== 'hardware'} aria-label="Live hardware on sample unit" data-testid="unit-hardware-panel">
        <LocalHardwarePanel unitName={unit.name} active={activeTab === 'hardware'} />
      </section>}

      {/* Main Content Grid */}
      <AnimatePresence mode="wait">
        {activeTab === 'hardware' ? null : activeTab === 'mvp' ? (
          <motion.div 
            key="mvp"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            {/* Status Panel - Left Col */}
            <div className="col-span-1 flex flex-col gap-6">
              <Card className="tech-border bg-card/40 backdrop-blur-sm border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex justify-between items-center">
                    UNIT STATUS
                    <Badge variant="outline" className={hasReadings ? "bg-accent/10 text-accent border-accent/20" : "bg-muted/10 text-muted-foreground border-border"} data-testid="badge-status">
                      {hasReadings ? 'ONLINE' : 'NO DATA'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hasReadings ? (
                    <>
                      <div className="flex items-baseline gap-2 mb-6">
                        <span className="text-2xl font-mono tracking-tighter text-foreground data-value sm:text-3xl" data-testid="text-return-temp">{formatTemperatureFahrenheit(tempReturn)}</span>
                      </div>
                      <div className="space-y-4">
                        <DiagnosticRow label="Return Air (RAT)" value={formatTemperatureFahrenheit(tempReturn)} status="normal" />
                        <DiagnosticRow label="Supply Air (SAT)" value={formatTemperatureFahrenheit(tempSupply)} status="optimal" />
                        <DiagnosticRow label="Blower Amps" value={fmt(ampBlower, 1, ' A')} status="normal" />
                        <DiagnosticRow label="Condenser Amps" value={fmt(ampCondenser, 1, ' A')} status="normal" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground text-sm font-mono" data-testid="text-awaiting-readings">AWAITING FIRST READING</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="tech-border bg-card/40 backdrop-blur-sm border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex justify-between items-center">
                    AIRFLOW & PRESSURE
                    <Wind className="w-4 h-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {hasReadings ? (
                    <>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Filter ΔP</span>
                          <span className={`font-mono ${dpFilter !== null && dpFilter > 200 ? 'text-destructive' : 'text-primary'}`} data-testid="text-filter-dp">{dpFilter !== null ? `${dpFilter.toFixed(0)} Pa` : '—'}</span>
                        </div>
                        <Progress value={dpFilter !== null ? Math.min((dpFilter / 300) * 100, 100) : 0} className={`h-1 ${dpFilter !== null && dpFilter > 200 ? 'bg-muted [&>div]:bg-destructive' : ''}`} />
                        {dpFilter !== null && dpFilter > 200 && (
                          <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> High filter pressure drop
                          </p>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Blower Amps</span>
                          <span className="font-mono" data-testid="text-blower-amps">{fmt(ampBlower, 1, ' A')}</span>
                        </div>
                        <Progress value={ampBlower !== null ? Math.min((ampBlower / 5) * 100, 100) : 0} className="h-1 bg-muted [&>div]:bg-accent" />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Call for Cool</span>
                          <span className="font-mono" data-testid="text-call-y">{callY !== null ? (callY > 0 ? 'ACTIVE' : 'OFF') : '—'}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground text-sm font-mono">NO DATA</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Main Charts - Middle/Right Cols */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col gap-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="tech-border bg-card/40 backdrop-blur-sm border-primary/20">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm text-muted-foreground">THERMAL DELTA (ΔT)</CardTitle>
                      <CardDescription>Supply vs Return temperature difference</CardDescription>
                    </div>
                    <Thermometer className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="h-[250px] w-full">
                    {deltaTTimeSeries.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={deltaTTimeSeries} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.5} vertical={false} />
                          <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} tickMargin={10} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} domain={['auto', 'auto']} tickFormatter={(value: number) => `${Number(value).toFixed(1)}°F / ${fahrenheitDeltaToCelsius(Number(value)).toFixed(1)}°C`} />
                          <Tooltip 
                            formatter={(value: number) => [formatTemperatureDeltaFahrenheit(value), 'ΔT']}
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '4px' }}
                            itemStyle={{ fontFamily: 'monospace' }}
                          />
                          <Line type="monotone" dataKey="value" name="ΔT · °F / °C" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground text-sm font-mono" data-testid="text-no-delta-chart">AWAITING DIAGNOSTIC DATA</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="tech-border bg-card/40 backdrop-blur-sm border-primary/20">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm text-muted-foreground">SYSTEM DIAGNOSIS</CardTitle>
                      <CardDescription>Physics-derived insights</CardDescription>
                    </div>
                    <ShieldAlert className="w-4 h-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    {hasStatus ? (
                      <div className="space-y-4">
                        {restrictionScore !== null && restrictionScore > 20 && (
                          <InsightCard 
                            title="Airflow Restriction" 
                            description={`Restriction score is ${restrictionScore}. Filter pressure drop may be elevated.`}
                            status="warning"
                          />
                        )}
                        {lowChargeScore !== null && lowChargeScore > 30 && (
                          <InsightCard 
                            title="Low Charge Suspicion" 
                            description={`Low charge suspicion score is ${lowChargeScore}. Thermal delta and condenser amps indicate possible refrigerant issue.`}
                            status="warning"
                          />
                        )}
                        {shortCyclingScore !== null && shortCyclingScore > 20 && (
                          <InsightCard 
                            title="Short Cycling Detected" 
                            description={`Short cycling score is ${shortCyclingScore}. Compressor may be cycling too frequently.`}
                            status="warning"
                          />
                        )}
                        {healthScore !== null && healthScore >= 80 && (
                          <InsightCard 
                            title="System Health" 
                            description={`Health score is ${healthScore.toFixed(0)}. System operating within normal parameters.`}
                            status="good"
                          />
                        )}
                        {deltaT !== null && (
                          <InsightCard 
                            title="Thermal Delta" 
                            description={`Current ΔT is ${formatTemperatureDeltaFahrenheit(deltaT)} (SAT: ${formatTemperatureFahrenheit(tempSupply)}, RAT: ${formatTemperatureFahrenheit(tempReturn)}).`}
                            status="info"
                          />
                        )}
                        {(restrictionScore === null || restrictionScore <= 20) && (lowChargeScore === null || lowChargeScore <= 30) && (shortCyclingScore === null || shortCyclingScore <= 20) && healthScore !== null && healthScore < 80 && (
                          <InsightCard 
                            title="Attention Needed" 
                            description={`Health score is ${healthScore.toFixed(0)}. Review sensor data for anomalies.`}
                            status="info"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground text-sm font-mono">AWAITING FIRST DIAGNOSTIC CYCLE</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Logic Row */}
              <Card className="tech-border bg-card/40 backdrop-blur-sm border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">CONTROL LOGIC SIGNALS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <LogicBlock label="CALL FOR COOL" active={callY !== null && callY > 0} />
                    <LogicBlock label="COMPRESSOR" active={ampCondenser !== null && ampCondenser > 1} />
                    <LogicBlock label="BLOWER" active={ampBlower !== null && ampBlower > 0.5} />
                    <LogicBlock label="FILTER STATUS" active={dpFilter !== null && dpFilter < 200} percentage={dpFilter !== null ? Math.max(0, Math.round(100 - (dpFilter / 300) * 100)) : undefined} />
                  </div>
                </CardContent>
              </Card>

            </div>
          </motion.div>
        ) : activeTab === 'ultimate' ? (
          <motion.div 
            key="god"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Sensor Data & Charts */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              <Card className="tech-border bg-card/40 backdrop-blur-sm border-primary/40 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-primary tracking-wide flex items-center gap-2">
                        <Gauge className="w-5 h-5" />
                        LIVE SENSOR DATA
                      </CardTitle>
                      <CardDescription>Real-time readings from unit sensors</CardDescription>
                    </div>
                    <Badge variant="outline" className={`border-primary/50 text-primary bg-primary/10 font-mono`} data-testid="badge-compressor-status">
                      {ampCondenser !== null && ampCondenser > 1 ? 'COMPRESSOR: RUNNING' : 'COMPRESSOR: OFF'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {hasReadings ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <h4 className="text-sm font-semibold text-muted-foreground border-b border-border/50 pb-2">TEMPERATURE READINGS</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <UltimateModeData point="Return Air" value={formatTemperatureFahrenheit(tempReturn)} unit="" />
                          <UltimateModeData point="Supply Air" value={formatTemperatureFahrenheit(tempSupply)} unit="" />
                          <div className="col-span-2 bg-primary/5 border border-primary/20 p-3 rounded-md">
                            <div className="text-xs text-muted-foreground mb-1">THERMAL DELTA (ΔT)</div>
                            <div className="flex items-end gap-2">
                              <span className="text-lg font-mono text-primary data-value sm:text-xl" data-testid="text-delta-t">{formatTemperatureDeltaFahrenheit(deltaT)}</span>
                            </div>
                            <div className="text-xs text-primary/70 mt-1">Target: 14–22°F / 7.8–12.2°C (Normal Cooling)</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        <h4 className="text-sm font-semibold text-muted-foreground border-b border-border/50 pb-2">ELECTRICAL & AIRFLOW</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <UltimateModeData point="Blower Amps" value={fmt(ampBlower)} unit="A" />
                          <UltimateModeData point="Condenser Amps" value={fmt(ampCondenser)} unit="A" />
                          <div className="col-span-2 bg-accent/5 border border-accent/20 p-3 rounded-md">
                            <div className="text-xs text-muted-foreground mb-1">FILTER PRESSURE DROP</div>
                            <div className="flex items-end gap-2">
                              <span className="text-2xl font-mono text-accent data-value" data-testid="text-filter-dp-god">{dpFilter !== null ? dpFilter.toFixed(0) : '—'}</span>
                              <span className="text-sm text-accent/70 mb-1">Pa</span>
                            </div>
                            <div className="text-xs text-accent/70 mt-1">Normal: &lt;150 Pa | Warning: &gt;200 Pa</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground text-sm font-mono" data-testid="text-god-no-data">AWAITING SENSOR DATA</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="tech-border bg-card/40 backdrop-blur-sm border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      ELECTRICAL VECTORS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center border-b border-border/30 pb-2">
                      <span className="text-sm">Condenser Amps</span>
                      <span className="font-mono text-sm" data-testid="text-condenser-detail">{ampCondenser !== null ? `${ampCondenser.toFixed(1)} A` : '—'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/30 pb-2">
                      <span className="text-sm">Blower Amps</span>
                      <span className="font-mono text-sm" data-testid="text-blower-detail">{ampBlower !== null ? `${ampBlower.toFixed(1)} A` : '—'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/30 pb-2">
                      <span className="text-sm">Call for Cool (Y)</span>
                      <span className="font-mono text-sm">{callY !== null ? (callY > 0 ? 'Active' : 'Inactive') : '—'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">System Status</span>
                      <Badge variant="outline" className={hasStatus && healthScore !== null && healthScore >= 80 ? "text-accent border-accent/30 bg-accent/10" : "text-muted-foreground border-border"}>
                        {hasStatus ? (healthScore !== null && healthScore >= 80 ? 'NOMINAL' : 'ATTENTION') : 'NO DATA'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="tech-border bg-card/40 backdrop-blur-sm border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <Fan className="w-4 h-4" />
                      FAULT SCORES
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center border-b border-border/30 pb-2">
                      <span className="text-sm">Restriction</span>
                      <span className="font-mono text-sm">{restrictionScore !== null ? restrictionScore.toFixed(0) : '—'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/30 pb-2">
                      <span className="text-sm">Short Cycling</span>
                      <span className="font-mono text-sm">{shortCyclingScore !== null ? shortCyclingScore.toFixed(0) : '—'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/30 pb-2">
                      <span className="text-sm">Low Charge</span>
                      <span className="font-mono text-sm">{lowChargeScore !== null ? lowChargeScore.toFixed(0) : '—'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Health Score</span>
                      <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
                        {healthScore !== null ? healthScore.toFixed(0) : '—'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div>

            {/* AI Diagnostics Sidebar */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <Card className="tech-border bg-card/60 backdrop-blur-md border-primary/30 h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-sm text-primary flex items-center gap-2">
                    <Cpu className="w-4 h-4" />
                    AUTONOMOUS DIAGNOSTICS
                  </CardTitle>
                  <CardDescription>Physics-derived engine output</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                  {hasStatus ? (
                    <>
                      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2">
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        </div>
                        <h3 className="font-mono text-sm text-primary mb-2">CURRENT ASSESSMENT</h3>
                        <p className="text-sm leading-relaxed" data-testid="text-assessment">
                          Health score: {healthScore?.toFixed(0) ?? '—'}/100.
                          {deltaT !== null && ` ΔT: ${formatTemperatureDeltaFahrenheit(deltaT)}.`}
                          {restrictionScore !== null && restrictionScore > 20 && ` Airflow restriction detected (score: ${restrictionScore.toFixed(0)}).`}
                          {lowChargeScore !== null && lowChargeScore > 30 && ` Low charge suspicion elevated (score: ${lowChargeScore.toFixed(0)}).`}
                          {shortCyclingScore !== null && shortCyclingScore > 20 && ` Short cycling detected (score: ${shortCyclingScore.toFixed(0)}).`}
                          {healthScore !== null && healthScore >= 80 && (restrictionScore === null || restrictionScore <= 20) && (lowChargeScore === null || lowChargeScore <= 30) && ' All systems nominal.'}
                        </p>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Recommendation</h4>
                        <div className={`bg-card border border-border p-3 rounded border-l-4 ${healthScore !== null && healthScore >= 80 ? 'border-l-accent' : 'border-l-destructive'}`}>
                          <p className="text-sm">{healthScore !== null && healthScore >= 80 ? 'No action needed.' : 'Review recommended.'}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {healthScore !== null && healthScore >= 80
                              ? 'System operating within normal parameters. Continue monitoring.'
                              : 'Investigate flagged fault scores and sensor readings. Schedule inspection if scores persist.'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-auto pt-6">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span>System Health</span>
                          <span className="font-mono text-primary" data-testid="text-health-sidebar">{healthScore !== null ? healthScore.toFixed(1) : '—'}%</span>
                        </div>
                        <Progress value={healthScore ?? 0} className="h-1" />
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <Cpu className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm font-mono">AWAITING FIRST DIAGNOSTIC CYCLE</p>
                        <p className="text-xs text-muted-foreground mt-2">Diagnostics will run after sensor data is received.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="health"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Overall Health Score */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <Card className="tech-border bg-card/60 backdrop-blur-md border-primary/40 relative overflow-hidden flex flex-col items-center justify-center py-10">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
                <CardHeader className="text-center pb-2 z-10">
                  <CardTitle className="text-muted-foreground tracking-widest text-sm">SYSTEM HEALTH SCORE</CardTitle>
                </CardHeader>
                <CardContent className="z-10 flex flex-col items-center">
                  <div className="relative flex items-center justify-center w-48 h-48 mb-4">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="8" />
                      <circle 
                        cx="50" cy="50" r="45" 
                        fill="none" 
                        stroke="currentColor" 
                        className="text-primary" 
                        strokeWidth="8" 
                        strokeDasharray="283" 
                        strokeDashoffset={283 - (283 * (healthScore ?? 0)) / 100}
                        strokeLinecap="round" 
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-6xl font-mono tracking-tighter text-primary data-value" data-testid="text-health-score">
                        {healthScore !== null ? Math.round(healthScore) : '—'}
                      </span>
                      <span className="text-xs text-primary/70 mt-1">/ 100</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={`${healthBadgeClass} px-4 py-1`} data-testid="badge-health-label">{healthLabel}</Badge>
                </CardContent>
              </Card>

              {/* Health Score Trend Chart */}
              {healthTimeSeries.length > 0 && (
                <Card className="tech-border bg-card/40 backdrop-blur-sm border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">HEALTH TREND</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={healthTimeSeries} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.5} vertical={false} />
                        <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} tickMargin={10} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} domain={[0, 100]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '4px' }}
                          itemStyle={{ fontFamily: 'monospace' }}
                        />
                        <ReferenceLine y={80} stroke="hsl(var(--accent))" strokeDasharray="3 3" opacity={0.5} />
                        <Line type="monotone" dataKey="value" name="Health" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Diagnostic Breakdowns */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Restriction Score */}
              <Card className="tech-border bg-card/40 backdrop-blur-sm border-accent/20">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <Wind className="w-4 h-4 text-accent" />
                    AIRFLOW RESTRICTION
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2 mb-4">
                    <span className="text-4xl font-mono text-accent" data-testid="text-restriction-score">{restrictionScore !== null ? Math.round(restrictionScore) : '—'}</span>
                    <span className="text-sm text-muted-foreground mb-1">score</span>
                  </div>
                  <Progress value={restrictionScore ?? 0} className="h-1.5 mb-4 bg-muted [&>div]:bg-accent" />
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">Contributing Factors:</div>
                    <div className="flex justify-between text-xs">
                      <span>Filter ΔP</span>
                      <span className={dpFilter !== null && dpFilter > 200 ? 'text-accent' : 'text-muted-foreground'}>
                        {dpFilter !== null ? `${dpFilter.toFixed(0)} Pa` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Blower Amps</span>
                      <span className="text-muted-foreground">{ampBlower !== null ? `${ampBlower.toFixed(1)} A` : '—'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Short Cycling Score */}
              <Card className="tech-border bg-card/40 backdrop-blur-sm border-border">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4 text-foreground" />
                    SHORT CYCLING
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2 mb-4">
                    <span className="text-4xl font-mono text-foreground" data-testid="text-short-cycling-score">{shortCyclingScore !== null ? Math.round(shortCyclingScore) : '—'}</span>
                    <span className="text-sm text-muted-foreground mb-1">score</span>
                  </div>
                  <Progress value={shortCyclingScore ?? 0} className="h-1.5 mb-4" />
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">Signal Status:</div>
                    <div className="flex justify-between text-xs">
                      <span>Call for Cool (Y)</span>
                      <span className="font-mono">{callY !== null ? (callY > 0 ? 'Active' : 'Inactive') : '—'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Compressor</span>
                      <span className="font-mono">{ampCondenser !== null ? (ampCondenser > 1 ? 'Running' : 'Off') : '—'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Low Charge Suspicion */}
              <Card className="tech-border bg-card/40 backdrop-blur-sm border-primary/20 md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-primary" />
                    LOW CHARGE SUSPICION
                  </CardTitle>
                  <CardDescription>Correlated from thermal delta + condenser amps</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-end gap-2 mb-4">
                      <span className="text-4xl font-mono text-primary data-value" data-testid="text-low-charge-score">{lowChargeScore !== null ? Math.round(lowChargeScore) : '—'}</span>
                      <span className="text-sm text-muted-foreground mb-1">score</span>
                    </div>
                    <Progress value={lowChargeScore ?? 0} className="h-1.5 mb-4" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {lowChargeScore !== null && lowChargeScore > 30
                        ? `Suspicion is elevated (score: ${Math.round(lowChargeScore)}). The current ΔT and condenser amp readings suggest possible refrigerant issues.`
                        : lowChargeScore !== null
                        ? `Low charge suspicion is within normal range (score: ${Math.round(lowChargeScore)}).`
                        : 'Awaiting diagnostic data to evaluate charge status.'}
                    </p>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded p-4 flex flex-col justify-center">
                    <div className="flex justify-between text-sm mb-3 border-b border-border/50 pb-2">
                      <span className="text-muted-foreground">ΔT (SAT-RAT)</span>
                      <span className="font-mono text-primary">{formatTemperatureDeltaFahrenheit(deltaT)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-3 border-b border-border/50 pb-2">
                      <span className="text-muted-foreground">Condenser Amps</span>
                      <span className="font-mono">{ampCondenser !== null ? `${ampCondenser.toFixed(1)} A` : '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Filter ΔP</span>
                      <span className="font-mono text-accent">{dpFilter !== null ? `${dpFilter.toFixed(0)} Pa` : '—'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Restriction Trend Chart */}
              {restrictionTimeSeries.length > 0 && (
                <Card className="tech-border bg-card/40 backdrop-blur-sm border-accent/20 md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">RESTRICTION SCORE TREND</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={restrictionTimeSeries} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.5} vertical={false} />
                        <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} tickMargin={10} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} domain={[0, 'auto']} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '4px' }}
                          itemStyle={{ fontFamily: 'monospace' }}
                        />
                        <Line type="monotone" dataKey="value" name="Restriction" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Subcomponents

function DiagnosticRow({ label, value, status }: { label: string, value: string, status: 'normal' | 'warning' | 'optimal' | 'info' }) {
  const colors = {
    normal: 'text-foreground',
    warning: 'text-destructive',
    optimal: 'text-accent',
    info: 'text-primary'
  };
  
  return (
    <div className="flex justify-between items-center border-b border-border/40 pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-mono text-sm ${colors[status]}`}>{value}</span>
    </div>
  );
}

function InsightCard({ title, description, status }: { title: string, description: string, status: 'good' | 'warning' | 'info' }) {
  const styles = {
    good: 'border-l-accent bg-accent/5',
    warning: 'border-l-destructive bg-destructive/5',
    info: 'border-l-primary bg-primary/5'
  };
  
  const icons = {
    good: <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />,
    info: <Activity className="w-4 h-4 text-primary mt-0.5 shrink-0" />
  };

  return (
    <div className={`p-3 rounded border border-border border-l-4 ${styles[status]} flex gap-3 items-start`}>
      {icons[status]}
      <div>
        <h4 className="text-sm font-medium mb-1">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function LogicBlock({ label, active, percentage }: { label: string, active: boolean, percentage?: number }) {
  return (
    <div className={`p-3 rounded border flex flex-col items-center justify-center text-center gap-2 transition-colors ${active ? 'bg-primary/10 border-primary/30' : 'bg-muted/10 border-border/50'}`}>
      <div className={`w-3 h-3 rounded-full ${active ? 'bg-primary shadow-[0_0_8px_rgba(230,180,50,0.8)]' : 'bg-muted-foreground/30'}`} />
      <span className={`text-xs font-mono tracking-tight ${active ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
      {percentage !== undefined && (
        <span className="text-xs font-mono">{percentage}%</span>
      )}
    </div>
  );
}

function UltimateModeData({ point, value, unit }: { point: string, value: string, unit: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{point}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-mono text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}
