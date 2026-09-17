"use client";
import * as React from "react";
import { Card } from "@repo/ui/components/card";
export function CollectionsView() {
  const [rows, setRows] = React.useState<any[]>([]);
  React.useEffect(()=>{ fetch("/api/collections/daily").then(r=>r.json()).then(j=> j.success && setRows(j.data||[])); },[]);
  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <h1 className="text-xl font-bold">Money to Collect Today</h1>
      <p className="text-xs text-muted-foreground">Overdue only, sorted by overdue desc. Ageing bucket 1-15 / 16-30 / 31-60 / 60+. TSO taps Collect Now → Khata debit.</p>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-xs"><thead className="bg-secondary/40"><tr><th className="p-2 text-left">Dealer</th><th className="p-2 text-right">Outstanding</th><th className="p-2 text-right">Overdue</th><th className="p-2">Days</th><th className="p-2">Bucket</th><th className="p-2">TSO</th></tr></thead>
        <tbody>{rows.map((r:any)=><tr key={r.dealer_id} className="border-t"><td className="p-2 font-medium">{r.dealer_name}</td><td className="p-2 text-right font-mono">₹{r.outstanding}</td><td className="p-2 text-right font-mono text-destructive">₹{r.overdue}</td><td className="p-2 text-center">{r.days_overdue}</td><td className="p-2 text-center">{r.ageing_bucket}</td><td className="p-2 text-center text-[10px]">{r.assigned_tso?.slice(0,8) || "—"}</td></tr>)}{rows.length===0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No overdue. All caught up.</td></tr>}</tbody></table>
      </Card>
    </div>
  );
}
