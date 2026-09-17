/**
 * Deterministic Deal Health Engine — Explainable, Activity-Driven Risk Scoring
 * Authoritative TypeScript implementation mirroring PostgreSQL calculate_lead_deal_health
 */

import { DealHealth, PipelineStage } from "../../types/crm";

export interface DealHealthFactor {
  type: string;
  impact: number;
  description: string;
}

export interface ComputedDealHealth {
  score: number; // 0 to 100
  status: DealHealth; // "strong" | "neutral" | "at_risk"
  reason: string;
  factors: DealHealthFactor[];
  recommendedAction: string;
  calculatedAt: string;
}

export interface DealHealthLeadInput {
  id: string;
  stage: PipelineStage | string;
  createdAt: string | Date;
  lastActivityAt?: string | Date | null;
  stageEnteredAt?: string | Date | null;
  daysInStage?: number;
}

export interface DealHealthTaskInput {
  status: "upcoming" | "due_today" | "overdue" | "completed" | "cancelled" | string;
  dueDate?: string;
}

export interface DealHealthActivityInput {
  type: "call" | "whatsapp" | "site_visit" | "meeting" | "booking" | "note" | "stage_change" | string;
  occurredAt: string | Date;
  metadata?: Record<string, any> | null;
}

/**
 * Computes deterministic deal health score, status, factors, reason, and recommended action.
 * 100% deterministic, explainable, and time-controllable.
 */
export function computeDealHealth(
  lead: DealHealthLeadInput,
  tasks: DealHealthTaskInput[] = [],
  activities: DealHealthActivityInput[] = [],
  now: Date = new Date()
): ComputedDealHealth {
  const currentTimeMs = now.getTime();
  const calculatedAt = now.toISOString();

  // 1. Terminal Stage Handling
  if (lead.stage === "won") {
    return {
      score: 100,
      status: "strong",
      reason: "Deal successfully closed and won.",
      factors: [
        { type: "stage_won", impact: 40, description: "Deal won and closed successfully." },
      ],
      recommendedAction: "Proceed with post-sale onboarding, documentation, and registration.",
      calculatedAt,
    };
  }

  if (lead.stage === "lost") {
    return {
      score: 0,
      status: "neutral",
      reason: "Deal marked as lost.",
      factors: [
        { type: "stage_lost", impact: -60, description: "Deal closed as lost." },
      ],
      recommendedAction: "No active sales action required. Can be scheduled for future re-engagement.",
      calculatedAt,
    };
  }

  // 2. Gather CRM Signals
  const leadCreatedAtMs = new Date(lead.createdAt).getTime();
  const lastActivityMs = lead.lastActivityAt ? new Date(lead.lastActivityAt).getTime() : leadCreatedAtMs;
  const stageEnteredMs = lead.stageEnteredAt ? new Date(lead.stageEnteredAt).getTime() : leadCreatedAtMs;

  const daysInactive = Math.max(0, Math.floor((currentTimeMs - lastActivityMs) / (1000 * 60 * 60 * 24)));
  const daysInStage = lead.daysInStage ?? Math.max(0, Math.floor((currentTimeMs - stageEnteredMs) / (1000 * 60 * 60 * 24)));

  const overdueTasksCount = tasks.filter((t) => t.status === "overdue").length;
  const upcomingTasksCount = tasks.filter((t) => ["upcoming", "due_today"].includes(t.status)).length;

  const sevenDaysAgoMs = currentTimeMs - 7 * 24 * 60 * 60 * 1000;
  const fortyEightHoursAgoMs = currentTimeMs - 48 * 60 * 60 * 1000;
  const fourteenDaysAgoMs = currentTimeMs - 14 * 24 * 60 * 60 * 1000;

  const recentSiteVisit = activities.some((a) => {
    const actTime = new Date(a.occurredAt).getTime();
    return a.type === "site_visit" && actTime >= sevenDaysAgoMs;
  });

  const recentInboundResponse = activities.some((a) => {
    const actTime = new Date(a.occurredAt).getTime();
    return (
      actTime >= fortyEightHoursAgoMs &&
      (["whatsapp", "call"].includes(a.type) || a.metadata?.inbound === true || a.metadata?.inbound === "true")
    );
  });

  const recentBookingOrMeeting = activities.some((a) => {
    const actTime = new Date(a.occurredAt).getTime();
    return ["booking", "meeting"].includes(a.type) && actTime >= fourteenDaysAgoMs;
  });

  // 3. Base Score
  let score = 60;
  const factors: DealHealthFactor[] = [];
  let minImpact = 0;
  let topNegativeType: string | null = null;

  // 4. Factor 1: Activity Recency
  if (daysInactive === 0) {
    score += 20;
    factors.push({ type: "activity_recency", impact: 20, description: "Recent sales touchpoint within 24 hours" });
  } else if (daysInactive <= 2) {
    score += 15;
    factors.push({ type: "activity_recency", impact: 15, description: "Sales activity within 2 days" });
  } else if (daysInactive <= 5) {
    score += 8;
    factors.push({ type: "activity_recency", impact: 8, description: "Sales activity within 5 days" });
  } else if (daysInactive <= 10) {
    score -= 10;
    factors.push({ type: "inactivity", impact: -10, description: `No sales activity for ${daysInactive} days` });
    if (-10 < minImpact) {
      minImpact = -10;
      topNegativeType = "inactivity";
    }
  } else {
    score -= 20;
    factors.push({ type: "inactivity", impact: -20, description: `Prolonged inactivity for ${daysInactive} days` });
    if (-20 < minImpact) {
      minImpact = -20;
      topNegativeType = "inactivity";
    }
  }

  // 5. Factor 2: Overdue Tasks
  if (overdueTasksCount === 1) {
    score -= 10;
    factors.push({ type: "overdue_tasks", impact: -10, description: "1 overdue follow-up task" });
    if (-10 < minImpact) {
      minImpact = -10;
      topNegativeType = "overdue_tasks";
    }
  } else if (overdueTasksCount === 2) {
    score -= 20;
    factors.push({ type: "overdue_tasks", impact: -20, description: "2 overdue follow-up tasks" });
    if (-20 < minImpact) {
      minImpact = -20;
      topNegativeType = "overdue_tasks";
    }
  } else if (overdueTasksCount >= 3) {
    score -= 30;
    factors.push({ type: "overdue_tasks", impact: -30, description: `${overdueTasksCount} overdue follow-up tasks` });
    if (-30 < minImpact) {
      minImpact = -30;
      topNegativeType = "overdue_tasks";
    }
  }

  // 6. Factor 3: Stage Stagnation
  if (lead.stage === "negotiation") {
    if (daysInStage > 14) {
      score -= 20;
      factors.push({
        type: "stage_stagnation",
        impact: -20,
        description: `Negotiation stalled for ${daysInStage} days without closing`,
      });
      if (-20 < minImpact) {
        minImpact = -20;
        topNegativeType = "stalled_negotiation";
      }
    } else if (daysInStage > 7) {
      score -= 10;
      factors.push({
        type: "stage_stagnation",
        impact: -10,
        description: `Negotiation ongoing for ${daysInStage} days`,
      });
      if (-10 < minImpact) {
        minImpact = -10;
        topNegativeType = "stalled_negotiation";
      }
    }
  } else if (lead.stage === "site_visit") {
    if (daysInStage > 10) {
      score -= 15;
      factors.push({
        type: "stage_stagnation",
        impact: -15,
        description: `Site visit stage pending for ${daysInStage} days without progression`,
      });
      if (-15 < minImpact) {
        minImpact = -15;
        topNegativeType = "stalled_site_visit";
      }
    } else if (daysInStage > 5) {
      score -= 5;
      factors.push({
        type: "stage_stagnation",
        impact: -5,
        description: `Site visit pending for ${daysInStage} days`,
      });
      if (-5 < minImpact) {
        minImpact = -5;
        topNegativeType = "stalled_site_visit";
      }
    }
  } else if (["new", "contacted"].includes(lead.stage)) {
    if (daysInStage > 7) {
      score -= 15;
      factors.push({
        type: "stage_stagnation",
        impact: -15,
        description: `Initial outreach stalled for ${daysInStage} days`,
      });
      if (-15 < minImpact) {
        minImpact = -15;
        topNegativeType = "stalled_outreach";
      }
    }
  } else {
    if (daysInStage > 15) {
      score -= 10;
      factors.push({
        type: "stage_stagnation",
        impact: -10,
        description: `In ${lead.stage.replace(/_/g, " ")} stage for ${daysInStage} days`,
      });
      if (-10 < minImpact) {
        minImpact = -10;
        topNegativeType = "stage_stagnation";
      }
    }
  }

  // 7. Factor 4: Positive Sales Signals
  if (recentSiteVisit) {
    score += 15;
    factors.push({ type: "recent_site_visit", impact: 15, description: "Site visit completed in last 7 days" });
  }

  if (recentInboundResponse) {
    score += 10;
    factors.push({ type: "buyer_engagement", impact: 10, description: "Inbound buyer response in last 48 hours" });
  }

  if (upcomingTasksCount > 0 && overdueTasksCount === 0) {
    score += 5;
    factors.push({ type: "scheduled_followup", impact: 5, description: "Future follow-up scheduled" });
  }

  if (recentBookingOrMeeting) {
    score += 10;
    factors.push({ type: "commercial_progress", impact: 10, description: "Recent booking/meeting progress" });
  }

  // 8. Clamp Score: 0 <= score <= 100
  score = Math.max(0, Math.min(100, score));

  // 9. Determine Status
  let status: DealHealth;
  if (score >= 80) {
    status = "strong";
  } else if (score >= 50) {
    status = "neutral";
  } else {
    status = "at_risk";
  }

  // 10. Generate Primary Reason & Recommended Action
  let reason: string;
  let recommendedAction: string;

  if (status === "at_risk") {
    if (topNegativeType === "inactivity") {
      reason = `No sales activity for ${daysInactive} days.`;
      recommendedAction = "Contact the buyer today via phone or WhatsApp to re-engage interest.";
    } else if (topNegativeType === "overdue_tasks") {
      reason = `${overdueTasksCount} overdue follow-up task${overdueTasksCount > 1 ? "s" : ""}.`;
      recommendedAction = "Complete the overdue follow-up tasks immediately.";
    } else if (topNegativeType === "stalled_negotiation") {
      reason = `Negotiation stalled for ${daysInStage} days without movement.`;
      recommendedAction = "Review pricing and payment milestones with the manager and schedule a closing call.";
    } else if (topNegativeType === "stalled_site_visit") {
      reason = `Site visit pending for ${daysInStage} days without follow-up.`;
      recommendedAction = "Follow up on the site visit to capture buyer feedback and share inventory cost sheet.";
    } else if (topNegativeType === "stalled_outreach") {
      reason = `Initial outreach stalled for ${daysInStage} days.`;
      recommendedAction = "Attempt direct phone contact and share the verified project dossier.";
    } else {
      reason = "Deal has low momentum across activity and task cadence.";
      recommendedAction = "Schedule an immediate check-in call with the buyer.";
    }
  } else if (status === "strong") {
    reason = "High momentum: active engagement with zero overdue tasks.";
    recommendedAction = "Maintain regular communication and guide the buyer toward agreement and unit booking.";
  } else {
    reason = "Active deal with standard progression cadence.";
    recommendedAction = "Follow the standard stage progression and execute scheduled tasks on time.";
  }

  return {
    score,
    status,
    reason,
    factors,
    recommendedAction,
    calculatedAt,
  };
}
