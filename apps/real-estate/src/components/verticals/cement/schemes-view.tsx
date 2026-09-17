"use client";
import * as React from "react";
import { Card } from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Badge } from "@repo/ui/components/badge";

export function SchemesView() {
  const [period] = React.useState(new Date().toISOString().slice(0,7)+"-01");
  const [accruals, setAccruals] = React.useState<any[]>([]);
  const [liability, setLiability] = React.useState<any>(null);
  const load = React.useCallback(async () => {
    const r = await fetch(`/api/schemes/accrual?period=${period}`);
    const j = await r.json();
    if (j.success) setAccruals(j.data || []);
    const schemes = await fetch(`/api/schemes?period=${period}`).then(x=>x.json());
    if (schemes.success && (schemes.data||[]).length>0) {
      // liability = sum accrued
      const sum = (j.data||[]).reduce((a:number,c:any)=>a+Number(c.accruedAmount||0),0);
      setLiability({ total: sum, count: (j.data||[]).length });
    }
  }, [period]);
  React.useEffect(()=>{ load(); }, [load]);

  const createDefaultScheme = async () => {
    const slabs = [{ minBags:0, maxBags:1000, ratePerBag:0 }, { minBags:1001, maxBags:2000, ratePerBag:5 }, { minBags:2001, maxBags:999999, ratePerBag:12 }];
    const res = await fetch("/api/schemes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ periodMonth: period, name:"May Volume Slab", slabs, dealerId: null })});
    const j = await res.json(); if(j.success) load(); else alert(j.error?.message);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Dealer Schemes — Slab Accrual</h1><p className="text-xs text-muted-foreground">Period {period}. Volume slab: Bags → ₹/bag. Accrual = delivered bags × rate. Delivered via POD only. Dealer sees 350 bags to next slab.</p></div>
        <Button size="sm" onClick={createDefaultScheme}>Create Default Scheme (0-1000:₹0, 1001-2000:₹5, 2001+:₹12)</Button>
      </div>

      {liability && (
        <Card className="p-4 grid grid-cols-3 gap-4 bg-amber-50/50 border-amber-200">
          <div><div className="text-xs text-muted-foreground">Total Liability (if all hit current slab)</div><div className="text-lg font-mono font-bold">₹{liability.total.toLocaleString("en-IN")}</div></div>
          <div><div className="text-xs text-muted-foreground">Dealers in scheme</div><div className="text-lg font-bold">{liability.count}</div></div>
          <div><div className="text-xs text-muted-foreground">Within 300 bags of next slab</div><div className="text-lg font-bold">{accruals.filter((a:any)=> a.bagsToNext && a.bagsToNext<=300).length}</div></div>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/40"><tr><th className="p-2 text-left">Dealer</th><th className="p-2 text-right">Achieved</th><th className="p-2 text-right">Rate</th><th className="p-2 text-right">Accrued</th><th className="p-2 text-right">To Next Slab</th><th className="p-2">Next Rate</th></tr></thead>
          <tbody>
            {accruals.map((a:any)=> (
              <tr key={a.dealerId} className="border-t">
                <td className="p-2 font-medium">{a.dealerName || a.dealerId.slice(0,8)}</td>
                <td className="p-2 text-right font-mono">{a.achievedBags} bags</td>
                <td className="p-2 text-right">₹{a.currentRate}/bag</td>
                <td className="p-2 text-right font-mono font-bold">₹{a.accruedAmount.toLocaleString("en-IN")}</td>
                <td className="p-2 text-right">{a.bagsToNext ? <Badge variant={a.bagsToNext<=300?"destructive":"secondary"}>{a.bagsToNext} bags</Badge> : "—"}</td>
                <td className="p-2 text-center">{a.nextRate ? `₹${a.nextRate}` : "—"}</td>
              </tr>
            ))}
            {accruals.length===0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No dealers or no scheme. Create default scheme above, then deliver challans (POD) to accrue.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Card className="p-4 text-xs space-y-2">
        <div className="font-bold">Dealer statement preview (what dealer sees on phone)</div>
        {accruals[0] ? (
          <div className="p-3 rounded border bg-card">Target 2000 bags · Achieved {accruals[0].achievedBags} · <span className="font-bold">{accruals[0].bagsToNext ? `${accruals[0].bagsToNext} bags to unlock ₹${accruals[0].nextRate}/bag` : "Top slab hit!"}</span> · Earned so far ₹{accruals[0].accruedAmount.toLocaleString("en-IN")} {accruals[0].nextRate && `· If you hit ${accruals[0].nextSlabMin}, you will earn ₹${(Number(accruals[0].nextSlabMin)*Number(accruals[0].nextRate)).toLocaleString("en-IN")}`}</div>
        ) : <div className="text-muted-foreground">No accrual yet.</div>}
      </Card>
    </div>
  );
}
