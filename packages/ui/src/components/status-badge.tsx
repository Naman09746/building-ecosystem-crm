import * as React from "react";
import { Badge, type BadgeProps } from "./badge";
import { DealHealth, UnitStatus, LeadScoreLabel } from "@repo/core/types/crm";
import { Flame, ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react";

export type PipelineStageType =
  | "new"
  | "contacted"
  | "qualified"
  | "site_visit"
  | "negotiation"
  | "won"
  | "lost";

export type TaskStatusType =
  | "due_today"
  | "upcoming"
  | "overdue"
  | "completed";

const STAGE_CONFIG: Record<
  PipelineStageType,
  { label: string; variant: BadgeProps["variant"] }
> = {
  new: { label: "New", variant: "secondary" },
  contacted: { label: "Contacted", variant: "info" },
  qualified: { label: "Qualified", variant: "indigo" },
  site_visit: { label: "Site Visit", variant: "warning" },
  negotiation: { label: "Negotiation", variant: "purple" },
  won: { label: "Won", variant: "success" },
  lost: { label: "Lost", variant: "destructive" },
};

const TASK_CONFIG: Record<
  TaskStatusType,
  { label: string; variant: BadgeProps["variant"] }
> = {
  due_today: { label: "Due Today", variant: "warning" },
  upcoming: { label: "Upcoming", variant: "secondary" },
  overdue: { label: "Overdue", variant: "destructive" },
  completed: { label: "Completed", variant: "success" },
};

export function PipelineBadge({ stage }: { stage: PipelineStageType | string }) {
  const normalized = (stage.toLowerCase().replace(/\s+/g, "_") as PipelineStageType) || "new";
  const config = STAGE_CONFIG[normalized] || {
    label: stage,
    variant: "secondary",
  };

  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatusType | string }) {
  const normalized = (status.toLowerCase().replace(/\s+/g, "_") as TaskStatusType) || "upcoming";
  const config = TASK_CONFIG[normalized] || {
    label: status,
    variant: "secondary",
  };

  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
}

export function DealHealthBadge({
  health,
  score,
  reason,
  showScore = false,
}: {
  health: DealHealth;
  score?: number;
  reason?: string;
  showScore?: boolean;
}) {
  const scoreSuffix = showScore && typeof score === "number" ? ` · ${score}/100` : "";

  if (health === "strong") {
    return (
      <Badge variant="success" dot className="font-semibold text-[11px]" title={reason || `Health score: ${score ?? 85}/100`}>
        Strong{scoreSuffix}
      </Badge>
    );
  }
  if (health === "at_risk") {
    return (
      <Badge variant="destructive" dot className="font-bold text-[11px] animate-pulse" title={reason || `Health score: ${score ?? 35}/100`}>
        At Risk{scoreSuffix}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" dot className="text-[11px]" title={reason || `Health score: ${score ?? 60}/100`}>
      Neutral{scoreSuffix}
    </Badge>
  );
}

export function LeadScoreBadge({ score, label }: { score: number; label?: LeadScoreLabel }) {
  const isHot = score >= 85 || label === "Hot";
  const isWarm = (score >= 70 && score < 85) || label === "Warm";

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
        isHot
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : isWarm
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : "bg-secondary text-muted-foreground border-border"
      }`}
      title={`Lead Score: ${score}/100 (${label || "Standard"})`}
    >
      {isHot && <Flame className="h-3 w-3 text-rose-600 fill-rose-500/30 shrink-0" />}
      <span>{score}</span>
      <span className="text-[10px] font-sans font-medium uppercase tracking-wider text-muted-foreground/80">
        · {label || (isHot ? "Hot" : isWarm ? "Warm" : "Cold")}
      </span>
    </div>
  );
}

const UNIT_STATUS_CONFIG: Record<
  UnitStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  available: { label: "Available", variant: "success" },
  hold: { label: "Hold", variant: "warning" },
  site_visit: { label: "Site Visit", variant: "info" },
  negotiation: { label: "Negotiation", variant: "purple" },
  booked: { label: "Booked", variant: "indigo" },
  sold: { label: "Sold", variant: "destructive" },
};

export function UnitStatusBadge({ status }: { status: UnitStatus }) {
  const config = UNIT_STATUS_CONFIG[status] || { label: status, variant: "secondary" };
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
}

