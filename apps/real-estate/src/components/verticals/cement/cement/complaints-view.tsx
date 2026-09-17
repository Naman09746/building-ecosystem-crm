"use client";
import * as React from "react";
import { Card } from "@repo/ui/components/card";
import { Badge } from "@repo/ui/components/badge";
export function ComplaintsView() {
  const [rows, setRows] = React.useState<any[]>([]);
  React.useEffect(()=>{ fetch("/api/complaints").then(r=>r.json()).then(j=> j.success && setRows(j.data||[])); },[]);
  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <h1 className="text-xl font-bold">Complaints — 48h SLA</h1>
      <p className="text-xs text-muted-foreground">Types: late_delivery / short_quantity / damaged_bags / wrong_grade / rate_difference / quality_doubt / service_behaviour. Due = created +48h.</p>
      <div className="grid gap-2">
        {rows.map((c:any)=> {
          const breached = new Date(c.due_at) < new Date() && c.status!=="closed";
          return (
            <Card key={c.id} className={`p-3 flex items-center justify-between ${breached ? "border-destructive" : ""}`}>
              <div><div className="font-mono text-xs font-bold">{c.case_no} <Badge variant={breached?"destructive":"secondary"}>{c.status}</Badge></div><div className="text-xs">{c.complaint_type} — {c.description || "No description"}</div><div className="text-[11px] text-muted-foreground">Due {new Date(c.due_at).toLocaleString()} {breached && "· BREACHED"}</div></div>
              <Badge variant="outline">{c.priority}</Badge>
            </Card>
          );
        })}
        {rows.length===0 && <Card className="p-6 text-xs text-muted-foreground text-center">No complaints. POST /api/complaints to create.</Card>}
      </div>
    </div>
  );
}
