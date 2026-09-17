"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { KhataLedgerView } from "@/components/verticals/materials/khata-ledger-view";
import { IndianRupee, Download } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { toast } from "sonner";

export default function KhataPage() {
  return (
    <AppShell initialTab="khata">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <IndianRupee className="h-4 w-4" />
              <span>Credit Accounting & Contractor Ledgers</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
              Khata Ledger & Payment Tracking
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Track running contractor credit, dispatch debits, cash/UPI receipts, and overdue dunning alerts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-9 gap-1.5"
              onClick={() => toast.success("Khata ledger statement exported to CSV")}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Ledger</span>
            </Button>
          </div>
        </div>

        <KhataLedgerView />
      </div>
    </AppShell>
  );
}
