"use client";

import * as React from "react";
import {
  IndianRupee,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  MessageSquare,
  FileText,
  Calendar,
  CreditCard,
  Building2,
  X,
} from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { ResponsiveModal } from "@repo/ui/components/responsive-modal";
import { formatCurrencyINR } from "@repo/core/lib/utils";
import { toast } from "sonner";
import type {
  MaterialsKhataLedger,
  MaterialsKhataTransaction,
  KhataPaymentMode,
} from "@repo/core/types/materials-extensions";

interface KhataLedgerViewProps {
  initialLedgers?: MaterialsKhataLedger[];
}

// Realistic seed ledgers
const SEED_LEDGERS: MaterialsKhataLedger[] = [
  {
    id: "khata-01",
    orgId: "org-materials-default",
    customerName: "Sharma & Sons Builders",
    customerPhone: "+91 98100 44551",
    creditLimit: 500000,
    outstandingBalance: 185000,
    lastPaymentAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    status: "active",
    notes: "Regular buyer for 2 G+3 projects in Noida Sector 72. 15-day credit cycle.",
    createdAt: "2026-01-10T10:00:00Z",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "khata-02",
    orgId: "org-materials-default",
    customerName: "Al-Madina Masons Group",
    customerPhone: "+91 97180 98213",
    creditLimit: 250000,
    outstandingBalance: 242000,
    lastPaymentAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28).toISOString(),
    status: "overdue",
    notes: "Overdue by 14 days. Limit almost exhausted. Payment promised this Friday.",
    createdAt: "2026-01-15T12:00:00Z",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "khata-03",
    orgId: "org-materials-default",
    customerName: "Apex Infrastructure Ltd",
    customerPhone: "+91 98290 44556",
    creditLimit: 2000000,
    outstandingBalance: 640000,
    lastPaymentAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    status: "active",
    notes: "Commercial institutional contractor. Monthly billing cycle with RTGS payments.",
    createdAt: "2025-11-20T09:00:00Z",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "khata-04",
    orgId: "org-materials-default",
    customerName: "Verma Tiles & Sanitary",
    customerPhone: "+91 99110 55667",
    creditLimit: 300000,
    outstandingBalance: 0,
    lastPaymentAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    status: "settled",
    notes: "All past invoices cleared. Good credit history.",
    createdAt: "2026-02-01T14:30:00Z",
    updatedAt: new Date().toISOString(),
  },
];

const SEED_TRANSACTIONS: Record<string, MaterialsKhataTransaction[]> = {
  "khata-01": [
    {
      id: "tx-01",
      ledgerId: "khata-01",
      orgId: "org-materials-default",
      type: "debit", // payment received
      amount: 50000,
      paymentMode: "upi",
      referenceNumber: "UPI/349102849",
      notes: "Partial payment received via Google Pay from Mr. Sharma",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    },
    {
      id: "tx-02",
      ledgerId: "khata-01",
      orgId: "org-materials-default",
      type: "credit", // material dispatch
      amount: 120000,
      referenceNumber: "CHAL-2026-041",
      notes: "Dispatched 300 bags UltraTech Super Cement to Sector 72 site",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    },
    {
      id: "tx-03",
      ledgerId: "khata-01",
      orgId: "org-materials-default",
      type: "credit",
      amount: 115000,
      referenceNumber: "CHAL-2026-032",
      notes: "Dispatched 2 tons Fe 550D TMT rebar",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    },
  ],
  "khata-02": [
    {
      id: "tx-04",
      ledgerId: "khata-02",
      orgId: "org-materials-default",
      type: "credit",
      amount: 145000,
      referenceNumber: "CHAL-2026-019",
      notes: "Dispatched 400 bags ACC Gold cement",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 32).toISOString(),
    },
    {
      id: "tx-05",
      ledgerId: "khata-02",
      orgId: "org-materials-default",
      type: "credit",
      amount: 97000,
      referenceNumber: "CHAL-2026-025",
      notes: "15,000 Red Clay Bricks delivered to Khora Colony site",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28).toISOString(),
    },
  ],
};

export function KhataLedgerView({ initialLedgers = SEED_LEDGERS }: KhataLedgerViewProps) {
  const [ledgers, setLedgers] = React.useState<MaterialsKhataLedger[]>(initialLedgers);
  const [transactions, setTransactions] = React.useState<Record<string, MaterialsKhataTransaction[]>>(SEED_TRANSACTIONS);
  const [selectedLedgerId, setSelectedLedgerId] = React.useState<string>(initialLedgers[0]?.id || "");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Record Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState("");
  const [paymentMode, setPaymentMode] = React.useState<KhataPaymentMode>("upi");
  const [referenceNo, setReferenceNo] = React.useState("");
  const [paymentNotes, setPaymentNotes] = React.useState("");

  // New Contractor Khata Modal State
  const [newKhataModalOpen, setNewKhataModalOpen] = React.useState(false);
  const [newCustomerName, setNewCustomerName] = React.useState("");
  const [newCustomerPhone, setNewCustomerPhone] = React.useState("");
  const [newCreditLimit, setNewCreditLimit] = React.useState("200000");
  const [newKhataNotes, setNewKhataNotes] = React.useState("");

  const activeLedger = ledgers.find((l) => l.id === selectedLedgerId) || ledgers[0];
  const activeTransactions = activeLedger ? transactions[activeLedger.id] || [] : [];

  // Summary Metrics
  const totalOutstanding = ledgers.reduce((acc, l) => acc + l.outstandingBalance, 0);
  const overdueCount = ledgers.filter((l) => l.status === "overdue").length;
  const overdueAmount = ledgers
    .filter((l) => l.status === "overdue")
    .reduce((acc, l) => acc + l.outstandingBalance, 0);

  const filteredLedgers = ledgers.filter((l) => {
    const matchesSearch =
      l.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.customerPhone && l.customerPhone.includes(searchQuery));
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLedger) return;
    const amountNum = parseFloat(paymentAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }
    if (!paymentNotes.trim() || paymentNotes.trim().length < 3) {
      toast.error("Mandatory: Please add a note or receipt reference for this payment.");
      return;
    }

    const newTx: MaterialsKhataTransaction = {
      id: crypto.randomUUID(),
      ledgerId: activeLedger.id,
      orgId: activeLedger.orgId,
      type: "debit",
      amount: amountNum,
      paymentMode,
      referenceNumber: referenceNo.trim() || undefined,
      notes: paymentNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    // Update transactions list
    setTransactions((prev) => ({
      ...prev,
      [activeLedger.id]: [newTx, ...(prev[activeLedger.id] || [])],
    }));

    // Update ledger balance
    setLedgers((prev) =>
      prev.map((l) => {
        if (l.id === activeLedger.id) {
          const newBal = Math.max(0, l.outstandingBalance - amountNum);
          return {
            ...l,
            outstandingBalance: newBal,
            lastPaymentAt: new Date().toISOString(),
            status: newBal === 0 ? "settled" : l.status === "overdue" && newBal < l.creditLimit ? "active" : l.status,
            updatedAt: new Date().toISOString(),
          };
        }
        return l;
      })
    );

    toast.success(`Recorded ₹${amountNum.toLocaleString("en-IN")} payment for ${activeLedger.customerName}`);
    setPaymentModalOpen(false);
    setPaymentAmount("");
    setReferenceNo("");
    setPaymentNotes("");
  };

  const handleCreateNewKhata = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) {
      toast.error("Contractor name is required");
      return;
    }

    const newLedger: MaterialsKhataLedger = {
      id: crypto.randomUUID(),
      orgId: "org-materials-default",
      customerName: newCustomerName.trim(),
      customerPhone: newCustomerPhone.trim() || undefined,
      creditLimit: parseFloat(newCreditLimit) || 100000,
      outstandingBalance: 0,
      status: "active",
      notes: newKhataNotes.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setLedgers((prev) => [newLedger, ...prev]);
    setSelectedLedgerId(newLedger.id);
    toast.success(`Created Khata credit account for ${newLedger.customerName}`);
    setNewKhataModalOpen(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewKhataNotes("");
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card text-card-foreground">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <IndianRupee className="h-4 w-4 text-emerald-500" />
            Total Outstanding Credit
          </span>
          <div className="text-2xl font-bold font-mono text-foreground mt-1.5">
            {formatCurrencyINR(totalOutstanding)}
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Across {ledgers.length} contractor khata accounts
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card text-card-foreground">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Overdue Balance (&gt;15 Days)
          </span>
          <div className="text-2xl font-bold font-mono text-red-600 dark:text-red-400 mt-1.5">
            {formatCurrencyINR(overdueAmount)}
          </div>
          <span className="text-[11px] text-red-500/80 font-medium mt-1 block">
            {overdueCount} contractor accounts require payment dunning
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card text-card-foreground">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <Receipt className="h-4 w-4 text-blue-500" />
            Payment Collections This Month
          </span>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1.5">
            {formatCurrencyINR(385000)}
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            UPI, RTGS & Depot Cash Collections
          </span>
        </div>
      </div>

      {/* Main Split-View: Contractor Accounts (Left) & Detailed Ledger (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Accounts List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-card text-card-foreground rounded-xl border border-border p-4 shadow-subtle space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">Contractor Credit Accounts</h3>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => setNewKhataModalOpen(true)}
              >
                <Plus className="h-3 w-3" />
                <span>New Khata</span>
              </Button>
            </div>

            {/* Search and Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contractor or phone..."
                  className="pl-8 text-xs bg-secondary/30 h-8"
                />
              </div>
              <div className="flex gap-1 overflow-x-auto pb-0.5">
                {[
                  { id: "all", label: "All" },
                  { id: "active", label: "Active" },
                  { id: "overdue", label: "Overdue" },
                  { id: "settled", label: "Settled" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStatusFilter(s.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                      statusFilter === s.id
                        ? "bg-foreground text-background"
                        : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-0.5">
              {filteredLedgers.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No accounts found.
                </div>
              ) : (
                filteredLedgers.map((l) => {
                  const isSelected = activeLedger?.id === l.id;
                  const percentUsed = Math.min(100, Math.round((l.outstandingBalance / l.creditLimit) * 100));
                  return (
                    <div
                      key={l.id}
                      onClick={() => setSelectedLedgerId(l.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all space-y-1.5 ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500"
                          : "border-border/80 bg-secondary/15 hover:bg-secondary/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-foreground">{l.customerName}</h4>
                          {l.customerPhone && (
                            <p className="text-[11px] font-mono text-muted-foreground">{l.customerPhone}</p>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            l.status === "overdue"
                              ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                              : l.status === "settled"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {l.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                        <span className="text-[11px] text-muted-foreground">Outstanding</span>
                        <span className="font-mono font-bold text-foreground">
                          {formatCurrencyINR(l.outstandingBalance)}
                        </span>
                      </div>

                      {/* Credit Bar */}
                      <div className="w-full bg-secondary/60 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            percentUsed > 85 ? "bg-red-500" : percentUsed > 50 ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${percentUsed}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Limit: {formatCurrencyINR(l.creditLimit)}</span>
                        <span>{percentUsed}% used</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Statement / Detailed Running Ledger */}
        <div className="lg:col-span-7 space-y-4">
          {activeLedger ? (
            <div className="bg-card text-card-foreground rounded-xl border border-border p-4 sm:p-5 shadow-subtle space-y-4">
              {/* Account Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground">{activeLedger.customerName}</h2>
                    <span className="text-[11px] bg-secondary px-2 py-0.5 rounded font-mono font-medium">
                      Khata #{activeLedger.id.slice(0, 8)}
                    </span>
                  </div>
                  {activeLedger.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5">{activeLedger.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {activeLedger.customerPhone && (
                    <a
                      href={`https://wa.me/${activeLedger.customerPhone.replace(/\D/g, "")}?text=Hello%20${encodeURIComponent(activeLedger.customerName)},%20your%20current%20outstanding%20Khata%20balance%20at%20our%20depot%20is%20${formatCurrencyINR(activeLedger.outstandingBalance)}.%20Please%20let%20us%20know%20when%20you%20can%20clear%20this.`}
                      target="_blank"
                      rel="noreferrer"
                      className="h-8 px-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1.5 hover:bg-emerald-500/20"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>WhatsApp Statement</span>
                    </a>
                  )}
                  <Button
                    size="sm"
                    className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    onClick={() => setPaymentModalOpen(true)}
                  >
                    <ArrowDownLeft className="h-3.5 w-3.5" />
                    <span>Record Payment</span>
                  </Button>
                </div>
              </div>

              {/* Balance Summary Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-secondary/20 border border-border/80">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
                    Outstanding
                  </span>
                  <span className="text-base font-bold font-mono text-foreground mt-0.5 block">
                    {formatCurrencyINR(activeLedger.outstandingBalance)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
                    Credit Limit
                  </span>
                  <span className="text-base font-bold font-mono text-foreground mt-0.5 block">
                    {formatCurrencyINR(activeLedger.creditLimit)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
                    Available Credit
                  </span>
                  <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {formatCurrencyINR(Math.max(0, activeLedger.creditLimit - activeLedger.outstandingBalance))}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
                    Last Payment
                  </span>
                  <span className="text-xs font-medium text-foreground mt-1 block">
                    {activeLedger.lastPaymentAt
                      ? new Date(activeLedger.lastPaymentAt).toLocaleDateString()
                      : "No record"}
                  </span>
                </div>
              </div>

              {/* Running Statement Entries */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Transaction History & Entries
                </h4>

                <div className="space-y-2">
                  {activeTransactions.length === 0 ? (
                    <div className="text-center py-10 text-xs text-muted-foreground border border-dashed rounded-lg">
                      No transactions recorded yet for this contractor.
                    </div>
                  ) : (
                    activeTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3 rounded-lg border border-border/70 bg-card hover:bg-secondary/10 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                              tx.type === "debit"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {tx.type === "debit" ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">
                                {tx.type === "debit" ? "Payment Received" : "Goods Dispatched on Credit"}
                              </span>
                              {tx.paymentMode && (
                                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-secondary rounded text-muted-foreground">
                                  {tx.paymentMode}
                                </span>
                              )}
                              {tx.referenceNumber && (
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  Ref: {tx.referenceNumber}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{tx.notes}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-sm font-mono font-bold block ${
                              tx.type === "debit"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-foreground"
                            }`}
                          >
                            {tx.type === "debit" ? "-" : "+"} {formatCurrencyINR(tx.amount)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground text-xs bg-card rounded-xl border border-border">
              Select a contractor to view running Khata ledger
            </div>
          )}
        </div>
      </div>

      {/* Modal: Record Khata Payment */}
      <ResponsiveModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        className="sm:max-w-[460px] p-5"
      >
        <div className="space-y-4">
          <div className="pb-3 border-b border-border">
            <h3 className="text-base font-bold text-foreground">Record Contractor Payment</h3>
            <p className="text-xs text-muted-foreground">
              Logging payment receipt for {activeLedger?.customerName}
            </p>
          </div>

          <form onSubmit={handleRecordPayment} className="space-y-3.5">
            <div>
              <Label className="text-xs font-semibold text-foreground">Amount Received (₹) *</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="h-10 text-base font-mono font-bold bg-secondary/30 mt-1"
                autoFocus
                required
              />
              {activeLedger && (
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Current total owed: <strong className="font-mono">{formatCurrencyINR(activeLedger.outstandingBalance)}</strong>
                </span>
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold text-foreground">Payment Mode</Label>
              <div className="grid grid-cols-4 gap-1.5 mt-1">
                {[
                  { id: "upi" as KhataPaymentMode, label: "UPI" },
                  { id: "cash" as KhataPaymentMode, label: "Cash" },
                  { id: "cheque" as KhataPaymentMode, label: "Cheque" },
                  { id: "bank_transfer" as KhataPaymentMode, label: "RTGS/NEFT" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMode(m.id)}
                    className={`py-1.5 text-xs font-semibold rounded-md border transition-all ${
                      paymentMode === m.id
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-border bg-secondary/30 text-foreground hover:bg-secondary"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-foreground">
                Transaction / Cheque / Receipt Ref No.
              </Label>
              <Input
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. UPI-928410291 or Chq #440192"
                className="h-9 text-xs bg-secondary/30 mt-1 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-foreground">
                Mandatory Conclusion / Payment Note *
              </Label>
              <Input
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="e.g. Paid in full for Sector 72 slab casting cement dispatch"
                className="h-9 text-xs bg-secondary/30 mt-1"
                required
              />
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPaymentModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Save Payment & Update Balance</span>
              </Button>
            </div>
          </form>
        </div>
      </ResponsiveModal>

      {/* Modal: New Contractor Khata */}
      <ResponsiveModal
        open={newKhataModalOpen}
        onOpenChange={setNewKhataModalOpen}
        className="sm:max-w-[460px] p-5"
      >
        <div className="space-y-4">
          <div className="pb-3 border-b border-border">
            <h3 className="text-base font-bold text-foreground">Open Contractor Khata Account</h3>
            <p className="text-xs text-muted-foreground">Setup credit facility for recurring material buyers</p>
          </div>

          <form onSubmit={handleCreateNewKhata} className="space-y-3.5">
            <div>
              <Label className="text-xs font-semibold text-foreground">Contractor / Firm Name *</Label>
              <Input
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="e.g. Gupta Construction Co."
                className="h-9 text-xs bg-secondary/30 mt-1"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-foreground">Mobile Phone (WhatsApp)</Label>
              <Input
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="e.g. +91 98110 99887"
                className="h-9 text-xs font-mono bg-secondary/30 mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-foreground">Sanctioned Credit Limit (₹)</Label>
              <Input
                type="number"
                value={newCreditLimit}
                onChange={(e) => setNewCreditLimit(e.target.value)}
                placeholder="200000"
                className="h-9 text-xs font-mono bg-secondary/30 mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-foreground">Notes / Credit Terms</Label>
              <Input
                value={newKhataNotes}
                onChange={(e) => setNewKhataNotes(e.target.value)}
                placeholder="e.g. 15-day settlement cycle, referred by Architect Saxena"
                className="h-9 text-xs bg-secondary/30 mt-1"
              />
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNewKhataModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Open Khata Account
              </Button>
            </div>
          </form>
        </div>
      </ResponsiveModal>
    </div>
  );
}
