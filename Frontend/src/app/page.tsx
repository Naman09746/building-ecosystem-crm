"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  Building2,
  PhoneCall,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  MapPin,
  Check,
  Compass,
  FileText,
  Smartphone,
  ChevronDown,
  Sparkles,
  Kanban,
  Clock,
  User,
  Users,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Menu,
  X,
} from "lucide-react";
import {
  HeroEditorialVisual,
  RealEstateRelationshipDiagram,
  PhysicalSiteVisitShowcase,
  ExecutiveDarkCockpit,
  ArchitecturalFloorplanVector,
} from "@/components/marketing/architectural-visuals";

export default function LandingPage() {
  const router = useRouter();
  const { user, workflowStep } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "yearly">("monthly");
  const [activeTab, setActiveTab] = React.useState<"specs" | "ownership" | "gate" | "demand">("specs");
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const getDashboardHref = () => {
    if (!user) return "/login?mode=signup";
    if (workflowStep === "org") return "/setup-org";
    if (workflowStep === "plan") return "/choose-plan";
    if (workflowStep === "onboarding") return "/onboarding";
    return "/dashboard";
  };

  return (
    <div className="min-h-screen w-full max-w-full bg-[#f8f7f4] text-[#181a19] selection:bg-[#a68138]/20 flex flex-col font-sans overflow-x-hidden">
      {/* ═══════════════════════════════════════════════════════
          RESPONSIVE EDITORIAL NAVBAR
          ═══════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 w-full border-b border-[#e2ded6] bg-[#f8f7f4]/95 backdrop-blur-md px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between min-w-0">
        <div className="flex items-center gap-4 sm:gap-8 min-w-0">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-sm tracking-tight text-[#181a19] shrink-0">
            <div className="h-7 w-7 rounded-lg bg-[#181a19] text-[#f8f7f4] flex items-center justify-center shadow-xs shrink-0">
              <Building2 className="h-4 w-4 text-[#a68138]" />
            </div>
            <span className="font-semibold text-sm sm:text-base">Apex CallCRM</span>
          </Link>

          {/* Desktop/Tablet Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-[#4a4d4b]">
            <a href="#property-intelligence" className="hover:text-[#181a19] transition-colors py-1">
              Property Details
            </a>
            <a href="#matching" className="hover:text-[#181a19] transition-colors py-1">
              Buyer Matching
            </a>
            <a href="#site-visits" className="hover:text-[#181a19] transition-colors py-1">
              Site Visits
            </a>
            <a href="#leadership" className="hover:text-[#181a19] transition-colors py-1">
              For Leadership
            </a>
            <a href="#pricing" className="hover:text-[#181a19] transition-colors py-1">
              Pricing
            </a>
          </nav>
        </div>

        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          {mounted && user ? (
            <Link
              href={getDashboardHref()}
              className="py-2 px-4 bg-[#181a19] hover:bg-[#2d302e] text-[#f8f7f4] text-xs font-semibold rounded-lg transition-all shadow-xs flex items-center gap-1.5"
            >
              <span>Go to Workspace</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#a68138]" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-xs font-semibold text-[#181a19] hover:text-[#4a4d4b] px-3 py-2 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/login?mode=signup"
                className="py-2 px-4 bg-[#181a19] hover:bg-[#2d302e] text-[#f8f7f4] text-xs font-semibold rounded-lg transition-all shadow-xs flex items-center gap-1.5"
              >
                <span>Start 14-Day Free Trial</span>
                <ArrowRight className="h-3.5 w-3.5 text-[#a68138]" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <div className="flex sm:hidden items-center gap-1.5 shrink-0">
          {mounted && user ? (
            <Link
              href={getDashboardHref()}
              className="py-1.5 px-3 bg-[#181a19] text-[#f8f7f4] text-xs font-semibold rounded-lg"
            >
              Workspace
            </Link>
          ) : (
            <Link
              href="/login?mode=signup"
              className="py-1.5 px-2.5 bg-[#181a19] text-[#f8f7f4] text-[11px] font-semibold rounded-lg shrink-0"
            >
              Start Free
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            className="p-2 rounded-lg text-[#181a19] hover:bg-[#f0ede6] transition-colors focus:outline-none shrink-0"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-down Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[53px] z-30 bg-[#f8f7f4] border-b border-[#e2ded6] shadow-xl p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-3 font-semibold text-sm text-[#181a19]">
            <a
              href="#property-intelligence"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-[#f0ede6] rounded-lg transition-colors"
            >
              Property Details
            </a>
            <a
              href="#matching"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-[#f0ede6] rounded-lg transition-colors"
            >
              Buyer Matching
            </a>
            <a
              href="#site-visits"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-[#f0ede6] rounded-lg transition-colors"
            >
              Site Visits
            </a>
            <a
              href="#leadership"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-[#f0ede6] rounded-lg transition-colors"
            >
              For Leadership
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-[#f0ede6] rounded-lg transition-colors"
            >
              Pricing
            </a>
          </nav>

          <div className="pt-3 border-t border-[#e2ded6] space-y-2">
            {mounted && user ? (
              <Link
                href={getDashboardHref()}
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full py-2.5 text-center text-xs font-bold text-[#f8f7f4] bg-[#181a19] rounded-xl shadow-xs"
              >
                Open Workspace
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full py-2.5 text-center text-xs font-bold text-[#181a19] bg-[#ffffff] border border-[#e2ded6] rounded-xl"
                >
                  Sign In
                </Link>
                <Link
                  href="/login?mode=signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full py-2.5 text-center text-xs font-bold text-[#f8f7f4] bg-[#181a19] rounded-xl shadow-xs"
                >
                  Start 14-Day Free Trial
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          SECTION 1: HERO (Human & Grounded)
          ═══════════════════════════════════════════════════════ */}
      <section className="pt-8 pb-12 sm:pt-16 sm:pb-20 md:pt-20 md:pb-24 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto w-full min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-center min-w-0">
          {/* Left Column: Authoritative Statement (6 Cols) */}
          <div className="lg:col-span-6 min-w-0 space-y-4 sm:space-y-6 text-left">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#181a19] leading-[1.18] break-words">
              Built for the way luxury real estate is actually sold.
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-[#4a4d4b] leading-relaxed max-w-xl">
              One workspace for your buyers, properties, owners, and follow-ups — giving your sales team the context to close high-ticket deals.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1">
              <Link
                href="/login?mode=signup"
                className="py-3 px-5 sm:px-6 bg-[#181a19] hover:bg-[#2d302e] text-[#f8f7f4] font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 min-h-[44px]"
              >
                <span>Start 14-Day Free Trial</span>
                <ArrowRight className="h-4 w-4 text-[#a68138]" />
              </Link>
              <a
                href="#property-intelligence"
                className="py-3 px-5 sm:px-6 bg-transparent hover:bg-[#f0ede6] text-[#181a19] font-semibold text-xs sm:text-sm rounded-xl border border-[#e2ded6] transition-all flex items-center justify-center min-h-[44px]"
              >
                See Property Details
              </a>
            </div>

            {/* Credibility Note */}
            <div className="pt-1 text-[11px] sm:text-xs text-[#7a7d7b] flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span>✓ 14-day free trial</span>
              <span>✓ No credit card required</span>
              <span>✓ Built for Gurgaon, Mumbai &amp; Bangalore desks</span>
            </div>
          </div>

          {/* Right Column: Facade Visual + Live Context (6 Cols) */}
          <div className="lg:col-span-6 min-w-0">
            <HeroEditorialVisual />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2: RELATIONSHIP OVERVIEW
          ═══════════════════════════════════════════════════════ */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 border-y border-[#e2ded6] bg-[#f0ede6]/60 min-w-0">
        <div className="max-w-6xl mx-auto min-w-0">
          <RealEstateRelationshipDiagram />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3: PROPERTY DETAILS (Flat 360°)
          ═══════════════════════════════════════════════════════ */}
      <section id="property-intelligence" className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto w-full space-y-6 sm:space-y-10 min-w-0">
        <div className="text-left max-w-2xl space-y-2 min-w-0">
          <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#181a19] tracking-tight">
            Know the property before you call.
          </h2>
          <p className="text-xs sm:text-sm text-[#4a4d4b] leading-relaxed">
            Floor plans, owner history, gate rules, and matching buyers in one place.
          </p>
        </div>

        {/* Cinematic Property Frame with Penthouse Interior Photo */}
        <div className="rounded-2xl border border-[#e2ded6] bg-[#ffffff] shadow-sm overflow-hidden text-left min-w-0">
          {/* Top Real Estate Photography Hero Banner */}
          <div className="relative w-full h-[200px] sm:h-[280px] md:h-[340px] bg-[#181a19]">
            <Image
              src="/images/penthouse-interior.jpg"
              alt="DLF The Camellias Living Pavilion"
              fill
              sizes="(max-width: 1024px) 100vw, 1200px"
              className="object-cover object-center brightness-[0.97]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#181a19]/90 via-[#181a19]/30 to-transparent" />

            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2 text-[#f8f7f4]">
              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <h3 className="text-base sm:text-xl md:text-2xl font-bold text-white truncate">
                  DLF The Camellias · Tower A · Unit A-1402
                </h3>
                <p className="text-[11px] sm:text-xs text-white/80">
                  Sector 42, Golf Course Road · 14th Floor · North-East Facing
                </p>
              </div>

              <div className="text-left sm:text-right font-mono shrink-0">
                <span className="text-lg sm:text-2xl font-bold text-white">₹16.50 Cr</span>
                <span className="text-[10px] sm:text-xs text-white/70 block">₹39,285 / sq.ft</span>
              </div>
            </div>
          </div>

          {/* Dossier Navigation Tabs */}
          <div className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 border-b border-[#e2ded6] pb-3">
              {[
                { id: "specs", label: "Floor Plan & Specs" },
                { id: "ownership", label: "Owner & Lease" },
                { id: "gate", label: "Gate & Parking" },
                { id: "demand", label: "Matching Buyers" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all min-h-[38px] ${
                    activeTab === tab.id
                      ? "bg-[#181a19] text-[#f8f7f4] shadow-xs"
                      : "bg-[#f8f7f4] text-[#4a4d4b] hover:text-[#181a19] border border-[#e2ded6]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Specs & Floorplan */}
            {activeTab === "specs" && (
              <div className="space-y-4 animate-in fade-in-50 min-w-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs min-w-0">
                  <div className="p-3 bg-[#f8f7f4] rounded-xl border border-[#e2ded6] min-w-0">
                    <span className="text-[11px] text-[#7a7d7b] block">Super Area</span>
                    <p className="font-bold text-[#181a19] text-xs sm:text-sm mt-0.5">4,200 sq.ft</p>
                  </div>
                  <div className="p-3 bg-[#f8f7f4] rounded-xl border border-[#e2ded6] min-w-0">
                    <span className="text-[11px] text-[#7a7d7b] block">Carpet Area</span>
                    <p className="font-bold text-[#181a19] text-xs sm:text-sm mt-0.5">3,450 sq.ft</p>
                  </div>
                  <div className="p-3 bg-[#f8f7f4] rounded-xl border border-[#e2ded6] min-w-0">
                    <span className="text-[11px] text-[#7a7d7b] block">Configuration</span>
                    <p className="font-bold text-[#181a19] text-xs sm:text-sm mt-0.5">4 BHK + Staff Room</p>
                  </div>
                  <div className="p-3 bg-[#f8f7f4] rounded-xl border border-[#e2ded6] min-w-0">
                    <span className="text-[11px] text-[#7a7d7b] block">Parking</span>
                    <p className="font-bold text-[#181a19] text-xs sm:text-sm mt-0.5">3 Bays (Bay B2-14)</p>
                  </div>
                </div>

                <ArchitecturalFloorplanVector />
              </div>
            )}

            {/* Tab 2: Ownership */}
            {activeTab === "ownership" && (
              <div className="space-y-4 animate-in fade-in-50 text-xs min-w-0">
                <div className="p-4 rounded-xl bg-[#f8f7f4] border border-[#e2ded6] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#181a19]">Owner Details</span>
                    <span className="text-xs text-[#7a7d7b]">Purchased March 2022</span>
                  </div>
                  <p className="text-sm font-bold text-[#181a19]">Rajesh Sharma</p>
                  <p className="text-xs text-[#4a4d4b] leading-relaxed">
                    Purchased directly from developer. Tenancy agreement currently active through 14 October 2026.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: Gate Rules */}
            {activeTab === "gate" && (
              <div className="p-4 sm:p-5 rounded-xl bg-[#edf4f1] border border-[#b8d6cb] space-y-2 text-xs text-[#224a3e] animate-in fade-in-50 min-w-0">
                <p className="font-bold text-xs sm:text-sm">Gate 2 Access &amp; Parking</p>
                <p className="text-xs text-[#224a3e] leading-relaxed">
                  Gate 2 Visitor PIN: <strong>#8492</strong> · Escort client through Tower A private lift lobby · Reserved Visitor Parking: <strong>Bay B2-14</strong>.
                </p>
              </div>
            )}

            {/* Tab 4: Buyer Demand */}
            {activeTab === "demand" && (
              <div className="space-y-3 text-xs animate-in fade-in-50 min-w-0">
                {[
                  { name: "Siddharth Verma", budget: "₹17.00 Cr", score: "96 / 100", req: "4 BHK · North-East facing · High Floor" },
                  { name: "Vikramaditya Oberoi", budget: "₹16.50 Cr", score: "92 / 100", req: "4 BHK + Staff · Token Ready" },
                ].map((buyer, i) => (
                  <div key={i} className="p-3.5 bg-[#f8f7f4] rounded-xl border border-[#e2ded6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[#181a19]">{buyer.name}</span>
                        <span className="font-bold text-[#181a19] font-mono">{buyer.budget}</span>
                        <span className="text-[11px] font-semibold text-[#224a3e] bg-[#edf4f1] px-2 py-0.5 rounded border border-[#b8d6cb]">
                          {buyer.score} Match
                        </span>
                      </div>
                      <p className="text-[11px] text-[#7a7d7b] mt-0.5">{buyer.req}</p>
                    </div>
                    <button className="py-2 px-3 bg-[#181a19] text-[#f8f7f4] text-xs font-semibold rounded-lg flex items-center justify-center gap-1 shrink-0 min-h-[38px]">
                      <span>Send property</span>
                      <ArrowRight className="h-3 w-3 text-[#a68138]" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4: BUYER MATCHING
          ═══════════════════════════════════════════════════════ */}
      <section id="matching" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 border-t border-[#e2ded6] bg-[#f8f7f4] min-w-0">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-center min-w-0">
          {/* Left Column: Explanation */}
          <div className="lg:col-span-5 min-w-0 space-y-3 sm:space-y-4 text-left">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#181a19] tracking-tight">
              Find the right buyer for every property.
            </h2>
            <p className="text-xs sm:text-sm text-[#4a4d4b] leading-relaxed">
              When a new luxury mandate arrives, CallCRM checks your active buyers across five criteria:
            </p>

            <ul className="space-y-2 text-xs text-[#4a4d4b] pt-1">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#224a3e] shrink-0" /> <span><strong>Location:</strong> Exact society or micro-market</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#224a3e] shrink-0" /> <span><strong>Budget:</strong> Within buyer&apos;s price band</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#224a3e] shrink-0" /> <span><strong>Configuration:</strong> BHK and staff room</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#224a3e] shrink-0" /> <span><strong>Floor &amp; Facing:</strong> High-floor, park-facing, Vastu</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#224a3e] shrink-0" /> <span><strong>Direct Owner:</strong> Verified resale mandate</span>
              </li>
            </ul>
          </div>

          {/* Right Column: Live Match Demonstration Card */}
          <div className="lg:col-span-7 min-w-0">
            <div className="p-4 sm:p-6 rounded-2xl bg-[#ffffff] border border-[#e2ded6] shadow-sm space-y-4 text-left min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#e2ded6]">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-[#181a19]">Siddharth Verma ↔ Unit A-1402</p>
                  <p className="text-[11px] text-[#7a7d7b]">DLF The Camellias</p>
                </div>
                <span className="text-xs sm:text-sm font-bold text-[#224a3e] bg-[#edf4f1] px-2.5 py-1 rounded-md border border-[#b8d6cb] shrink-0">
                  96 / 100 Match
                </span>
              </div>

              <div className="space-y-1.5 sm:space-y-2 text-xs min-w-0">
                <div className="p-2 sm:p-2.5 bg-[#f8f7f4] rounded-lg border border-[#e2ded6] flex justify-between gap-2">
                  <span className="truncate">Location (DLF The Camellias)</span>
                  <span className="text-[#224a3e] font-semibold shrink-0">Match</span>
                </div>
                <div className="p-2 sm:p-2.5 bg-[#f8f7f4] rounded-lg border border-[#e2ded6] flex justify-between gap-2">
                  <span className="truncate">Budget (₹17.0 Cr vs ₹16.5 Cr Asking)</span>
                  <span className="text-[#224a3e] font-semibold shrink-0">Match</span>
                </div>
                <div className="p-2 sm:p-2.5 bg-[#f8f7f4] rounded-lg border border-[#e2ded6] flex justify-between gap-2">
                  <span className="truncate">Configuration (4 BHK + Staff Room)</span>
                  <span className="text-[#224a3e] font-semibold shrink-0">Match</span>
                </div>
                <div className="p-2 sm:p-2.5 bg-[#f8f7f4] rounded-lg border border-[#e2ded6] flex justify-between gap-2">
                  <span className="truncate">Floor &amp; Facing (Floor 14, Park Facing)</span>
                  <span className="text-[#224a3e] font-semibold shrink-0">Match</span>
                </div>
              </div>

              <button className="w-full py-3 bg-[#181a19] hover:bg-[#2d302e] text-[#f8f7f4] font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 min-h-[44px]">
                <span>Send property on WhatsApp</span>
                <ArrowRight className="h-3.5 w-3.5 text-[#a68138]" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5: SITE VISITS
          ═══════════════════════════════════════════════════════ */}
      <section id="site-visits" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 border-t border-[#e2ded6] bg-[#f0ede6]/50 min-w-0">
        <div className="max-w-6xl mx-auto space-y-6 min-w-0">
          <PhysicalSiteVisitShowcase />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6: HUMAN + AI (Simple & Restrained)
          ═══════════════════════════════════════════════════════ */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto w-full space-y-6 sm:space-y-8 text-left min-w-0">
        <div className="max-w-2xl space-y-2 min-w-0">
          <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#181a19] tracking-tight">
            Suggestions backed by evidence. Never automated without you.
          </h2>
          <p className="text-xs sm:text-sm text-[#4a4d4b]">
            CallCRM highlights potential seller opportunities and follow-up gaps, but your salespeople decide what action to take.
          </p>
        </div>

        {/* The Triad Card */}
        <div className="p-4 sm:p-6 md:p-8 rounded-2xl bg-[#ffffff] border border-[#e2ded6] shadow-sm space-y-4 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 text-xs min-w-0">
            {/* Fact */}
            <div className="p-4 rounded-xl bg-[#f8f7f4] border border-[#e2ded6] space-y-1 min-w-0">
              <span className="text-[11px] font-bold text-[#181a19] block">
                Fact
              </span>
              <p className="font-semibold text-[#181a19]">Lease on Unit A-1402 ends in 48 days</p>
              <p className="text-[#7a7d7b] leading-relaxed">
                Registered lease agreement on file.
              </p>
            </div>

            {/* Inference */}
            <div className="p-4 rounded-xl bg-[#faf5ec] border border-[#e8d5b0] space-y-1 min-w-0">
              <span className="text-[11px] font-bold text-[#a68138] block">
                Inference
              </span>
              <p className="font-semibold text-[#181a19]">Potential resale opportunity</p>
              <p className="text-[#4a4d4b] leading-relaxed">
                Owner has held the property for 4.4 years with no renewal filed.
              </p>
            </div>

            {/* Recommendation */}
            <div className="p-4 rounded-xl bg-[#edf4f1] border border-[#b8d6cb] space-y-1 min-w-0">
              <span className="text-[11px] font-bold text-[#224a3e] block">
                Recommendation
              </span>
              <p className="font-semibold text-[#181a19]">Call owner to verify plans</p>
              <p className="text-[#4a4d4b] leading-relaxed">
                Check whether Rajesh Sharma plans to renew lease or sell.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-[#f8f7f4] rounded-xl border border-[#e2ded6] text-xs text-[#4a4d4b]">
            <strong>Your team stays in control:</strong> Resale mandates are only created after a salesperson verifies the owner&apos;s intent.
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 7: LEADERSHIP & PIPELINE
          ═══════════════════════════════════════════════════════ */}
      <section id="leadership" className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 md:px-8 bg-[#181a19] text-[#f8f7f4] border-y border-black min-w-0">
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 min-w-0">
          <ExecutiveDarkCockpit />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 8: PRICING
          ═══════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto w-full space-y-8 sm:space-y-12 text-center min-w-0">
        <div className="space-y-2.5 max-w-2xl mx-auto min-w-0">
          <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#181a19] tracking-tight">
            Simple, transparent pricing.
          </h2>
          <p className="text-xs sm:text-sm text-[#4a4d4b]">
            14-day free trial with full feature access. No credit card required.
          </p>

          {/* Billing Switcher */}
          <div className="pt-2 sm:pt-3 flex items-center justify-center">
            <div className="bg-[#f0ede6] p-1 rounded-xl border border-[#e2ded6] flex items-center gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all min-h-[38px] ${
                  billingCycle === "monthly"
                    ? "bg-[#ffffff] text-[#181a19] shadow-xs border border-[#e2ded6] font-bold"
                    : "text-[#7a7d7b] hover:text-[#181a19]"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 min-h-[38px] ${
                  billingCycle === "yearly"
                    ? "bg-[#ffffff] text-[#181a19] shadow-xs border border-[#e2ded6] font-bold"
                    : "text-[#7a7d7b] hover:text-[#181a19]"
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[10px] font-semibold text-[#224a3e] bg-[#edf4f1] px-1.5 py-0.2 rounded border border-[#b8d6cb]">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch text-left min-w-0">
          {/* Solo Closer */}
          <div className="bg-[#ffffff] border border-[#e2ded6] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:border-[#a68138]/40 transition-all min-w-0">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base sm:text-lg font-bold text-[#181a19]">Solo Closer</h3>
                <span className="text-[11px] text-[#4a4d4b] bg-[#f8f7f4] px-2 py-0.5 rounded border border-[#e2ded6]">
                  1 Seat
                </span>
              </div>
              <p className="text-xs text-[#4a4d4b] mb-4">
                For independent luxury property advisors and solo desks.
              </p>
              <div className="mb-6 pb-4 border-b border-[#e2ded6]">
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-2xl sm:text-3xl font-bold text-[#181a19]">
                    ₹{billingCycle === "monthly" ? "1,999" : "1,599"}
                  </span>
                  <span className="text-xs text-[#7a7d7b]">/ month</span>
                </div>
                {billingCycle === "yearly" && (
                  <p className="text-[11px] text-[#224a3e] font-medium mt-1">
                    Billed ₹19,188/year (Save ₹4,800/yr)
                  </p>
                )}
              </div>

              <ul className="space-y-2.5 mb-6 text-xs text-[#4a4d4b]">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#224a3e] shrink-0" /> 1 dedicated closer seat
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#224a3e] shrink-0" /> Up to 300 active leads
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#224a3e] shrink-0" /> 1 master project catalog
                </li>
              </ul>
            </div>

            <Link
              href="/login?mode=signup"
              className="w-full py-3 px-4 bg-[#f8f7f4] hover:bg-[#f0ede6] text-[#181a19] font-semibold text-xs rounded-xl border border-[#e2ded6] transition-all text-center min-h-[44px] flex items-center justify-center"
            >
              Start 14-Day Free Trial
            </Link>
          </div>

          {/* Boutique Team */}
          <div className="bg-[#ffffff] border-2 border-[#181a19] rounded-2xl p-5 sm:p-6 shadow-lg relative flex flex-col justify-between min-w-0">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#181a19] text-[#f8f7f4] text-[10px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm whitespace-nowrap">
              Most Popular
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 mt-1">
                <h3 className="text-base sm:text-lg font-bold text-[#181a19]">Boutique Team</h3>
                <span className="text-[11px] bg-[#181a19] text-[#f8f7f4] px-2 py-0.5 rounded">
                  2–4 Closers
                </span>
              </div>
              <p className="text-xs text-[#4a4d4b] mb-4">
                For small-to-mid real estate agencies and advisory desks.
              </p>
              <div className="mb-6 pb-4 border-b border-[#e2ded6]">
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-2xl sm:text-3xl font-bold text-[#181a19]">
                    ₹{billingCycle === "monthly" ? "4,999" : "3,999"}
                  </span>
                  <span className="text-xs text-[#7a7d7b]">/ month</span>
                </div>
                {billingCycle === "yearly" && (
                  <p className="text-[11px] text-[#224a3e] font-medium mt-1">
                    Billed ₹47,988/year (Save ₹12,000/yr)
                  </p>
                )}
              </div>

              <ul className="space-y-2.5 mb-6 text-xs text-[#4a4d4b]">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#224a3e] shrink-0" /> 3 closer seats + 1 manager view
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#224a3e] shrink-0" /> Up to 2,500 leads &amp; property records
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#224a3e] shrink-0" /> 5 project catalogs &amp; inventory matrices
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#224a3e] shrink-0" /> Buyer matching &amp; site visit details
                </li>
              </ul>
            </div>

            <Link
              href="/login?mode=signup"
              className="w-full py-3 px-4 bg-[#181a19] text-[#f8f7f4] font-bold text-xs rounded-xl hover:bg-[#2d302e] transition-all text-center shadow-md flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <span>Start 14-Day Free Trial</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#a68138]" />
            </Link>
          </div>

          {/* Scale Desk */}
          <div className="bg-[#ffffff] border border-[#e2ded6] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:border-[#a68138]/40 transition-all min-w-0">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base sm:text-lg font-bold text-[#181a19]">Scale Desk</h3>
                <span className="text-[11px] text-[#4a4d4b] bg-[#f8f7f4] px-2 py-0.5 rounded border border-[#e2ded6]">
                  5–10 Closers
                </span>
              </div>
              <p className="text-xs text-[#4a4d4b] mb-4">
                For established brokerages managing multiple luxury mandates.
              </p>
              <div className="mb-6 pb-4 border-b border-[#e2ded6]">
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-2xl sm:text-3xl font-bold text-[#181a19]">
                    ₹{billingCycle === "monthly" ? "9,999" : "7,999"}
                  </span>
                  <span className="text-xs text-[#7a7d7b]">/ month</span>
                </div>
                {billingCycle === "yearly" && (
                  <p className="text-[11px] text-[#224a3e] font-medium mt-1">
                    Billed ₹95,988/year (Save ₹24,000/yr)
                  </p>
                )}
              </div>

              <ul className="space-y-2.5 mb-6 text-xs text-[#4a4d4b]">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#224a3e] shrink-0" /> Up to 10 closer seats &amp; managers
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#224a3e] shrink-0" /> Up to 10,000 active leads
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#224a3e] shrink-0" /> Unlimited projects &amp; inventory
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#224a3e] shrink-0" /> Multi-city branch partitioning
                </li>
              </ul>
            </div>

            <Link
              href="/login?mode=signup"
              className="w-full py-3 px-4 bg-[#f8f7f4] hover:bg-[#f0ede6] text-[#181a19] font-semibold text-xs rounded-xl border border-[#e2ded6] transition-all text-center min-h-[44px] flex items-center justify-center"
            >
              Start 14-Day Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 9: FAQ
          ═══════════════════════════════════════════════════════ */}
      <section id="faq" className="py-12 sm:py-16 px-4 sm:px-6 md:px-8 max-w-4xl mx-auto w-full space-y-6 sm:space-y-8 text-left min-w-0">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#181a19]">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-[#7a7d7b]">Everything you need to know about CallCRM and the 14-day trial.</p>
        </div>

        <div className="space-y-2.5 sm:space-y-3">
          {[
            {
              q: "Can I import leads from property portals and spreadsheets?",
              a: "Yes. CallCRM provides standard CSV and Excel import templates that automatically map buyer name, phone, budget, and configuration preferences directly into your priority calling queue in under 30 seconds.",
            },
            {
              q: "How does the buyer-to-unit matching work?",
              a: "When you record a lead's requirements (e.g. 4 BHK, high floor, park facing, budget ₹16 Cr), CallCRM automatically evaluates your inventory matrices across location, budget, configuration, floor band, and mandate exclusivity, allowing reps to pitch suitable units instantly on the phone.",
            },
            {
              q: "Can sales closers see each other's leads?",
              a: "No. CallCRM is built with strict role-based data partitioning. Salespersons only see their own assigned leads, while Sales Managers and Founders have full organizational visibility across regional desks.",
            },
            {
              q: "What happens after the 14-day free trial?",
              a: "You get 100% full feature access during the trial. No credit card is required to sign up. At the end of 14 days, you can choose to activate your plan via UPI/Card, or your workspace gracefully pauses with zero surprise charges.",
            },
            {
              q: "Can I add more closer seats as my brokerage grows?",
              a: "Yes. You can start on the Solo or Boutique plan and add additional sales closer seats or upgrade anytime with prorated billing.",
            },
          ].map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-[#ffffff] border border-[#e2ded6] rounded-xl p-4 transition-all min-w-0"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left font-bold text-xs sm:text-sm text-[#181a19] focus:outline-none min-h-[36px]"
                >
                  <span className="pr-2">{faq.q}</span>
                  <span className="text-[#a68138] text-xs font-mono font-bold shrink-0 ml-2">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <p className="text-xs text-[#4a4d4b] mt-3 pt-3 border-t border-[#e2ded6] leading-relaxed animate-in fade-in-50">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* FINAL BOTTOM CTA BANNER */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 bg-[#f0ede6]/60 border-t border-[#e2ded6] text-center min-w-0">
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 min-w-0">
          <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#181a19] tracking-tight">
            Built for the way real estate is actually sold.
          </h2>
          <p className="text-xs sm:text-sm text-[#4a4d4b] max-w-xl mx-auto">
            Give your sales team the property context, follow-up discipline, and speed to close high-ticket deals. Set up your workspace in 2 minutes.
          </p>
          <div className="flex items-center justify-center gap-3 pt-1">
            <Link
              href="/login?mode=signup"
              className="py-3.5 px-6 sm:px-8 bg-[#181a19] text-[#f8f7f4] font-bold text-xs sm:text-sm rounded-xl hover:bg-[#2d302e] transition-all flex items-center gap-2 shadow-md min-h-[44px]"
            >
              <span>Start 14-Day Free Trial</span>
              <ArrowRight className="h-4 w-4 text-[#a68138]" />
            </Link>
          </div>
        </div>
      </section>

      {/* ARCHITECTURAL FOOTER */}
      <footer className="w-full bg-[#ffffff] border-t border-[#e2ded6] py-8 sm:py-12 px-4 sm:px-6 md:px-8 min-w-0">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8 text-xs text-left min-w-0">
          <div className="space-y-2 sm:space-y-3 col-span-2 sm:col-span-1 min-w-0">
            <div className="flex items-center gap-2 font-bold text-sm text-[#181a19]">
              <Building2 className="h-4 w-4 text-[#a68138]" />
              <span>Apex CallCRM</span>
            </div>
            <p className="text-[#7a7d7b] text-[11px] leading-relaxed">
              Sales operating system engineered for Indian luxury real estate brokerages and advisory desks.
            </p>
          </div>

          <div className="space-y-2 min-w-0">
            <h5 className="font-bold text-[#181a19]">Product</h5>
            <ul className="space-y-1.5 text-[#7a7d7b] text-[11px]">
              <li><a href="#property-intelligence" className="hover:text-[#181a19]">Property Details</a></li>
              <li><a href="#matching" className="hover:text-[#181a19]">Buyer Matching</a></li>
              <li><a href="#site-visits" className="hover:text-[#181a19]">Site Visits</a></li>
              <li><a href="#pricing" className="hover:text-[#181a19]">Pricing Plans</a></li>
            </ul>
          </div>

          <div className="space-y-2 min-w-0">
            <h5 className="font-bold text-[#181a19]">Supported Markets</h5>
            <ul className="space-y-1.5 text-[#7a7d7b] text-[11px]">
              <li>Gurgaon &amp; Golf Course Ext.</li>
              <li>South Delhi &amp; Lutyens</li>
              <li>Mumbai MMR &amp; Worli</li>
              <li>Bangalore North &amp; East</li>
            </ul>
          </div>

          <div className="space-y-2 min-w-0">
            <h5 className="font-bold text-[#181a19]">Privacy &amp; Security</h5>
            <ul className="space-y-1.5 text-[#7a7d7b] text-[11px]">
              <li>Role-Based Lead Privacy</li>
              <li>Encrypted Session Tokens</li>
              <li>Client Confidentiality Walls</li>
              <li>Dedicated Tenant DB Rules</li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-5 sm:pt-6 border-t border-[#e2ded6] flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 text-[10px] sm:text-[11px] text-[#7a7d7b] font-mono text-center sm:text-left min-w-0">
          <p>© 2026 Apex Realty Technologies. All rights reserved.</p>
          <p>ENGINEERED FOR REAL ESTATE SALES TEAMS</p>
        </div>
      </footer>
    </div>
  );
}
