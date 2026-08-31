"use client";

import * as React from "react";
import Image from "next/image";
import {
  Building2,
  ShieldCheck,
  MapPin,
  ArrowRight,
  User,
  Users,
  Compass,
  Phone,
  MessageSquare,
  Sparkles,
  Check,
  AlertTriangle,
  Clock,
  Layers,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   1. HERO EDITORIAL VISUAL — Grounded Real Estate Presence
   ═══════════════════════════════════════════════════════ */

export function HeroEditorialVisual({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-full max-w-full min-w-0 select-none space-y-3 sm:space-y-0 ${className}`}>
      {/* High-Resolution Architectural Facade Frame */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-[#e2ded6] shadow-sm bg-[#181a19] aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/11]">
        <Image
          src="/images/hero-facade.jpg"
          alt="DLF The Camellias Golf Course Road Gurgaon"
          fill
          priority
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
          className="object-cover object-center brightness-[0.98] transition-transform duration-700 hover:scale-[1.02]"
        />

        {/* Ambient Tone Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#181a19]/80 via-transparent to-black/20" />

        {/* Location Tag */}
        <div className="absolute top-3 left-3 sm:top-5 sm:left-5 z-10 px-3 py-1.5 rounded-lg bg-[#181a19]/90 backdrop-blur-md border border-white/15 text-[#f8f7f4] text-xs font-medium flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#a68138]" />
          <span className="truncate">DLF The Camellias, Gurgaon</span>
        </div>

        {/* Desktop/Tablet Floating Card */}
        <div className="hidden sm:block absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-auto z-10 p-4 rounded-xl bg-[#ffffff]/95 backdrop-blur-md border border-[#e2ded6] shadow-lg text-[#181a19] space-y-2.5 max-w-[340px]">
          <div className="flex items-center justify-between gap-3 border-b border-[#e2ded6] pb-2 text-xs">
            <span className="font-semibold text-[#181a19]">Tower A · Unit A-1402</span>
            <span className="text-[#224a3e] font-semibold text-[11px] bg-[#edf4f1] px-2 py-0.5 rounded border border-[#b8d6cb]">
              Resale
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-[#181a19]">4 BHK · 4,200 sq.ft</p>
              <p className="text-[11px] text-[#7a7d7b]">Floor 14 · Park &amp; Golf View</p>
            </div>
            <p className="text-base font-bold text-[#181a19] shrink-0 font-mono">₹16.50 Cr</p>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] text-[#7a7d7b] pt-2 border-t border-[#e2ded6]">
            <span>Owner: Rajesh Sharma</span>
            <span className="text-[#224a3e] font-semibold shrink-0">96 / 100 Match</span>
          </div>
        </div>
      </div>

      {/* Mobile Dedicated Context Card */}
      <div className="sm:hidden p-4 rounded-xl bg-[#ffffff] border border-[#e2ded6] shadow-xs text-[#181a19] space-y-2 text-left min-w-0 w-full">
        <div className="flex items-center justify-between gap-2 border-b border-[#e2ded6] pb-1.5 text-xs">
          <span className="font-semibold text-[#181a19]">Tower A · Unit A-1402</span>
          <span className="text-[#224a3e] font-semibold text-[10px] bg-[#edf4f1] px-2 py-0.5 rounded border border-[#b8d6cb]">
            Resale
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-[#181a19]">4 BHK · 4,200 sq.ft</p>
            <p className="text-[11px] text-[#7a7d7b]">Floor 14 · Park View</p>
          </div>
          <p className="text-sm font-bold text-[#181a19] shrink-0 font-mono">₹16.50 Cr</p>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#7a7d7b] pt-1.5 border-t border-[#e2ded6]">
          <span>Owner: Rajesh Sharma</span>
          <span className="text-[#224a3e] font-semibold">96 / 100 Match</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   2. REAL ESTATE RELATIONSHIP DIAGRAM (Human Nexus)
   ═══════════════════════════════════════════════════════ */

export function RealEstateRelationshipDiagram({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full max-w-full min-w-0 rounded-2xl border border-[#e2ded6] bg-[#ffffff] p-4 sm:p-8 md:p-10 shadow-xs space-y-6 sm:space-y-8 ${className}`}>
      <div className="max-w-2xl mx-auto text-center space-y-2">
        <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#181a19] tracking-tight">
          In luxury real estate, deals depend on context.
        </h3>
        <p className="text-xs sm:text-sm text-[#4a4d4b] leading-relaxed">
          A transaction isn&apos;t just a contact card. It connects the buyer, the property, the owner, the society, and the salesperson in one place.
        </p>
      </div>

      {/* Visual Relationship Grid */}
      <div className="relative max-w-4xl mx-auto p-3.5 sm:p-6 md:p-8 rounded-2xl bg-[#f8f7f4] border border-[#e2ded6] min-w-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-6 items-stretch min-w-0">
          {/* Node 1: Buyer */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#ffffff] border border-[#e2ded6] shadow-xs flex flex-col justify-between space-y-3 text-left min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#224a3e]">
                Buyer
              </span>
              <Users className="h-4 w-4 text-[#224a3e]" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-[#181a19]">Siddharth Verma</p>
              <p className="text-xs text-[#4a4d4b] leading-relaxed">
                Budget: <strong>₹17 Cr</strong> · Looking for 4 BHK, North-East facing, high floor
              </p>
            </div>
          </div>

          {/* Center Hub: The Property */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#181a19] text-[#f8f7f4] border-2 border-[#a68138] shadow-md flex flex-col justify-between space-y-3 text-center min-w-0">
            <span className="text-[11px] text-[#a68138] font-semibold uppercase tracking-wider">
              The Property
            </span>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-[#f8f7f4]">
                Unit A-1402 · The Camellias
              </h4>
              <p className="text-xs text-[#e2ded6] mt-0.5">
                ₹16.50 Cr · 4 BHK (4,200 sq.ft)
              </p>
            </div>
            <div className="pt-2 border-t border-white/15 text-xs text-[#a68138] font-semibold">
              96 / 100 Buyer Match
            </div>
          </div>

          {/* Node 2: Owner */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#ffffff] border border-[#e2ded6] shadow-xs flex flex-col justify-between space-y-3 text-left min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#a68138]">
                Owner
              </span>
              <User className="h-4 w-4 text-[#a68138]" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-[#181a19]">Rajesh Sharma</p>
              <p className="text-xs text-[#4a4d4b] leading-relaxed">
                Lease ends in 48 days · Asking floor: <strong>₹16.0 Cr net</strong> · Direct mandate
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Sub-Nodes: Security Gate & Salesperson Execution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-[#e2ded6] min-w-0">
          <div className="p-3.5 rounded-xl bg-[#ffffff] border border-[#e2ded6] flex items-start gap-3 text-left min-w-0">
            <ShieldCheck className="h-4 w-4 text-[#224a3e] shrink-0 mt-0.5" />
            <div className="space-y-0.5 min-w-0">
              <p className="text-xs font-bold text-[#181a19]">Visit Details</p>
              <p className="text-xs text-[#4a4d4b]">Gate 2 Pass PIN #8492 · Visitor Parking Bay B2-14</p>
              <p className="text-[11px] text-[#7a7d7b]">Gate pass and parking ready before you arrive with the client.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#ffffff] border border-[#e2ded6] flex items-start gap-3 text-left min-w-0">
            <Phone className="h-4 w-4 text-[#a68138] shrink-0 mt-0.5" />
            <div className="space-y-0.5 min-w-0">
              <p className="text-xs font-bold text-[#181a19]">Next Action</p>
              <p className="text-xs text-[#4a4d4b]">1-click WhatsApp · Log follow-up in seconds</p>
              <p className="text-[11px] text-[#7a7d7b]">Every note and price discussion stays with the property.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   3. ARCHITECTURAL FLOOR PLAN (Clean CAD Vector)
   ═══════════════════════════════════════════════════════ */

export function ArchitecturalFloorplanVector({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-full max-w-full min-w-0 bg-[#f8f7f4] rounded-2xl border border-[#e2ded6] p-3 sm:p-5 md:p-6 overflow-hidden ${className}`}>
      {/* Top Header Information */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#e2ded6] text-left">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#181a19]">4 BHK Layout · 4,200 sq.ft</span>
        </div>
        <div className="text-xs text-[#7a7d7b]">
          <span className="text-[#224a3e] font-medium">● North-East Facing · Park View</span>
        </div>
      </div>

      {/* SVG Container */}
      <div className="w-full max-w-full overflow-x-auto min-w-0">
        <div className="min-w-[500px] md:min-w-0">
          <svg viewBox="0 0 800 460" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto select-none">
            <defs>
              <pattern id="marbleHatch2" width="8" height="8" patternUnits="userSpaceOnUse">
                <line x1="0" y1="8" x2="8" y2="0" stroke="#e2ded6" strokeWidth="0.5" strokeOpacity="0.8" />
              </pattern>
              <pattern id="woodDeck2" width="6" height="6" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="6" y2="0" stroke="#a68138" strokeWidth="0.5" strokeOpacity="0.4" />
              </pattern>
            </defs>

            {/* Outer Walls */}
            <rect x="40" y="30" width="720" height="400" fill="#ffffff" stroke="#181a19" strokeWidth="2.5" rx="4" />

            {/* Living & Dining */}
            <rect x="250" y="30" width="310" height="240" fill="url(#marbleHatch2)" stroke="#181a19" strokeWidth="1.5" />
            <text x="405" y="140" textAnchor="middle" fontFamily="sans-serif" fontSize="13" fill="#181a19" fontWeight="bold">Grand Living &amp; Dining Pavilion</text>
            <text x="405" y="160" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fill="#7a7d7b">32&apos;-0&quot; x 24&apos;-6&quot; • Double Height Ceiling</text>

            {/* Sky Deck */}
            <rect x="250" y="30" width="310" height="50" fill="url(#woodDeck2)" stroke="#a68138" strokeWidth="1.5" />
            <text x="405" y="60" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fill="#a68138" fontWeight="600">Sunset Deck · 310 sq.ft (Park Facing)</text>

            {/* Master Suite */}
            <rect x="560" y="30" width="200" height="190" fill="#ffffff" stroke="#181a19" strokeWidth="1.5" />
            <text x="660" y="110" textAnchor="middle" fontFamily="sans-serif" fontSize="12" fill="#181a19" fontWeight="bold">Master Bedroom</text>
            <text x="660" y="128" textAnchor="middle" fontFamily="sans-serif" fontSize="9.5" fill="#7a7d7b">20&apos;-0&quot; x 16&apos;-0&quot;</text>
            <rect x="560" y="160" width="200" height="60" fill="#f8f7f4" stroke="#e2ded6" strokeWidth="1" />
            <text x="660" y="195" textAnchor="middle" fontFamily="sans-serif" fontSize="9" fill="#4a4d4b">Walk-In Wardrobe &amp; Bath</text>

            {/* Suite II */}
            <rect x="560" y="220" width="200" height="210" fill="#ffffff" stroke="#181a19" strokeWidth="1.5" />
            <text x="660" y="315" textAnchor="middle" fontFamily="sans-serif" fontSize="12" fill="#181a19" fontWeight="bold">Guest Bedroom</text>
            <text x="660" y="333" textAnchor="middle" fontFamily="sans-serif" fontSize="9.5" fill="#7a7d7b">16&apos;-0&quot; x 15&apos;-0&quot; • Attached Bath</text>

            {/* Suite III */}
            <rect x="40" y="30" width="210" height="190" fill="#ffffff" stroke="#181a19" strokeWidth="1.5" />
            <text x="145" y="115" textAnchor="middle" fontFamily="sans-serif" fontSize="12" fill="#181a19" fontWeight="bold">Bedroom 3</text>
            <text x="145" y="133" textAnchor="middle" fontFamily="sans-serif" fontSize="9.5" fill="#7a7d7b">17&apos;-0&quot; x 14&apos;-6&quot;</text>

            {/* Suite IV */}
            <rect x="40" y="220" width="210" height="130" fill="#ffffff" stroke="#181a19" strokeWidth="1.5" />
            <text x="145" y="280" textAnchor="middle" fontFamily="sans-serif" fontSize="12" fill="#181a19" fontWeight="bold">Study / Bedroom 4</text>
            <text x="145" y="298" textAnchor="middle" fontFamily="sans-serif" fontSize="9.5" fill="#7a7d7b">14&apos;-0&quot; x 12&apos;-6&quot;</text>

            {/* Kitchen */}
            <rect x="250" y="270" width="160" height="160" fill="#f8fafc" stroke="#181a19" strokeWidth="1.5" />
            <text x="330" y="345" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#181a19" fontWeight="bold">Kitchen</text>
            <text x="330" y="363" textAnchor="middle" fontFamily="sans-serif" fontSize="9" fill="#7a7d7b">Island Counter &amp; Pantry</text>

            {/* Lift Lobby */}
            <rect x="410" y="270" width="150" height="90" fill="#181a19" stroke="#181a19" strokeWidth="1.5" />
            <text x="485" y="315" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fill="#ffffff" fontWeight="bold">Private Lift Lobby</text>
            <text x="485" y="330" textAnchor="middle" fontFamily="sans-serif" fontSize="8.5" fill="#a68138">Direct Elevator Access</text>

            {/* Servant Suite */}
            <rect x="410" y="360" width="150" height="70" fill="#f0ede6" stroke="#e2ded6" strokeWidth="1" />
            <text x="485" y="395" textAnchor="middle" fontFamily="sans-serif" fontSize="9" fill="#4a4d4b" fontWeight="600">Staff Room + Bath</text>
            <text x="485" y="410" textAnchor="middle" fontFamily="sans-serif" fontSize="8" fill="#7a7d7b">Service Lift Access</text>

            {/* Vastu Compass */}
            <g transform="translate(60, 45)">
              <circle cx="20" cy="20" r="16" fill="#ffffff" stroke="#a68138" strokeWidth="1.5" />
              <path d="M 20 6 L 24 20 L 20 17 L 16 20 Z" fill="#a68138" />
              <path d="M 20 34 L 24 20 L 20 23 L 16 20 Z" fill="#7a7d7b" />
              <text x="20" y="4" textAnchor="middle" fontFamily="sans-serif" fontSize="8" fill="#a68138" fontWeight="bold">N</text>
              <text x="35" y="14" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fill="#224a3e" fontWeight="bold">NE</text>
            </g>
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2.5 pt-2.5 border-t border-[#e2ded6] flex flex-wrap items-center justify-between gap-2 text-xs text-[#7a7d7b]">
        <span>Unit A-1402 · Tower A</span>
        <span>Super Area: 4,200 sq.ft · Carpet Area: 3,450 sq.ft</span>
        <span className="text-[#181a19] font-medium">Exclusive Resale Mandate</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   4. PHYSICAL SITE VISIT SHOWCASE
   ═══════════════════════════════════════════════════════ */

export function PhysicalSiteVisitShowcase({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full max-w-full min-w-0 rounded-2xl border border-[#e2ded6] bg-[#ffffff] overflow-hidden shadow-sm ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-w-0">
        {/* Left 6 Cols: Entrance Photography */}
        <div className="lg:col-span-6 min-w-0 relative min-h-[240px] sm:min-h-[280px] md:min-h-[340px] bg-[#181a19]">
          <Image
            src="/images/arrival-gate.jpg"
            alt="DLF The Camellias Gate 2 Security Entrance"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-center brightness-[0.95]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#181a19]/80 via-transparent to-black/20" />
          <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-10 px-3 py-1.5 rounded-lg bg-[#181a19]/90 backdrop-blur-md border border-white/15 text-[#f8f7f4] text-xs font-medium">
            Gate 2 Arrival · The Camellias
          </div>
        </div>

        {/* Right 6 Cols: Operational Briefing */}
        <div className="lg:col-span-6 min-w-0 p-5 sm:p-6 md:p-8 space-y-4 flex flex-col justify-between text-left bg-[#ffffff]">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-semibold text-[#224a3e]">
                Today · 4:00 PM Site Visit
              </span>
              <span className="text-xs text-[#a68138] font-medium">Client: Siddharth Verma</span>
            </div>
            <h4 className="text-base sm:text-lg font-bold text-[#181a19]">
              Know what matters before you arrive.
            </h4>
            <p className="text-xs text-[#4a4d4b] leading-relaxed">
              Gate pass, visitor parking, and owner expectations — ready before you enter the property.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-xs">
            <div className="p-2.5 sm:p-3 bg-[#f8f7f4] rounded-xl border border-[#e2ded6] space-y-0.5">
              <span className="text-[11px] text-[#7a7d7b] block">Gate Pass</span>
              <p className="text-xs sm:text-sm font-bold font-mono text-[#181a19]">PIN #8492</p>
              <p className="text-[10px] text-[#7a7d7b]">Show at Gate 2 security</p>
            </div>

            <div className="p-2.5 sm:p-3 bg-[#f8f7f4] rounded-xl border border-[#e2ded6] space-y-0.5">
              <span className="text-[11px] text-[#7a7d7b] block">Reserved Parking</span>
              <p className="text-xs sm:text-sm font-bold font-mono text-[#181a19]">Bay B2-14</p>
              <p className="text-[10px] text-[#7a7d7b]">Tower A basement stall</p>
            </div>
          </div>

          <div className="p-2.5 sm:p-3 bg-[#edf4f1] rounded-xl border border-[#b8d6cb] text-xs text-[#224a3e] space-y-0.5 sm:space-y-1">
            <p className="font-semibold text-xs">Owner Price Floor:</p>
            <p className="text-[11px] leading-relaxed">
              Asking floor is strictly <strong>₹16.0 Cr net</strong>. No interior customization discount.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   5. EXECUTIVE DARK COCKPIT (Leadership Overview)
   ═══════════════════════════════════════════════════════ */

export function ExecutiveDarkCockpit({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full max-w-full min-w-0 rounded-2xl sm:rounded-3xl bg-[#181a19] text-[#f8f7f4] p-5 sm:p-8 md:p-10 border border-white/10 shadow-2xl space-y-6 sm:space-y-8 select-none ${className}`}>
      {/* Top Header & Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border-b border-white/10 pb-4 sm:pb-6 text-left">
        <div className="space-y-1 min-w-0">
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight">
            Real-time pipeline and revenue visibility
          </h3>
          <p className="text-xs text-white/70">
            Track deal velocity, overdue follow-ups, and active mandates across all salespeople.
          </p>
        </div>

        <div className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono self-start md:self-auto shrink-0">
          <span className="text-[#a68138] font-bold">Active Pipeline:</span> <span className="text-white font-bold">₹48.50 Cr</span>
        </div>
      </div>

      {/* Narrative Synthesis */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-[#224a3e]/30 border border-[#224a3e] text-xs text-[#b8d6cb] flex items-start gap-2.5 text-left min-w-0">
        <Sparkles className="h-4 w-4 shrink-0 text-[#a68138] mt-0.5" />
        <p className="leading-relaxed text-xs">
          <strong className="text-white font-semibold">Today&apos;s Focus:</strong> Total active pipeline is <strong>₹48.5 Cr</strong>. 2 deals in Negotiation have had no touchpoint in over 5 days.
        </p>
      </div>

      {/* 4 Master KPI Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs text-left min-w-0">
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 space-y-1 min-w-0">
          <span className="text-[11px] text-white/50">Active Pipeline</span>
          <p className="text-base sm:text-xl font-bold text-white font-mono truncate">₹48.50 Cr</p>
          <p className="text-[10px] text-[#b8d6cb]">12 active deals</p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 space-y-1 min-w-0">
          <span className="text-[11px] text-white/50">Closed This Month</span>
          <p className="text-base sm:text-xl font-bold text-[#b8d6cb] font-mono truncate">₹18.40 Cr</p>
          <p className="text-[10px] text-white/50">2 completed deals</p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 space-y-1 min-w-0">
          <span className="text-[11px] text-amber-400">Needs Follow-Up</span>
          <p className="text-base sm:text-xl font-bold text-amber-400 font-mono truncate">2 Deals</p>
          <p className="text-[10px] text-amber-400/80">Stalled &gt;5 days</p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 space-y-1 min-w-0">
          <span className="text-[11px] text-[#a68138]">Resale Mandates</span>
          <p className="text-base sm:text-xl font-bold text-[#a68138] font-mono truncate">₹28.00 Cr</p>
          <p className="text-[10px] text-white/50">Exclusive inventory</p>
        </div>
      </div>
    </div>
  );
}

export const HeroDossierPreview = HeroEditorialVisual;
