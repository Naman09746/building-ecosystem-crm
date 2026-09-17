"use client";
import * as React from "react";
import { Card } from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Badge } from "@repo/ui/components/badge";

export function DealersView() {
  const [dealers, setDealers] = React.useState<any[]>([]);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dealers?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (json.success) setDealers(json.data || []);
    } catch {} finally { setLoading(false); }
  }, [q]);
  React.useEffect(() => { load(); }, [load]);
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dealer Network Master</h1>
          <p className="text-xs text-muted-foreground">CFA → Stockist → Dealer → Retailer. Beat + TSO ownership. Credit + performance computed.</p>
        </div>
        <Button size="sm" onClick={() => alert("Add Dealer — dealer_code + name + type + beat + phone")}>Add Dealer</Button>
      </div>
      <div className="flex gap-2">
        <Input placeholder="Search code, name, phone, city" value={q} onChange={e => setQ(e.target.value)} className="max-w-sm h-8 text-xs" />
      </div>
      {loading ? <div className="text-xs text-muted-foreground">Loading…</div> : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-secondary/40 text-[11px] uppercase"><tr><th className="p-2 text-left">Code</th><th className="p-2 text-left">Name</th><th className="p-2">Type</th><th className="p-2">Beat</th><th className="p-2">State</th><th className="p-2">Phone</th><th className="p-2">Status</th></tr></thead>
            <tbody>{dealers.map((d:any) => (
              <tr key={d.id} className="border-t"><td className="p-2 font-mono">{d.dealer_code}</td><td className="p-2 font-medium">{d.name}</td><td className="p-2"><Badge variant="secondary">{d.dealer_type}</Badge></td><td className="p-2">{d.beat || "—"}</td><td className="p-2">{d.state || "—"}</td><td className="p-2">{d.phone || "—"}</td><td className="p-2">{d.status}</td></tr>
            ))}{dealers.length===0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No dealers yet. API: POST /api/dealers</td></tr>}</tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
