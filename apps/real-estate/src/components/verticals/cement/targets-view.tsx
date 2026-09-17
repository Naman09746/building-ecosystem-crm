"use client";
import * as React from "react";
import { Card } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Button } from "@repo/ui/components/button";
export function TargetsView() {
  const [targets, setTargets] = React.useState<any[]>([]);
  const [levelId, setLevelId] = React.useState("");
  const [mt, setMt] = React.useState("100");
  React.useEffect(()=>{ fetch(`/api/targets`).then(r=>r.json()).then(j=> j.success && setTargets(j.data||[])); },[]);
  const save = async () => {
    const period = new Date().toISOString().slice(0,7)+"-01";
    const res = await fetch("/api/targets",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({periodMonth: period, targetMt: Number(mt), targetBags: Number(mt)*20, level: "dealer", levelId})});
    const j = await res.json(); if(j.success) location.reload(); else alert(j.error?.message);
  };
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold">Targets vs Actual (MT / Bags)</h1>
      <p className="text-xs text-muted-foreground">Period = month (YYYY-MM-01). Level company/state/region/area/salesperson/dealer. Achieved = delivered challans MT. Pace = achieved/target ÷ (day_of_month/days_in_month).</p>
      <Card className="p-4 flex gap-2 items-end flex-wrap">
        <div><div className="text-xs font-bold">Dealer ID (or state name for state level)</div><Input value={levelId} onChange={e=>setLevelId(e.target.value)} placeholder="dealer uuid or MP" className="h-8"/></div>
        <div><div className="text-xs font-bold">Target MT this month</div><Input value={mt} onChange={e=>setMt(e.target.value)} className="h-8"/></div>
        <Button size="sm" onClick={save}>Save Target</Button>
      </Card>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-xs"><thead className="bg-secondary/40"><tr><th className="p-2">Period</th><th className="p-2">Level</th><th className="p-2">Level ID</th><th className="p-2">Target MT</th><th className="p-2">Achieved MT</th><th className="p-2">%</th><th className="p-2">Pace</th></tr></thead>
        <tbody>{targets.map((t:any)=><tr key={t.id} className="border-t"><td className="p-2">{t.period_month}</td><td className="p-2">{t.level}</td><td className="p-2 font-mono text-[10px] truncate max-w-[160px]">{t.level_id}</td><td className="p-2">{t.target_mt}</td><td className="p-2">{t.achievedMt ?? t.achieved_mt ?? 0}</td><td className="p-2">{t.achievementPct ?? t.achievement_pct ?? 0}%</td><td className="p-2">{t.pacePct ?? t.pace_pct ?? 0}%</td></tr>)}{targets.length===0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No targets. Use form above or CSV import later.</td></tr>}</tbody></table>
      </Card>
    </div>
  );
}
