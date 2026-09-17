export type DealerType = "cfa" | "stockist" | "dealer" | "retailer" | "sub_dealer";
export type DealerStatus = "active" | "dormant" | "blocked" | "new";

export interface Dealer {
  id: string;
  orgId: string;
  dealerCode: string;
  name: string;
  dealerType: DealerType;
  parentDealerId?: string;
  parentDealerName?: string;
  regionId?: string;
  state?: string;
  district?: string;
  taluka?: string;
  beat?: string;
  salespersonId?: string;
  salespersonName?: string;
  phone?: string;
  gstin?: string;
  address?: string;
  city?: string;
  status: DealerStatus;
  createdAt: string;
  updatedAt?: string;
  // computed
  outstanding?: number;
  creditUsedPct?: number;
  daysSinceLastOrder?: number;
  buckets?: string[];
}

export type SiteType = "ihb" | "builder" | "infra" | "government";
export type SiteStage = "excavation" | "foundation" | "structure" | "finishing" | "roof";
export type SiteStatus = "active" | "completed" | "dormant";

export interface ConstructionSite {
  id: string;
  orgId: string;
  siteName: string;
  address?: string;
  gpsLat?: number;
  gpsLng?: number;
  siteType: SiteType;
  stage: SiteStage;
  estimatedTotalCementMt?: number;
  estimatedTotalBags?: number;
  currentBrand?: "ambuja" | "ultratech" | "acc" | "other";
  ownerName?: string;
  ownerPhone?: string;
  contractorName?: string;
  contractorPhone?: string;
  masonName?: string;
  architectName?: string;
  responsibleSalespersonId?: string;
  dealerId?: string;
  lastVisitedAt?: string;
  nextVisitAt?: string;
  source?: "scouting" | "walkin" | "dealer_tip" | "other";
  status: SiteStatus;
  createdAt: string;
  updatedAt?: string;
}

export type ComplaintType = "late_delivery" | "short_quantity" | "damaged_bags" | "wrong_grade" | "rate_difference" | "quality_doubt" | "service_behaviour";
export type ComplaintStatus = "open" | "in_progress" | "resolved" | "closed";
export type ComplaintPriority = "low" | "medium" | "high";

export interface Complaint {
  id: string;
  orgId: string;
  caseNo: string;
  reportedByDealerId?: string;
  reportedByPhone?: string;
  siteId?: string;
  orderId?: string;
  dispatchChallanId?: string;
  complaintType: ComplaintType;
  description?: string;
  photoUrl?: string;
  assignedToUserId?: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  dueAt: string;
  resolvedAt?: string;
  closureNotes?: string;
  closurePhotoUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SalesTarget {
  id: string;
  orgId: string;
  periodMonth: string; // YYYY-MM-01
  targetMt: number;
  targetBags: number;
  level: "company" | "state" | "region" | "area" | "salesperson" | "dealer";
  levelId: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  // computed via RPC
  achievedBags?: number;
  achievedMt?: number;
  achievementPct?: number;
  pacePct?: number;
}

export interface DealerPerformance {
  dealerId: string;
  dealerName: string;
  dealerCode: string;
  dealerType: DealerType;
  mtSold: number;
  bagsSold: number;
  ordersCount: number;
  growthPct?: number;
  daysSinceLastOrder?: number;
  buckets: string[];
  creditUsedPct: number;
}

export interface CollectionsRow {
  dealerId: string;
  dealerName: string;
  dealerPhone?: string;
  outstanding: number;
  overdue: number;
  oldestDueDate?: string;
  daysOverdue: number;
  ageingBucket: string;
  assignedTso?: string;
}

export interface DealerSlab { minBags: number; maxBags: number | null; ratePerBag: number; }
export interface DealerScheme {
  id: string;
  orgId: string;
  dealerId?: string | null;
  periodMonth: string;
  name: string;
  slabs: DealerSlab[];
  createdAt: string;
  updatedAt?: string;
}
export interface SchemeAccrual {
  periodMonth: string;
  dealerId: string;
  dealerName?: string;
  slabs: DealerSlab[];
  achievedBags: number;
  currentRate: number;
  accruedAmount: number;
  nextSlabMin?: number | null;
  bagsToNext?: number | null;
  nextRate?: number | null;
}
