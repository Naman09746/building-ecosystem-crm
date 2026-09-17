export type MatchTier = "excellent" | "strong" | "possible" | "weak" | "none";

export interface ResurrectionScoreBreakdown {
  total: number;
  project: number;
  budget: number;
  configuration: number;
  floor: number;
  facing: number;
  recency: number;
  tier: MatchTier;
  tierLabel: string;
}

export interface MatchedUnitDetails {
  id: string;
  projectId: string;
  projectName: string;
  location: string;
  tower: string;
  unitNumber: string;
  floor: number;
  configuration: string;
  superAreaSqFt: number;
  price: number;
  facing: string | null;
  status: string;
}

export interface ResurrectionCandidate {
  unit: MatchedUnitDetails;
  score: ResurrectionScoreBreakdown;
  reasons: string[];
}

export interface ResurrectionOpportunity {
  leadId: string;
  personName: string;
  phone: string;
  email: string | null;
  projectName: string | null;
  budget: number;
  configurationPreference: string | null;
  currentStage: string;
  daysInactive: number;
  lostReason: string | null;
  lostAt: string | null;
  lastResurrectedAt: string | null;
  salespersonId: string | null;
  salespersonName: string | null;
  topCandidate: ResurrectionCandidate | null;
  candidateCount: number;
  allCandidates: ResurrectionCandidate[];
  bestMatchScore: number;
  bestMatchTier: MatchTier;
}

export interface ResurrectionScanResult {
  scannedCount: number;
  matchedCount: number;
  opportunities: ResurrectionOpportunity[];
}

export interface ResurrectionExecuteResult {
  success: boolean;
  leadId: string;
  stage: string;
  taskId: string;
  activityId: string;
  healthScore: number;
  dealHealth: string;
}
