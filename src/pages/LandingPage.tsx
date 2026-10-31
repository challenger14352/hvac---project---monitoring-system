import { useState, useEffect } from 'react';
import { 
  Shield, Activity, Thermometer, Zap, BarChart3, Users, 
  ArrowRight, CheckCircle2, Gauge, Wind, AlertTriangle,
  Clock, TrendingUp, Building2, Wrench, Eye, ChevronRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import eagleLogo from '@assets/AOF_eagle_1771799559884.png';
import heroDashboard from '@/assets/images/hero-dashboard.png';

function AnimatedCounter({ target, suffix = "", duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.5 }
    );
    const el = document.getElementById(`counter-${target}`);
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  useEffect(() => {
    if (!started) return;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [started, target, duration]);

  return <span id={`counter-${target}`}>{count}{suffix}</span>;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="landing-page">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={eagleLogo} alt="On The Spot" className="w-10 h-10 object-contain" />
            <span className="hidden sm:inline text-xl font-bold tracking-tight text-primary font-mono">ON THE SPOT</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors" data-testid="link-features">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors" data-testid="link-how-it-works">How It Works</a>
            <a href="#diagnostics" className="hover:text-foreground transition-colors" data-testid="link-diagnostics">Diagnostics</a>
            <a href="#tiers" className="hover:text-foreground transition-colors" data-testid="link-plans">Plans</a>
            <a href="/demo" className="hover:text-foreground transition-colors" data-testid="link-demo">Product Demo</a>
          </div>
          <div className="flex items-center gap-3">
          <a href="/connect" className="text-sm text-primary hover:underline" data-testid="link-esp32-connect">Connect ESP32</a>
          <a href="/sign-in" data-testid="link-login">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
              Sign In
            </Button>
          </a>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 pointer-events-none" />
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm">
              <Shield className="w-4 h-4" />
              Remote HVAC Diagnostics Platform
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              <span className="font-serif">Diagnose HVAC issues</span>
              <br />
              <span className="text-primary font-serif">before they fail</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
              On The Spot translates physical sensor signals into physics-derived diagnostics 
              with automated health scoring and fault detection. Replace guesswork with science.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="/sign-up" data-testid="link-get-started">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 text-base px-8 gap-2">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
              <a href="#how-it-works" data-testid="link-learn-more">
                <Button size="lg" variant="outline" className="text-base px-8 border-border hover:bg-muted">
                  Learn More
                </Button>
              </a>
              <a href="/demo" data-testid="link-view-demo">
                <Button size="lg" variant="outline" className="text-base px-8 border-primary/40 text-primary hover:bg-primary/10">
                  Explore Demo
                </Button>
              </a>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                No hardware required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Setup in minutes
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Free trial
              </span>
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="relative rounded-2xl overflow-hidden ring-1 ring-border shadow-2xl shadow-primary/10 hover:scale-[1.02] transition-transform duration-500">
              <img src={heroDashboard} alt="On The Spot Dashboard" className="w-full h-auto" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 border-y border-border/50 bg-card/20">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: 99, suffix: "%", label: "Uptime reliability" },
            { value: 50, suffix: "K+", label: "Readings processed" },
            { value: 85, suffix: "%", label: "Faster diagnosis" },
            { value: 24, suffix: "/7", label: "Monitoring" },
          ].map((stat) => (
            <div key={stat.label} className="text-center" data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}>
              <div className="text-3xl md:text-4xl font-mono font-bold text-primary">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-sm text-muted-foreground mt-2">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-4">
              <Zap className="w-4 h-4" />
              Platform Capabilities
            </div>
            <h2 className="text-4xl font-bold font-serif mb-4">Why On The Spot?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Physics-based diagnostics that go beyond simple threshold alerts. 
              Understand what's actually happening inside your HVAC systems.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Gauge,
                title: "Health Scoring",
                desc: "Weighted composite health scores (0-100) computed from temperature, pressure, and electrical signals. Know the condition of every unit at a glance.",
                color: "text-primary"
              },
              {
                icon: AlertTriangle,
                title: "Fault Detection",
                desc: "Automatic detection of airflow restriction, short cycling, and low refrigerant charge patterns before they cause failures.",
                color: "text-yellow-400"
              },
              {
                icon: BarChart3,
                title: "Fleet Overview",
                desc: "Monitor all your HVAC units across multiple facilities from a single dashboard. Drill down from fleet to individual unit diagnostics.",
                color: "text-blue-400"
              },
              {
                icon: Zap,
                title: "Real-time Ingest",
                desc: "Push sensor readings via API and get instant diagnostic updates. Every reading triggers a full physics-based analysis.",
                color: "text-green-400"
              },
              {
                icon: Shield,
                title: "Secure & Protected",
                desc: "Password-protected accounts with email login and password reset. Your fleet data stays safe with enterprise-grade security.",
                color: "text-purple-400"
              },
              {
                icon: Building2,
                title: "Multi-Tenant",
                desc: "Manage multiple customers and facilities with separate unit tracking, health monitoring, and diagnostic histories.",
                color: "text-orange-400"
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
                data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s/g, '-')}`}
              >
                <div className={`w-12 h-12 rounded-lg bg-background border border-border flex items-center justify-center mb-4 group-hover:border-primary/30 transition-colors`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 px-6 bg-card/20 border-y border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-4">
              <Wrench className="w-4 h-4" />
              Simple Setup
            </div>
            <h2 className="text-4xl font-bold font-serif mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              From sensor signals to actionable diagnostics in three simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "01",
                icon: Building2,
                title: "Connect Your Fleet",
                desc: "Register your customers and HVAC units. Organize by facility, system type, and service tier. Setup takes minutes."
              },
              {
                step: "02",
                icon: Activity,
                title: "Stream Sensor Data",
                desc: "Push temperature, pressure, electrical, and mechanical readings via our simple API. Each reading triggers real-time analysis."
              },
              {
                step: "03",
                icon: Eye,
                title: "Get Diagnostics",
                desc: "View health scores, fault detection results, and trending data for every unit. Catch problems before your customers feel them."
              },
            ].map((item, index) => (
              <div key={item.step} className="relative" data-testid={`step-${item.step}`}>
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                    <item.icon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="font-mono text-primary text-sm font-bold">STEP {item.step}</div>
                  <h3 className="text-xl font-bold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 -right-4 w-8">
                    <ChevronRight className="w-8 h-8 text-primary/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="diagnostics" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-4">
              <Thermometer className="w-4 h-4" />
              Diagnostic Engine
            </div>
            <h2 className="text-4xl font-bold font-serif mb-4">Physics-Based Scoring</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Our diagnostic engine uses real HVAC physics to compute scores — not arbitrary thresholds
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="relative rounded-2xl overflow-hidden ring-1 ring-border bg-card p-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <img src={eagleLogo} alt="" className="w-10 h-10 object-contain" />
                  <div>
                    <div className="font-mono text-primary font-bold">Unit Diagnostics</div>
                    <div className="text-xs text-muted-foreground">RTU-001 • Acme Logistics Center</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-background/50 rounded-lg p-4 border border-border">
                    <div className="text-2xl font-mono font-bold text-green-400">92%</div>
                    <div className="text-xs text-muted-foreground mt-1">Health Score</div>
                  </div>
                  <div className="bg-background/50 rounded-lg p-4 border border-border">
                    <div className="text-2xl font-mono font-bold text-primary">18.2°</div>
                    <div className="text-xs text-muted-foreground mt-1">Delta-T</div>
                  </div>
                  <div className="bg-background/50 rounded-lg p-4 border border-border">
                    <div className="text-2xl font-mono font-bold text-blue-400">4.2A</div>
                    <div className="text-xs text-muted-foreground mt-1">Blower Amps</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Restriction Score", value: 95, color: "bg-green-400" },
                    { label: "Short Cycle Score", value: 88, color: "bg-green-400" },
                    { label: "Low Charge Suspicion", value: 12, color: "bg-blue-400" },
                  ].map((metric) => (
                    <div key={metric.label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{metric.label}</span>
                        <span className="font-mono font-medium">{metric.value}%</span>
                      </div>
                      <div className="h-2 bg-background rounded-full overflow-hidden">
                        <div className={`h-full ${metric.color} rounded-full transition-all duration-1000`} style={{ width: `${metric.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {[
                {
                  icon: Gauge,
                  title: "Health Score (0-100)",
                  desc: "A weighted composite of all diagnostic metrics. Temperature differentials, electrical readings, and mechanical signals are combined using physics models to give you one number that tells the whole story.",
                  badge: "Core Metric"
                },
                {
                  icon: Wind,
                  title: "Airflow Restriction Detection",
                  desc: "Compares delta-T, blower amp draw, and filter differential pressure to detect restricted airflow before it causes compressor damage or comfort complaints.",
                  badge: "Premium"
                },
                {
                  icon: Clock,
                  title: "Short Cycle Analysis",
                  desc: "Tracks compressor starts per hour and run-time patterns. Short cycling causes excessive wear and energy waste — we catch it early.",
                  badge: "Premium"
                },
                {
                  icon: TrendingUp,
                  title: "Low Charge Suspicion",
                  desc: "Detects the telltale combination of long runtime with low temperature differential that indicates refrigerant loss, even without pressure readings.",
                  badge: "Premium"
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 p-4 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-300" data-testid={`card-diagnostic-${item.title.toLowerCase().replace(/\s/g, '-').substring(0, 20)}`}>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{item.title}</h3>
                      <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{item.badge}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="tiers" className="py-24 px-6 bg-card/20 border-y border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-4">
              <Users className="w-4 h-4" />
              Service Plans
            </div>
            <h2 className="text-4xl font-bold font-serif mb-4">Choose Your Tier</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Start with basic monitoring and scale up to full diagnostic intelligence
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Basic",
                subtitle: "MVP Core",
                desc: "Essential temperature monitoring and health scoring for small operations.",
                features: ["Temperature monitoring", "Basic health scoring", "Fleet overview dashboard", "Up to 10 units", "Email support"],
                highlight: false,
                cta: "Start Free"
              },
              {
                name: "Premium",
                subtitle: "Ultimate Mode",
                desc: "Full diagnostic suite with advanced fault detection for growing fleets.",
                features: ["Everything in Basic", "Full sensor suite analysis", "Advanced fault detection", "Restriction & short cycle scoring", "Low charge detection", "Unlimited units", "Priority support"],
                highlight: true,
                cta: "Get Premium"
              },
              {
                name: "Enterprise",
                subtitle: "Predictive AI",
                desc: "Predictive maintenance and custom integrations for large-scale operations.",
                features: ["Everything in Premium", "Predictive maintenance AI", "Custom API integrations", "White-label options", "Dedicated account manager", "SLA guarantee"],
                highlight: false,
                cta: "Contact Sales"
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`p-8 rounded-2xl border relative ${tier.highlight ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xl shadow-primary/10' : 'border-border bg-card/50'}`}
                data-testid={`card-tier-${tier.name.toLowerCase()}`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <div className="text-sm text-primary font-mono mb-1">{tier.subtitle}</div>
                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">{tier.desc}</p>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="/sign-up" data-testid={`link-tier-${tier.name.toLowerCase()}`}>
                  <Button className={`w-full ${tier.highlight ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20' : 'bg-muted hover:bg-muted/80 text-foreground'}`}>
                    {tier.cta}
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl font-bold font-serif">
            Ready to see your fleet <span className="text-primary">on the spot</span>?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stop guessing. Start diagnosing. Get real-time health scores and fault detection 
            for every HVAC unit in your fleet.
          </p>
          <a href="/sign-up" data-testid="link-cta-bottom">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 text-base px-10 gap-2">
              Get Started Now <ArrowRight className="w-4 h-4" />
            </Button>
          </a>
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground pt-4">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              Free trial included
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              Cancel anytime
            </span>
          </div>
        </div>
      </section>

      <footer className="py-12 px-6 border-t border-border bg-card/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <img src={eagleLogo} alt="" className="w-8 h-8 object-contain" />
                <span className="font-bold font-mono text-primary">ON THE SPOT</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Remote HVAC diagnostic platform with physics-based health scoring and fault detection.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#diagnostics" className="hover:text-foreground transition-colors">Diagnostics</a></li>
                <li><a href="#tiers" className="hover:text-foreground transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Diagnostics</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Health Scoring</li>
                <li>Fault Detection</li>
                <li>Short Cycle Analysis</li>
                <li>Low Charge Detection</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Get Started</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/sign-in" className="hover:text-foreground transition-colors">Sign In</a></li>
                <li><a href="/sign-up" className="hover:text-foreground transition-colors">Create Account</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground gap-4">
            <span>&copy; {new Date().getFullYear()} On The Spot. All rights reserved.</span>
            <span>Remote HVAC Diagnostics Platform</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
