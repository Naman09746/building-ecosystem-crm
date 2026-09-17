"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@repo/core/context/auth-context";
import {
  Building2,
  Layers,
  Armchair,
  Paintbrush,
  HardHat,
  ArrowRight,
  ArrowUpRight,
  Check,
  ShieldCheck,
  PhoneCall,
  Clock,
  Menu,
  X,
  FileSpreadsheet,
  ChevronDown,
  Database,
  Lock,
  GitBranch,
  FileText,
  Truck,
  Compass,
} from "lucide-react";
import {
  EcosystemDarkCockpit,
  LiveTelemetryTicker,
  VERTICAL_REGISTRY,
  VerticalType,
} from "@/components/marketing/architectural-visuals";

export default function LandingPage() {
  const { user, workflowStep } = useAuth();
  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "yearly">("monthly");
  const [selectedVertical, setSelectedVertical] = React.useState<VerticalType>("real_estate");
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const getDashboardHref = () => {
    if (!user) return "/login?mode=signup";
    if (workflowStep === "org") return "/setup-org";
    if (workflowStep === "plan") return "/choose-plan";
    if (workflowStep === "onboarding") return "/onboarding";
    return "/dashboard";
  };

  const verticalMeta = VERTICAL_REGISTRY[selectedVertical];

  return (
    <div className="min-h-screen w-full bg-[#faf9f5] text-[#121316] selection:bg-[#121316] selection:text-white flex flex-col font-sans antialiased">
      {/* ═══════════════════════════════════════════════════════
          ARCHITECTURAL HEADER & NAVIGATION
          ═══════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 w-full border-b border-[#e6e4dc] bg-[#faf9f5]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-sm text-[#121316]">
            <div className="h-7 w-7 rounded bg-[#121316] flex items-center justify-center text-white font-mono text-xs">
              AP
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-semibold tracking-tight text-[#121316]">APEX</span>
              <span className="text-[10px] font-mono text-[#737882] tracking-wider uppercase">BUILT ENVIRONMENT</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#5a606d]">
            <a href="#ecosystem" className="hover:text-[#121316] transition-colors">Ecosystem</a>
            <a href="#capabilities" className="hover:text-[#121316] transition-colors">Capabilities</a>
            <a href="#ledger" className="hover:text-[#121316] transition-colors">Unified Ledger</a>
            <a href="#pricing" className="hover:text-[#121316] transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-[#121316] transition-colors">FAQ</a>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login?mode=login"
            className="hidden sm:inline-flex px-3 py-1.5 text-xs font-medium text-[#5a606d] hover:text-[#121316] transition-colors"
          >
            Sign In
          </Link>

          <Link
            href={getDashboardHref()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#121316] hover:bg-[#252830] text-white text-xs font-medium transition-all shadow-sm active:scale-[0.98]"
          >
            <span>Launch Console</span>
            <ArrowRight className="h-3 w-3" />
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-[#5a606d] hover:text-[#121316]"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-[#e6e4dc] bg-[#faf9f5] px-6 py-4 space-y-3 text-xs font-medium"
          >
            <a href="#ecosystem" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#5a606d]">Ecosystem</a>
            <a href="#capabilities" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#5a606d]">Capabilities</a>
            <a href="#ledger" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#5a606d]">Unified Ledger</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#5a606d]">Pricing</a>
            <Link href="/login?mode=login" className="block py-1 text-[#121316] font-semibold">Sign In</Link>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col items-center">
        {/* ═══════════════════════════════════════════════════════
            HERO SECTION: ARCHITECTURAL AUTHORITY
            ═══════════════════════════════════════════════════════ */}
        <section className="w-full max-w-6xl px-4 sm:px-8 pt-16 pb-14 flex flex-col items-center text-center space-y-6">
          {/* Top Status Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#dcdad0] bg-white text-[11px] font-mono text-[#545a66] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="uppercase tracking-wider">Apex Built Environment Engine</span>
            <span className="text-[#a0a5b0]">|</span>
            <span className="text-[#121316] font-medium">PostgreSQL RLS Native</span>
          </div>

          {/* Editorial Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif tracking-tight text-[#121316] max-w-4xl leading-[1.08]">
            The Operating System for the <span className="italic font-normal">Built Environment</span>.
          </h1>

          {/* Precise Subtitle */}
          <p className="text-sm sm:text-base text-[#5a606d] max-w-2xl leading-relaxed">
            Unifying high-ticket real estate mandates, bulk building materials depots, bespoke luxury furniture ateliers, turnkey interior studios, and civil contracting into one real-time enterprise ledger.
          </p>

          {/* Dual CTAs & Micro-specs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link
              href={getDashboardHref()}
              className="w-full sm:w-auto px-6 py-2.5 rounded-md bg-[#121316] hover:bg-[#252830] text-white text-xs font-medium transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <span>Initialize Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <Link
              href="/login?mode=signup"
              className="w-full sm:w-auto px-5 py-2.5 rounded-md border border-[#d6d3c8] bg-white hover:bg-[#f3f1ea] text-[#121316] text-xs font-medium transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <span>Explore Demo Environment</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#7a8190]" />
            </Link>
          </div>

          <div className="flex items-center gap-6 text-[11px] font-mono text-[#7a8190] pt-2">
            <span>● ZERO SEAT TAX</span>
            <span>● GST COMPLIANT</span>
            <span>● AIR-GAPPED TENANCY</span>
          </div>

          {/* Live Telemetry Ticker */}
          <div className="w-full pt-4">
            <LiveTelemetryTicker />
          </div>

          {/* Flagship Cockpit Screen */}
          <div className="w-full pt-2">
            <EcosystemDarkCockpit />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            FIVE VERTICALS: STRUCTURAL CAD MATRIX
            ═══════════════════════════════════════════════════════ */}
        <section id="ecosystem" className="w-full border-t border-b border-[#e6e4dc] bg-white py-16 px-4 sm:px-8">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#ece9df] pb-6">
              <div>
                <span className="text-[11px] font-mono text-[#7a8190] uppercase tracking-widest">ECOSYSTEM MATRIX</span>
                <h2 className="text-2xl sm:text-3xl font-serif text-[#121316] tracking-tight mt-1">
                  Five Verticals. One Interlocked Architecture.
                </h2>
              </div>
              <p className="text-xs text-[#6a717e] max-w-md font-sans">
                Every transaction, inventory movement, and site approval bridges directly into the downstream construction and procurement cycle.
              </p>
            </div>

            {/* 5 Column Grid with Hairline CAD Dividers */}
            <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-[#ece9df] border border-[#ece9df] rounded-lg overflow-hidden bg-white">
              {(Object.keys(VERTICAL_REGISTRY) as VerticalType[]).map((vKey) => {
                const meta = VERTICAL_REGISTRY[vKey];
                const Icon = meta.icon;
                const isSelected = selectedVertical === vKey;

                return (
                  <button
                    key={vKey}
                    type="button"
                    onClick={() => setSelectedVertical(vKey)}
                    className={`p-5 text-left flex flex-col justify-between space-y-6 transition-colors group ${
                      isSelected ? "bg-[#faf9f5]" : "hover:bg-[#fcfbf9]"
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="h-8 w-8 rounded border border-[#e0ded4] bg-white flex items-center justify-center text-[#121316] group-hover:border-[#121316] transition-colors">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-mono text-[#8a919f]">{meta.code}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[10px] font-mono text-[#8a919f] uppercase">{meta.category}</div>
                        <h4 className="text-sm font-semibold text-[#121316] tracking-tight">{meta.title}</h4>
                      </div>

                      <p className="text-xs text-[#6a717e] leading-relaxed line-clamp-3">
                        {meta.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#ece9df] flex items-center justify-between font-mono text-xs">
                      <div>
                        <div className="text-sm font-bold text-[#121316] tabular-nums">{meta.metric}</div>
                        <div className="text-[10px] text-[#8a919f]">{meta.metricLabel}</div>
                      </div>
                      <ChevronDown className={`h-3.5 w-3.5 text-[#8a919f] transition-transform ${isSelected ? "rotate-180 text-[#121316]" : ""}`} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Interactive Vertical Drill-Down Card */}
            <div className="border border-[#e2dfd4] rounded-xl bg-[#faf9f5] p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e8e5dc] pb-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#121316] text-white flex items-center justify-center shrink-0">
                    <verticalMeta.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-[#7a8190] uppercase">{verticalMeta.badge}</span>
                    <h3 className="text-lg font-semibold text-[#121316]">{verticalMeta.title}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#7a8190]">INTEGRATED PIPELINE</span>
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                <div className="space-y-2 border-l-2 border-[#121316] pl-4">
                  <span className="font-mono text-[11px] text-[#7a8190] uppercase">01 // OPERATIONS</span>
                  <h5 className="font-semibold text-[#121316]">Automated Workflows</h5>
                  <p className="text-[#5a606d] leading-relaxed">
                    Zero manual WhatsApp follow-ups. Automated stage transitions triggered by physical receipts, weighbridge scale readings, or biometric gate entries.
                  </p>
                </div>

                <div className="space-y-2 border-l-2 border-[#121316] pl-4">
                  <span className="font-mono text-[11px] text-[#7a8190] uppercase">02 // LEDGER</span>
                  <h5 className="font-semibold text-[#121316]">Contractor Khata & Billing</h5>
                  <p className="text-[#5a606d] leading-relaxed">
                    Real-time debit/credit ledgers with automatic GST breakdown, contractor credit day thresholds (D-15/D-30), and instant payment dunning slips.
                  </p>
                </div>

                <div className="space-y-2 border-l-2 border-[#121316] pl-4">
                  <span className="font-mono text-[11px] text-[#7a8190] uppercase">03 // QUALITY</span>
                  <h5 className="font-semibold text-[#121316]">Strict Audit Verifications</h5>
                  <p className="text-[#5a606d] leading-relaxed">
                    Structural sign-offs, moisture checks, and measurement drawings must have verified timestamps and engineer credentials before milestone drawdown.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            CAPABILITIES: INDUSTRIAL PRECISION (NO AI CLICHES)
            ═══════════════════════════════════════════════════════ */}
        <section id="capabilities" className="w-full max-w-6xl px-4 sm:px-8 py-16 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[11px] font-mono text-[#7a8190] uppercase tracking-widest">ENGINEERING ADVANTAGE</span>
            <h2 className="text-3xl font-serif text-[#121316] tracking-tight">
              Constructed for High-Ticket Velocity.
            </h2>
            <p className="text-xs sm:text-sm text-[#5a606d] leading-relaxed">
              Standard CRM templates fail because the built environment runs on inventory physics, credit cycles, and structural compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Capability 1 */}
            <div className="border border-[#e2dfd4] rounded-lg bg-white p-6 space-y-4 hover:border-[#121316] transition-colors">
              <div className="h-8 w-8 rounded bg-[#faf9f5] border border-[#e4e1d7] flex items-center justify-center text-[#121316]">
                <PhoneCall className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#8a919f]">SPEED-TO-LEAD</span>
                <h4 className="text-sm font-semibold text-[#121316]">Sub-60s Inbound Voice Routing</h4>
              </div>
              <p className="text-xs text-[#5a606d] leading-relaxed">
                Connect incoming HNI property inquiries and contractor material orders directly to verified desk partners with live browser WebRTC dialers.
              </p>
              <div className="pt-3 border-t border-[#f0eee6] font-mono text-[11px] text-[#8a919f] flex items-center justify-between">
                <span>BENCHMARK SLA:</span>
                <span className="text-emerald-600 font-semibold">&lt; 45 SECONDS</span>
              </div>
            </div>

            {/* Capability 2 */}
            <div className="border border-[#e2dfd4] rounded-lg bg-white p-6 space-y-4 hover:border-[#121316] transition-colors">
              <div className="h-8 w-8 rounded bg-[#faf9f5] border border-[#e4e1d7] flex items-center justify-center text-[#121316]">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#8a919f]">MEASUREMENT & KHATA</span>
                <h4 className="text-sm font-semibold text-[#121316]">MB Books & Weighbridge Integration</h4>
              </div>
              <p className="text-xs text-[#5a606d] leading-relaxed">
                Replaces messy carbon-copy books. Capture gross, tare, and net weights straight from digital truck scales, synced into contractor khata balances.
              </p>
              <div className="pt-3 border-t border-[#f0eee6] font-mono text-[11px] text-[#8a919f] flex items-center justify-between">
                <span>SCALE PROTOCOL:</span>
                <span className="text-[#121316] font-semibold">RS-232 / TCP-IP</span>
              </div>
            </div>

            {/* Capability 3 */}
            <div className="border border-[#e2dfd4] rounded-lg bg-white p-6 space-y-4 hover:border-[#121316] transition-colors">
              <div className="h-8 w-8 rounded bg-[#faf9f5] border border-[#e4e1d7] flex items-center justify-center text-[#121316]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#8a919f]">COMPLIANCE & QA</span>
                <h4 className="text-sm font-semibold text-[#121316]">7/28-Day Curing QA & Snags</h4>
              </div>
              <p className="text-xs text-[#5a606d] leading-relaxed">
                Enforce civil QA standards. Log concrete cube crush testing (MPa), timber moisture equilibrium, and photo snags with GPS metadata.
              </p>
              <div className="pt-3 border-t border-[#f0eee6] font-mono text-[11px] text-[#8a919f] flex items-center justify-between">
                <span>RERA & IS CODES:</span>
                <span className="text-emerald-600 font-semibold">IS-456 / IS-516</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            UNIFIED ENTERPRISE LEDGER & INFRASTRUCTURE
            ═══════════════════════════════════════════════════════ */}
        <section id="ledger" className="w-full border-t border-[#e6e4dc] bg-[#121316] text-[#eceff4] py-16 px-4 sm:px-8">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#252830] pb-6">
              <div>
                <span className="text-[11px] font-mono text-[#88909f] uppercase tracking-widest">DATA ARCHITECTURE</span>
                <h2 className="text-3xl font-serif text-white tracking-tight mt-1">
                  Air-Gapped Multi-Tenancy & Row-Level Security
                </h2>
              </div>
              <p className="text-xs text-[#9aa2b0] max-w-md font-sans leading-relaxed">
                Brokerage client identities, wholesale commodity cost sheets, and proprietary millwork CAD drawings remain strictly isolated per organization.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
              <div className="border border-[#232730] bg-[#171920] rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2 text-white">
                  <Database className="h-4 w-4 text-[#8a94a6]" />
                  <span className="font-semibold">PostgreSQL RLS Engine</span>
                </div>
                <p className="text-[#88909f] font-sans text-xs leading-relaxed">
                  Every SQL query is evaluated against <code className="text-[#d0d6e2]">auth.uid()</code> and <code className="text-[#d0d6e2]">org_id</code> at the database kernel level. Zero tenant leakage risk.
                </p>
                <div className="pt-2 text-[11px] text-emerald-400">● 100% AIR-GAPPED TENANCY</div>
              </div>

              <div className="border border-[#232730] bg-[#171920] rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2 text-white">
                  <Lock className="h-4 w-4 text-[#8a94a6]" />
                  <span className="font-semibold">GST & Ledger Integrity</span>
                </div>
                <p className="text-[#88909f] font-sans text-xs leading-relaxed">
                  Cryptographically verified e-invoicing, reverse charge mechanisms, TDS calculations, and immutable credit Khata balance trails.
                </p>
                <div className="pt-2 text-[11px] text-emerald-400">● AUDIT-READY LEDGERS</div>
              </div>

              <div className="border border-[#232730] bg-[#171920] rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2 text-white">
                  <GitBranch className="h-4 w-4 text-[#8a94a6]" />
                  <span className="font-semibold">Local Offline Cache PWA</span>
                </div>
                <p className="text-[#88909f] font-sans text-xs leading-relaxed">
                  Works in underground basements, active civil slabs, and remote quarries with background synchronization as soon as connectivity resumes.
                </p>
                <div className="pt-2 text-[11px] text-emerald-400">● OFFLINE-FIRST ARCHITECTURE</div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            TRANSPARENT PRICING
            ═══════════════════════════════════════════════════════ */}
        <section id="pricing" className="w-full max-w-5xl px-4 sm:px-8 py-16 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-[11px] font-mono text-[#7a8190] uppercase tracking-widest">TRANSPARENT COMMERCIAL TERMS</span>
            <h2 className="text-3xl font-serif text-[#121316] tracking-tight">
              Built for Operating Desks of All Scales.
            </h2>
            <p className="text-xs sm:text-sm text-[#5a606d]">
              No hidden per-seat licensing penalties. Deploy across your entire office, warehouse, and job sites.
            </p>

            {/* Toggle */}
            <div className="flex items-center justify-center gap-3 pt-4">
              <span className={`text-xs font-medium ${billingCycle === "monthly" ? "text-[#121316]" : "text-[#7a8190]"}`}>
                Monthly
              </span>
              <button
                type="button"
                onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
                className="w-12 h-6 rounded-full bg-[#121316] p-1 flex items-center transition-colors"
                aria-label="Toggle Billing Cycle"
              >
                <motion.div
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={`h-4 w-4 rounded-full bg-white ${billingCycle === "yearly" ? "ml-auto" : ""}`}
                />
              </button>
              <span className={`text-xs font-medium flex items-center gap-1.5 ${billingCycle === "yearly" ? "text-[#121316]" : "text-[#7a8190]"}`}>
                <span>Annual</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#121316] text-white">SAVE 20%</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starter */}
            <div className="border border-[#e2dfd4] rounded-lg bg-white p-6 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-[#8a919f] uppercase">BOUTIQUE & ATELIER</span>
                  <h4 className="text-base font-semibold text-[#121316]">Independent Desk</h4>
                </div>
                <div className="font-mono">
                  <span className="text-3xl font-bold text-[#121316] tabular-nums">
                    {billingCycle === "yearly" ? "₹7,999" : "₹9,999"}
                  </span>
                  <span className="text-xs text-[#7a8190]"> / month</span>
                </div>
                <p className="text-xs text-[#5a606d]">
                  For luxury boutique brokers, custom furniture ateliers, and single-depot suppliers.
                </p>

                <div className="space-y-2 pt-4 border-t border-[#f0eee6] text-xs">
                  {["Up to 5 Operational Desks", "1 Vertical Active", "Weighbridge / Gate Pass Entry", "WhatsApp Automated Dunning"].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-[#4a505c]">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href={getDashboardHref()}
                className="w-full py-2 text-center rounded border border-[#121316] text-[#121316] hover:bg-[#121316] hover:text-white transition-colors text-xs font-medium"
              >
                Select Independent
              </Link>
            </div>

            {/* Growth / Pro */}
            <div className="border-2 border-[#121316] rounded-lg bg-white p-6 space-y-6 flex flex-col justify-between shadow-lg relative">
              <div className="absolute -top-3 left-6 px-2.5 py-0.5 rounded bg-[#121316] text-white text-[10px] font-mono uppercase tracking-wider">
                MOST POPULAR
              </div>

              <div className="space-y-4 pt-1">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-[#8a919f] uppercase">ESTABLISHED MULTI-UNIT</span>
                  <h4 className="text-base font-semibold text-[#121316]">Ecosystem Pro</h4>
                </div>
                <div className="font-mono">
                  <span className="text-3xl font-bold text-[#121316] tabular-nums">
                    {billingCycle === "yearly" ? "₹19,999" : "₹24,999"}
                  </span>
                  <span className="text-xs text-[#7a8190]"> / month</span>
                </div>
                <p className="text-xs text-[#5a606d]">
                  For multi-depot material distributors, design-and-build firms, and mandate developers.
                </p>

                <div className="space-y-2 pt-4 border-t border-[#f0eee6] text-xs">
                  {[
                    "Up to 25 Multi-Site Users",
                    "All 5 Ecosystem Verticals",
                    "Weighbridge + MB Book Integration",
                    "Full GST & Khata Ledger Engine",
                    "Speed-to-Lead WebRTC Dialer",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-[#242830]">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href={getDashboardHref()}
                className="w-full py-2 text-center rounded bg-[#121316] hover:bg-[#252830] text-white transition-colors text-xs font-medium shadow-sm"
              >
                Initialize Pro Workspace
              </Link>
            </div>

            {/* Enterprise */}
            <div className="border border-[#e2dfd4] rounded-lg bg-white p-6 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-[#8a919f] uppercase">INSTITUTIONAL & EPC</span>
                  <h4 className="text-base font-semibold text-[#121316]">Enterprise Desk</h4>
                </div>
                <div className="font-mono">
                  <span className="text-3xl font-bold text-[#121316] tracking-tight">Custom</span>
                  <span className="text-xs text-[#7a8190]"> / annual SLA</span>
                </div>
                <p className="text-xs text-[#5a606d]">
                  For tier-1 builders, national material logistics chains, and institutional contracting houses.
                </p>

                <div className="space-y-2 pt-4 border-t border-[#f0eee6] text-xs">
                  {[
                    "Unlimited Users & Yards",
                    "Dedicated Postgres RLS Cluster",
                    "SAP / Tally Prime ERP Sync",
                    "Custom SLA & Dedicated Solutions Architect",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-[#4a505c]">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href="/login?mode=signup"
                className="w-full py-2 text-center rounded border border-[#d2cfc4] text-[#121316] hover:bg-[#faf9f5] transition-colors text-xs font-medium"
              >
                Inquire Enterprise Terms
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            TECHNICAL FAQ
            ═══════════════════════════════════════════════════════ */}
        <section id="faq" className="w-full border-t border-[#e6e4dc] bg-white py-16 px-4 sm:px-8">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <span className="text-[11px] font-mono text-[#7a8190] uppercase tracking-widest">TECHNICAL DISCLOSURES</span>
              <h2 className="text-2xl sm:text-3xl font-serif text-[#121316] tracking-tight">
                Frequently Answered Inquiries
              </h2>
            </div>

            <div className="divide-y divide-[#ece9df] border-t border-b border-[#ece9df]">
              {[
                {
                  q: "How does Apex unify Real Estate and Building Materials without data clashing?",
                  a: "Each vertical operates as a dedicated operational domain governed by Postgres Row-Level Security (RLS). A real estate developer mandate and a cement supply depot can share contractor Khata ledgers while keeping confidential pricing, commission margins, and buyer identities strictly air-gapped.",
                },
                {
                  q: "Can our weighbridge operators and site supervisors use Apex without stable internet?",
                  a: "Yes. Apex is engineered as an offline-first Progressive Web App (PWA) with persistent indexedDB caching. Dispatch tare weights, MB measurement rows, and site photo check-ins are saved locally and synced with verified server timestamps upon reconnection.",
                },
                {
                  q: "How does the Contractor Khata credit ledger handle WhatsApp dunning?",
                  a: "Apex continuously reconciles dispatch challans against contractor payment terms (e.g. 15 or 30 day credit). As thresholds near expiration, automated WhatsApp summaries with payment links and itemized challan statements are dispatched automatically without manual intervention.",
                },
                {
                  q: "What if our Supabase or cloud infrastructure credentials are not configured initially?",
                  a: "Apex includes an automated, fully functional in-memory demonstration mode. You can test unit matrices, weighbridge tickets, workshop milestones, and analytics without configuring a live cloud database upfront.",
                },
              ].map((faq, i) => (
                <div key={i} className="py-4">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between text-left text-sm font-semibold text-[#121316] py-1"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`h-4 w-4 text-[#8a919f] transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="text-xs text-[#5a606d] leading-relaxed pt-2">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ═══════════════════════════════════════════════════════
          ARCHITECTURAL FOOTER
          ═══════════════════════════════════════════════════════ */}
      <footer className="w-full border-t border-[#e6e4dc] bg-[#faf9f5] py-12 px-4 sm:px-8 text-xs text-[#6a717e]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 font-mono text-[11px]">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded bg-[#121316] text-white flex items-center justify-center font-bold text-[10px]">
              AP
            </div>
            <span className="text-[#121316] font-semibold">APEX BUILT ENVIRONMENT CRM</span>
            <span className="text-[#a0a5b0]">/</span>
            <span>SYSTEM REVISION 3.4.1</span>
          </div>

          <div className="flex items-center gap-6 text-[#7a8190]">
            <a href="#ecosystem" className="hover:text-[#121316]">Ecosystem</a>
            <a href="#capabilities" className="hover:text-[#121316]">Capabilities</a>
            <a href="#pricing" className="hover:text-[#121316]">Pricing</a>
            <Link href="/login" className="hover:text-[#121316]">Console</Link>
          </div>

          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>ALL REGIONAL ENDPOINTS OPERATIONAL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
