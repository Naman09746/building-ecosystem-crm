"use client";

import * as React from "react";
import {
  Footprints,
  Users,
  CheckCircle2,
  Clock,
  Phone,
  MessageSquare,
  Search,
  Filter,
  IndianRupee,
  TrendingUp,
  Store,
} from "lucide-react";
import { FootfallCaptureForm } from "./footfall-capture-form";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { formatCurrencyINR } from "@repo/core/lib/utils";
import type { MaterialsFootfall } from "@repo/core/types/materials-extensions";
import { toast } from "sonner";

const INITIAL_FOOTFALLS: MaterialsFootfall[] = [
  {
    id: "ff-001",
    orgId: "org-materials-default",
    outletName: "Main Depot (Sector 62)",
    personName: "Vikram Chauhan (Chauhan Constructions)",
    personPhone: "+91 98112 34567",
    visitType: "walk_in",
    intent: "bulk_order",
    conclusion: "quote_given",
    conclusionNotes: "Needs 800 bags UltraTech Cement + 15 tons Fe 550D TMT steel for Sector 70 school project. Quoted ₹365/bag & ₹58,000/ton.",
    estimatedValue: 1162000,
    followUpDate: "Tomorrow 10:00 AM",
    visitedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "ff-002",
    orgId: "org-materials-default",
    outletName: "Main Depot (Sector 62)",
    personName: "Mohd. Tariq (Al-Madina Masons)",
    personPhone: "+91 97180 98213",
    visitType: "walk_in",
    intent: "credit_khata",
    conclusion: "payment_received",
    conclusionNotes: "Paid ₹45,000 cash towards previous outstanding Khata balance. Requested 100 bags ACC cement delivery for tomorrow.",
    estimatedValue: 45000,
    followUpDate: "Today 6:00 PM",
    visitedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: "ff-003",
    orgId: "org-materials-default",
    outletName: "Express Retail Counter",
    personName: "Rajiv Singhal (Homeowner Villa 14)",
    personPhone: "+91 99580 11223",
    visitType: "walk_in",
    intent: "sample_request",
    conclusion: "needs_follow_up",
    conclusionNotes: "Inspected Kajaria 600x1200mm glazed vitrified tiles. Took 2 box samples. Discussing laying contractor with his architect.",
    estimatedValue: 140000,
    followUpDate: "In 2 Days, 10:00 AM",
    visitedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  },
  {
    id: "ff-004",
    orgId: "org-materials-default",
    outletName: "Main Depot (Sector 62)",
    personName: "Sanjay Verma (Apex Infrastructure)",
    personPhone: "+91 98290 44556",
    visitType: "phone_inquiry",
    intent: "price_check",
    conclusion: "order_placed",
    conclusionNotes: "Confirmed 3 truckloads (1200 bags) Ambuja Kawach water-shield cement. Delivery scheduled for Friday 7 AM at Greater Noida site.",
    estimatedValue: 468000,
    followUpDate: "Friday 8:00 AM",
    visitedAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
  },
];

export function MaterialsFootfallView() {
  const [footfalls, setFootfalls] = React.useState<MaterialsFootfall[]>(INITIAL_FOOTFALLS);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedConclusion, setSelectedConclusion] = React.useState<string>("all");

  const handleNewFootfall = (record: MaterialsFootfall) => {
    setFootfalls((prev) => [record, ...prev]);
  };

  const filtered = footfalls.filter((f) => {
    const matchesSearch =
      f.personName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.personPhone && f.personPhone.includes(searchQuery)) ||
      f.conclusionNotes.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesConclusion = selectedConclusion === "all" || f.conclusion === selectedConclusion;
    return matchesSearch && matchesConclusion;
  });

  const totalVisitorsToday = footfalls.length;
  const quotesCount = footfalls.filter((f) => f.conclusion === "quote_given").length;
  const ordersCount = footfalls.filter((f) => f.conclusion === "order_placed").length;
  const totalValuePipeline = footfalls.reduce((acc, f) => acc + (f.estimatedValue || 0), 0);

  const getConclusionBadge = (conclusion: string) => {
    switch (conclusion) {
      case "order_placed":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Order Booked</span>;
      case "quote_given":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">Quote Given</span>;
      case "payment_received":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">Payment Received</span>;
      case "needs_follow_up":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Follow-up Due</span>;
      case "lost":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">Lost</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">Browsing</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            <Store className="h-4 w-4" />
            <span>Retail Depot & Counter Operations</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            Retail Footfall & Walk-in Log
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Record walk-in contractors, masons, and buyers with mandatory conclusion notes & follow-ups.
          </p>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-border bg-card text-card-foreground">
          <span className="text-xs text-muted-foreground font-medium block">Total Walk-ins Logged</span>
          <div className="text-2xl font-bold font-mono text-foreground mt-1">{totalVisitorsToday}</div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> 100% with conclusion notes
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card text-card-foreground">
          <span className="text-xs text-muted-foreground font-medium block">Orders Booked Today</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{ordersCount}</div>
          <span className="text-[11px] text-muted-foreground mt-1 block">From walk-in negotiations</span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card text-card-foreground">
          <span className="text-xs text-muted-foreground font-medium block">Active Quotes Issued</span>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">{quotesCount}</div>
          <span className="text-[11px] text-muted-foreground mt-1 block">Awaiting contractor PO</span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card text-card-foreground">
          <span className="text-xs text-muted-foreground font-medium block">Inquiry Value Pipeline</span>
          <div className="text-2xl font-bold font-mono text-foreground mt-1">{formatCurrencyINR(totalValuePipeline)}</div>
          <span className="text-[11px] text-muted-foreground mt-1 block">Est. counter volume</span>
        </div>
      </div>

      {/* Split-pane Form & Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <FootfallCaptureForm onSaved={handleNewFootfall} />
        </div>

        <div className="lg:col-span-7">
          <div className="bg-card text-card-foreground rounded-xl border border-border p-4 sm:p-5 shadow-subtle space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground">Depot Activity & Visitor Feed</h3>
                <p className="text-xs text-muted-foreground">Chronological log with discussion takeaways</p>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: "all", label: "All" },
                  { id: "order_placed", label: "Orders" },
                  { id: "quote_given", label: "Quotes" },
                  { id: "needs_follow_up", label: "Follow-ups" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedConclusion(p.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap ${
                      selectedConclusion === p.id
                        ? "bg-foreground text-background"
                        : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer name, phone, or discussion notes..."
                className="pl-9 text-xs bg-secondary/30 h-9"
              />
            </div>

            <div className="space-y-3">
              {filtered.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs">
                  No walk-in visits match your search criteria.
                </div>
              ) : (
                filtered.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-lg border border-border/80 bg-secondary/15 hover:bg-secondary/30 transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground">{item.personName}</h4>
                          {getConclusionBadge(item.conclusion)}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          {item.personPhone && (
                            <span className="font-mono text-[11px] flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {item.personPhone}
                            </span>
                          )}
                          <span>•</span>
                          <span className="text-[11px]">{item.outletName}</span>
                        </div>
                      </div>

                      {item.estimatedValue ? (
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-foreground block">
                            {formatCurrencyINR(item.estimatedValue)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">Est. Value</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="bg-background/80 border border-border/60 rounded-md p-2.5 text-xs text-foreground leading-relaxed">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 block text-[10px] uppercase tracking-wider mb-0.5">
                        Conclusion Note:
                      </span>
                      {item.conclusionNotes}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
                      {item.followUpDate ? (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                          <Clock className="h-3 w-3" />
                          Follow-up: {item.followUpDate}
                        </span>
                      ) : (
                        <span>Logged at {new Date(item.visitedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      )}

                      <div className="flex items-center gap-1.5">
                        {item.personPhone && (
                          <a
                            href={`https://wa.me/${item.personPhone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium hover:bg-emerald-500/20 text-[11px] flex items-center gap-1"
                          >
                            <MessageSquare className="h-3 w-3" />
                            WhatsApp
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[11px] px-2"
                          onClick={() => toast.info(`Viewing details for ${item.personName}`)}
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
