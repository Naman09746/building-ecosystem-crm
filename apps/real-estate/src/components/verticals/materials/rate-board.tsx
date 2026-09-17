"use client";

import * as React from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  IndianRupee,
  Send,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Sparkles,
  Edit2,
  Share2,
  Boxes,
  Building2,
} from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { ResponsiveModal } from "@repo/ui/components/responsive-modal";
import { formatCurrencyINR } from "@repo/core/lib/utils";
import { toast } from "sonner";

export interface MaterialDailyRateItem {
  id: string;
  category: "Cement" | "Steel" | "Masonry" | "Aggregates" | "Tiles";
  name: string;
  brand: string;
  uom: string;
  yesterdayRate: number;
  todayRate: number;
  retailPrice: number;
  moq: string;
}

const SEED_RATES: MaterialDailyRateItem[] = [
  {
    id: "rate-01",
    category: "Cement",
    name: "OPC 53 Grade High Strength",
    brand: "UltraTech",
    uom: "50kg Bag",
    yesterdayRate: 360,
    todayRate: 365,
    retailPrice: 385,
    moq: "100 Bags",
  },
  {
    id: "rate-02",
    category: "Cement",
    name: "Super Weather-Shield PPC",
    brand: "UltraTech",
    uom: "50kg Bag",
    yesterdayRate: 335,
    todayRate: 335,
    retailPrice: 355,
    moq: "100 Bags",
  },
  {
    id: "rate-03",
    category: "Cement",
    name: "Ambuja Kawach Water-Repellent",
    brand: "Ambuja",
    uom: "50kg Bag",
    yesterdayRate: 385,
    todayRate: 390,
    retailPrice: 415,
    moq: "50 Bags",
  },
  {
    id: "rate-04",
    category: "Steel",
    name: "Fe 550D TMT Primary Rebar",
    brand: "Tata Tiscon",
    uom: "Metric Ton",
    yesterdayRate: 63000,
    todayRate: 62500,
    retailPrice: 66000,
    moq: "2 Tons",
  },
  {
    id: "rate-05",
    category: "Steel",
    name: "Fe 550D TMT Super Ductile",
    brand: "Jindal Panther",
    uom: "Metric Ton",
    yesterdayRate: 58500,
    todayRate: 58200,
    retailPrice: 61500,
    moq: "2 Tons",
  },
  {
    id: "rate-06",
    category: "Masonry",
    name: "Kiln-Burned Red Clay Bricks",
    brand: "Standard Class-I",
    uom: "1,000 Pcs",
    yesterdayRate: 8200,
    todayRate: 8200,
    retailPrice: 9000,
    moq: "5,000 Pcs",
  },
  {
    id: "rate-07",
    category: "Masonry",
    name: "Autoclaved Aerated (AAC) Blocks 6-inch",
    brand: "Magicrete",
    uom: "Piece",
    yesterdayRate: 57,
    todayRate: 58,
    retailPrice: 65,
    moq: "500 Pcs",
  },
  {
    id: "rate-08",
    category: "Aggregates",
    name: "Blue Metal Crushed Stone 20mm",
    brand: "Stone Quarry",
    uom: "Metric Ton",
    yesterdayRate: 1150,
    todayRate: 1150,
    retailPrice: 1350,
    moq: "10 Tons",
  },
  {
    id: "rate-09",
    category: "Tiles",
    name: "Glazed Vitrified Floor Tiles 600x1200",
    brand: "Kajaria Eternity",
    uom: "Sq.Ft.",
    yesterdayRate: 52,
    todayRate: 52,
    retailPrice: 68,
    moq: "500 Sq.Ft.",
  },
];

export function RateBoard() {
  const [rates, setRates] = React.useState<MaterialDailyRateItem[]>(SEED_RATES);
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [broadcastModalOpen, setBroadcastModalOpen] = React.useState(false);
  const [broadcastRecipientCount, setBroadcastRecipientCount] = React.useState(142);
  const [isBroadcasting, setIsBroadcasting] = React.useState(false);

  const filteredRates = rates.filter(
    (r) => selectedCategory === "all" || r.category === selectedCategory
  );

  const handleRateUpdate = (id: string, newRate: number) => {
    setRates((prev) =>
      prev.map((r) => (r.id === id ? { ...r, todayRate: newRate } : r))
    );
  };

  const getRateChangeIcon = (yesterday: number, today: number) => {
    if (today > yesterday) {
      return (
        <span className="flex items-center text-red-500 font-mono text-[11px] font-bold">
          <TrendingUp className="h-3 w-3 mr-0.5" /> +₹{today - yesterday}
        </span>
      );
    }
    if (today < yesterday) {
      return (
        <span className="flex items-center text-emerald-500 font-mono text-[11px] font-bold">
          <TrendingDown className="h-3 w-3 mr-0.5" /> -₹{yesterday - today}
        </span>
      );
    }
    return (
      <span className="flex items-center text-muted-foreground font-mono text-[11px]">
        <Minus className="h-3 w-3 mr-0.5" /> Flat
      </span>
    );
  };

  const generateBroadcastText = () => {
    const todayStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return `📋 *TODAY'S WHOLESALE MATERIAL RATES BOARD*
📅 Date: ${todayStr} | Depot: Main Yard

🏗️ *CEMENT (per 50kg bag)*
• UltraTech OPC 53G: ₹${rates.find((r) => r.id === "rate-01")?.todayRate || 365}
• UltraTech PPC: ₹${rates.find((r) => r.id === "rate-02")?.todayRate || 335}
• Ambuja Kawach: ₹${rates.find((r) => r.id === "rate-03")?.todayRate || 390}

🔩 *TMT REBAR (per Ton)*
• Tata Tiscon 550D: ₹${(rates.find((r) => r.id === "rate-04")?.todayRate || 62500).toLocaleString("en-IN")}
• Jindal Panther: ₹${(rates.find((r) => r.id === "rate-05")?.todayRate || 58200).toLocaleString("en-IN")}

🧱 *BRICKS & BLOCKS*
• Red Clay Bricks: ₹${(rates.find((r) => r.id === "rate-06")?.todayRate || 8200).toLocaleString("en-IN")} / 1,000 pcs
• AAC Blocks (6"): ₹${rates.find((r) => r.id === "rate-07")?.todayRate || 58} / pc

🚚 *Ready Stock for immediate dispatch. Rates valid till 6:00 PM today.*
Reply to this message with your required quantity to lock your slot!`;
  };

  const handleSendBroadcast = () => {
    setIsBroadcasting(true);
    setTimeout(() => {
      setIsBroadcasting(false);
      setBroadcastModalOpen(false);
      toast.success(
        `WhatsApp Rate Broadcast dispatched to ${broadcastRecipientCount} tagged contractors!`
      );
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Rate Board Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-bold text-foreground">
              Daily Wholesale Rate Board & Margin Ledger
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Effective for {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} • Updates sync across wholesale quotes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setBroadcastModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 gap-1.5 shadow-sm"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Broadcast Rates via WhatsApp</span>
          </Button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {["all", "Cement", "Steel", "Masonry", "Aggregates", "Tiles"].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedCategory === cat
                ? "bg-foreground text-background"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat === "all" ? "All Categories" : cat}
          </button>
        ))}
      </div>

      {/* Rates Table */}
      <div className="bg-card text-card-foreground rounded-xl border border-border overflow-hidden shadow-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 text-muted-foreground font-semibold border-b border-border">
              <tr>
                <th className="p-3.5 pl-4">Product & Specification</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Unit (UOM)</th>
                <th className="p-3.5">Yesterday</th>
                <th className="p-3.5">Today Wholesale (₹)</th>
                <th className="p-3.5">Trend</th>
                <th className="p-3.5">Counter Retail</th>
                <th className="p-3.5">Min Order (MOQ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredRates.map((item) => (
                <tr key={item.id} className="hover:bg-secondary/15 transition-colors">
                  <td className="p-3.5 pl-4">
                    <div className="font-bold text-foreground text-sm">{item.name}</div>
                    <div className="text-[11px] text-muted-foreground font-medium">{item.brand}</div>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-secondary text-foreground">
                      {item.category}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-muted-foreground">{item.uom}</td>
                  <td className="p-3.5 font-mono text-muted-foreground">
                    {formatCurrencyINR(item.yesterdayRate)}
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        value={item.todayRate}
                        onChange={(e) =>
                          handleRateUpdate(item.id, parseFloat(e.target.value) || 0)
                        }
                        className="h-8 w-28 text-xs font-mono font-bold bg-secondary/30 focus:bg-background"
                      />
                    </div>
                  </td>
                  <td className="p-3.5">{getRateChangeIcon(item.yesterdayRate, item.todayRate)}</td>
                  <td className="p-3.5 font-mono text-muted-foreground">
                    {formatCurrencyINR(item.retailPrice)}
                  </td>
                  <td className="p-3.5 text-muted-foreground font-mono">{item.moq}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Broadcast WhatsApp Preview Modal */}
      <ResponsiveModal
        open={broadcastModalOpen}
        onOpenChange={setBroadcastModalOpen}
        className="sm:max-w-[500px] p-5"
      >
        <div className="space-y-4">
          <div className="pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-500" />
              <h3 className="text-base font-bold text-foreground">WhatsApp Rate Broadcast</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Instantly push today&apos;s updated wholesale board to your active contractor network.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Target Audience:</span>
              <span className="font-bold text-foreground bg-secondary px-2 py-0.5 rounded">
                {broadcastRecipientCount} Contractors & Builders
              </span>
            </div>

            <Label className="text-xs font-semibold text-foreground block">
              Formatted WhatsApp Message Preview
            </Label>
            <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-950 dark:text-emerald-200 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
              {generateBroadcastText()}
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBroadcastModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={isBroadcasting}
              onClick={handleSendBroadcast}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5"
            >
              {isBroadcasting ? (
                "Dispatching Broadcast..."
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Send WhatsApp Broadcast</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
}
