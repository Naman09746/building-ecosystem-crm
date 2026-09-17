"use client";
import * as React from "react";
import { Card } from "@repo/ui/components/card";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
export function SitesView() {
  const [sites, setSites] = React.useState<any[]>([]);
  React.useEffect(() => { fetch("/api/sites").then(r=>r.json()).then(j=> j.success && setSites(j.data||[])); }, []);
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Construction Sites</h1><p className="text-xs text-muted-foreground">One site = 5-10 repeat orders. Stage → next visit. Current brand tells you who to steal from.</p></div>
        <Button size="sm" onClick={()=> alert("New Site: siteName + address + stage + currentBrand + contractorPhone")}>Add Site</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sites.map((s:any)=> (
          <Card key={s.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between"><div><div className="font-bold text-sm">{s.site_name}</div><div className="text-xs text-muted-foreground">{s.address || "No address"} · {s.stage}</div></div><Badge variant={s.current_brand==="ambuja"?"default":"destructive"}>{s.current_brand || "unknown"}</Badge></div>
            <div className="text-xs">Contractor: {s.contractor_name || "—"} {s.contractor_phone || ""} · Next: {s.next_visit_at ? new Date(s.next_visit_at).toLocaleDateString() : "—"}</div>
          </Card>
        ))}
        {sites.length===0 && <Card className="p-6 text-xs text-muted-foreground col-span-2 text-center">No sites. POST /api/sites. Scouting GPS will auto-create site.</Card>}
      </div>
    </div>
  );
}
