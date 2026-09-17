import { Lead, Project, ProjectUnit } from "../../types/crm";
import {
  MatchTier,
  ResurrectionCandidate,
  ResurrectionOpportunity,
  ResurrectionScanResult,
  ResurrectionScoreBreakdown,
} from "../../types/resurrection";

export interface MatchingWeights {
  projectWeight: number;
  budgetWeight: number;
  configWeight: number;
  floorWeight: number;
  facingWeight: number;
  recencyBonus: number;
}

export const DEFAULT_RESURRECTION_WEIGHTS: MatchingWeights = {
  projectWeight: 40,
  budgetWeight: 30,
  configWeight: 20,
  floorWeight: 5,
  facingWeight: 5,
  recencyBonus: 5,
};

/**
 * Normalizes configuration strings for robust deterministic matching
 */
export function normalizeConfiguration(configStr?: string | null): string {
  if (!configStr) return "";
  const cleaned = configStr.toLowerCase().replace(/[^a-z0-9+]/g, "");

  if (cleaned.includes("1bhk") || cleaned.includes("1bed") || cleaned.includes("studio")) return "1bhk";
  if (cleaned.includes("2bhk") || cleaned.includes("2bed")) return "2bhk";
  if (cleaned.includes("3bhk") || cleaned.includes("3bed")) return "3bhk";
  if (cleaned.includes("4bhk") || cleaned.includes("4bed") || cleaned.includes("penthouse")) return "4bhk";
  if (cleaned.includes("5bhk") || cleaned.includes("5bed")) return "5bhk";
  if (cleaned.includes("villa")) return "villa";
  if (cleaned.includes("plot")) return "plot";
  if (cleaned.includes("commercial") || cleaned.includes("retail") || cleaned.includes("office")) return "commercial";

  return cleaned;
}

/**
 * Determines match tier category from numerical total score
 */
export function getMatchTier(score: number): { tier: MatchTier; tierLabel: string } {
  if (score >= 90) return { tier: "excellent", tierLabel: "Excellent Match" };
  if (score >= 75) return { tier: "strong", tierLabel: "Strong Match" };
  if (score >= 60) return { tier: "possible", tierLabel: "Possible Match" };
  return { tier: "weak", tierLabel: "Weak Match" };
}

/**
 * Multi-Factor Scoring Engine for scoring an available unit against a buyer's requirements
 */
export function scoreUnitForLead(
  lead: Partial<Lead>,
  unit: Partial<ProjectUnit>,
  project?: Partial<Project> | null,
  weights: MatchingWeights = DEFAULT_RESURRECTION_WEIGHTS
): ResurrectionCandidate {
  const reasons: string[] = [];

  // 1. Project Match (40 pts)
  let projectScore = 0;
  const isExactProjectId = lead.projectId && unit.projectId && lead.projectId === unit.projectId;
  const isExactProjectName =
    lead.projectName &&
    project?.name &&
    lead.projectName.trim().toLowerCase() === project.name.trim().toLowerCase();

  const isSameRegion =
    lead.regionId &&
    project?.regionId &&
    lead.regionId === project.regionId;

  if (isExactProjectId || isExactProjectName) {
    projectScore = weights.projectWeight;
    reasons.push(`Exact preferred project match (${project?.name || lead.projectName})`);
  } else if (isSameRegion) {
    projectScore = Math.round(weights.projectWeight * 0.625); // 25 pts
    reasons.push(`Located in buyer's preferred regional territory (${project?.regionName || "Regional Hub"})`);
  } else if (!lead.projectId && !lead.projectName) {
    projectScore = Math.round(weights.projectWeight * 0.625); // 25 pts (neutral baseline)
    reasons.push(`Compatible inventory in active development portfolio`);
  } else {
    projectScore = 0;
    reasons.push(`Alternative project offering in ${project?.location || "prime corridor"}`);
  }

  // 2. Budget Fit (30 pts)
  let budgetScore = 0;
  const leadBudget = Number(lead.budget || 0);
  const unitPrice = Number(unit.price || 0);

  if (leadBudget <= 0) {
    budgetScore = Math.round(weights.budgetWeight * 0.5); // 15 pts neutral baseline
    reasons.push("Priced at transparent catalog pricing (no buyer budget constraint specified)");
  } else {
    const diffPct = ((unitPrice - leadBudget) / leadBudget) * 100;
    const absDiff = Math.abs(diffPct);

    if (absDiff <= 5) {
      budgetScore = weights.budgetWeight;
      reasons.push(
        diffPct <= 0
          ? `Unit price is ${Math.abs(diffPct).toFixed(1)}% below buyer budget`
          : `Unit price is within ${diffPct.toFixed(1)}% of buyer target budget`
      );
    } else if (absDiff <= 10) {
      budgetScore = Math.round(weights.budgetWeight * 0.833); // 25 pts
      reasons.push(
        diffPct <= 0
          ? `Unit price is ${Math.abs(diffPct).toFixed(1)}% below buyer budget`
          : `Unit is ${diffPct.toFixed(1)}% above buyer target budget (well within negotiation range)`
      );
    } else if (absDiff <= 15) {
      budgetScore = Math.round(weights.budgetWeight * 0.6); // 18 pts
      reasons.push(`Unit is ${Math.abs(diffPct).toFixed(1)}% ${diffPct < 0 ? "below" : "above"} target budget`);
    } else if (absDiff <= 20) {
      budgetScore = Math.round(weights.budgetWeight * 0.333); // 10 pts
      reasons.push(`Unit is ${diffPct.toFixed(1)}% above budget (${lead.lostReason === "budget_too_high" ? "stretches budget" : "flexible range"})`);
    } else {
      budgetScore = 0;
      reasons.push(`Unit price variance is ${diffPct.toFixed(1)}% from target budget`);
    }
  }

  // 3. Configuration Fit (20 pts)
  let configScore = 0;
  const leadConfigNorm = normalizeConfiguration(lead.configurationPreference);
  const unitConfigNorm = normalizeConfiguration(unit.configuration);

  if (!leadConfigNorm) {
    configScore = Math.round(weights.configWeight * 0.6); // 12 pts neutral baseline
    reasons.push(`Standard ${unit.configuration || "Luxury"} layout`);
  } else if (leadConfigNorm === unitConfigNorm) {
    configScore = weights.configWeight;
    reasons.push(`Exact ${unit.configuration} layout configuration`);
  } else if (
    (leadConfigNorm === "3bhk" && unitConfigNorm === "4bhk" && budgetScore >= 18) ||
    (leadConfigNorm === "2bhk" && unitConfigNorm === "3bhk" && budgetScore >= 18)
  ) {
    configScore = Math.round(weights.configWeight * 0.75); // 15 pts upgrade
    reasons.push(`Upgraded ${unit.configuration} configuration fitting target budget`);
  } else {
    configScore = 0;
    reasons.push(`Alternative ${unit.configuration} configuration`);
  }

  // 4. Floor Preference (5 pts)
  let floorScore = 0;
  const floorPref = (lead.preferredFloor || "").toLowerCase().trim();
  const unitFloor = Number(unit.floor || 1);

  if (!floorPref) {
    floorScore = weights.floorWeight; // 5 pts neutral baseline
  } else if (
    ((floorPref.includes("high") || floorPref.includes("top")) && unitFloor >= 12) ||
    ((floorPref.includes("mid") || floorPref.includes("middle")) && unitFloor >= 5 && unitFloor <= 11) ||
    ((floorPref.includes("low") || floorPref.includes("ground")) && unitFloor >= 1 && unitFloor <= 4)
  ) {
    floorScore = weights.floorWeight;
    reasons.push(`Preferred floor height (Floor ${unitFloor})`);
  } else if (/^\d+$/.test(floorPref) && Number(floorPref) === unitFloor) {
    floorScore = weights.floorWeight;
    reasons.push(`Exact preferred floor (Floor ${unitFloor})`);
  } else if (
    ((floorPref.includes("high") || floorPref.includes("top")) && unitFloor >= 5 && unitFloor <= 11) ||
    ((floorPref.includes("low") || floorPref.includes("ground")) && unitFloor >= 5 && unitFloor <= 11) ||
    ((floorPref.includes("mid") || floorPref.includes("middle")) && (unitFloor >= 12 || unitFloor <= 4))
  ) {
    floorScore = Math.round(weights.floorWeight * 0.6); // 3 pts adjacent
    reasons.push(`Adjacent floor level (Floor ${unitFloor})`);
  } else {
    floorScore = 0;
  }

  // 5. Facing Preference (5 pts)
  let facingScore = 0;
  const facingPref = (lead.facingPreference || "").toLowerCase().trim();
  const unitFacing = (unit.facing || "").toLowerCase().trim();

  if (!facingPref) {
    facingScore = weights.facingWeight; // 5 pts neutral
  } else if (unitFacing && facingPref && (unitFacing.includes(facingPref) || facingPref.includes(unitFacing))) {
    facingScore = weights.facingWeight;
    reasons.push(`Preferred ${unit.facing} orientation`);
  } else if (
    (facingPref.includes("east") && unitFacing.includes("north")) ||
    (facingPref.includes("park") && unitFacing.includes("green"))
  ) {
    facingScore = Math.round(weights.facingWeight * 0.6); // 3 pts
    reasons.push(`Compatible ${unit.facing || "scenic"} orientation`);
  } else {
    facingScore = 0;
  }

  // 6. Recency Bonus (+5 pts)
  let recencyBonus = 0;
  const unitCreatedAt = unit.createdAt ? new Date(unit.createdAt).getTime() : 0;
  const isRecent = unitCreatedAt > 0 && Date.now() - unitCreatedAt <= 14 * 86400000;
  if (isRecent) {
    recencyBonus = weights.recencyBonus;
    reasons.push("Newly released inventory release (priority allotment)");
  }

  const rawTotal = projectScore + budgetScore + configScore + floorScore + facingScore + recencyBonus;
  const total = Math.min(100, Math.max(0, rawTotal));
  const { tier, tierLabel } = getMatchTier(total);

  const breakdown: ResurrectionScoreBreakdown = {
    total,
    project: projectScore,
    budget: budgetScore,
    configuration: configScore,
    floor: floorScore,
    facing: facingScore,
    recency: recencyBonus,
    tier,
    tierLabel,
  };

  return {
    unit: {
      id: unit.id || "",
      projectId: unit.projectId || project?.id || "",
      projectName: project?.name || lead.projectName || "Development Project",
      location: project?.location || "Prime Location",
      tower: unit.tower || "Tower 1",
      unitNumber: unit.unitNumber || "101",
      floor: unitFloor,
      configuration: unit.configuration || "3 BHK Luxury",
      superAreaSqFt: Number(unit.superAreaSqFt || 1850),
      price: unitPrice,
      facing: unit.facing || null,
      status: unit.status || "available",
    },
    score: breakdown,
    reasons,
  };
}

/**
 * Finds and ranks candidate units for a single lead in-memory
 */
export function findTopResurrectionCandidates(
  lead: Partial<Lead>,
  availableUnits: Partial<ProjectUnit>[],
  projects: Partial<Project>[],
  limit = 5,
  minScore = 60
): ResurrectionCandidate[] {
  const projectMap = new Map<string, Partial<Project>>();
  projects.forEach((p) => {
    if (p.id) projectMap.set(p.id, p);
  });

  const candidates: ResurrectionCandidate[] = [];

  for (const unit of availableUnits) {
    if (unit.status !== "available") continue;
    if (unit.orgId && lead.orgId && unit.orgId !== lead.orgId) continue;

    const project = unit.projectId ? projectMap.get(unit.projectId) : null;
    const candidate = scoreUnitForLead(lead, unit, project);

    if (candidate.score.total >= minScore) {
      candidates.push(candidate);
    }
  }

  return candidates
    .sort((a, b) => b.score.total - a.score.total || a.unit.price - b.unit.price)
    .slice(0, limit);
}

/**
 * In-memory fallback scan for offline / simulated environment
 */
export function scanResurrectionOpportunitiesInMemory(
  leads: Lead[],
  units: ProjectUnit[],
  projects: Project[],
  daysThreshold = 14,
  minScore = 60,
  force = false
): ResurrectionScanResult {
  const eligibleLeads = leads.filter((l) => {
    if (l.stage === "won") return false;
    const isStaleOrLost = l.stage === "lost" || l.daysInStage >= daysThreshold;
    if (!isStaleOrLost) return false;
    if (!force && l.lostReason && ["opted_out", "do_not_contact", "unsubscribed"].includes(l.lostReason)) {
      return false;
    }
    if (!force && l.lastResurrectedAt) {
      const msSince = Date.now() - new Date(l.lastResurrectedAt).getTime();
      if (msSince < 30 * 86400000) return false;
    }
    return true;
  });

  const opportunities: ResurrectionOpportunity[] = [];

  for (const lead of eligibleLeads) {
    const candidates = findTopResurrectionCandidates(lead, units, projects, 3, minScore);
    if (candidates.length > 0) {
      opportunities.push({
        leadId: lead.id,
        personName: lead.personName,
        phone: lead.phone,
        email: lead.email || null,
        projectName: lead.projectName,
        budget: lead.budget,
        configurationPreference: lead.configurationPreference || null,
        currentStage: lead.stage,
        daysInactive: lead.daysInStage,
        lostReason: lead.lostReason || null,
        lostAt: lead.lostAt || null,
        lastResurrectedAt: lead.lastResurrectedAt || null,
        salespersonId: lead.salespersonId || null,
        salespersonName: lead.salespersonName || null,
        topCandidate: candidates[0],
        candidateCount: candidates.length,
        allCandidates: candidates,
        bestMatchScore: candidates[0].score.total,
        bestMatchTier: candidates[0].score.tier,
      });
    }
  }

  opportunities.sort((a, b) => b.bestMatchScore - a.bestMatchScore || b.budget - a.budget);

  return {
    scannedCount: eligibleLeads.length,
    matchedCount: opportunities.length,
    opportunities,
  };
}
