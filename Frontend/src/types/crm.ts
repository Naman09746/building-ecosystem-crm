export type UserRole = "owner" | "admin" | "boss" | "manager" | "salesperson" | "closer";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan?: "starter" | "growth" | "enterprise";
  reactivationDays?: number;
}

export interface Region {
  id: string;
  orgId: string;
  name: string;
  code: string;
  activeLeadsCount?: number;
}

export interface PropertyArea {
  id: string;
  orgId: string;
  regionId?: string;
  regionName?: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  pincode?: string;
  tier?: "luxury" | "ultra_luxury" | "premium" | "affordable";
  description?: string;
  societiesCount?: number;
  activeUnitsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  orgId: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  regionId?: string; // Salesperson/Manager assignment
  regionName?: string;
  avatarUrl?: string;
  followUpCompletionRate?: number;
  avgResponseTimeHours?: number;
}

export type ProjectContactRole =
  | "owner"
  | "builder"
  | "architect"
  | "engineer"
  | "guard"
  | "channel_partner"
  | "other";

export interface ProjectContact {
  id: string;
  orgId?: string;
  projectId?: string;
  personId?: string;
  name: string;
  role: ProjectContactRole | string;
  phone: string;
  notes?: string;
}

export interface ProjectTower {
  id: string;
  orgId: string;
  projectId: string;
  projectName?: string;
  name: string;
  towerCode?: string;
  totalFloors: number;
  unitsPerFloor?: number;
  elevatorsCount?: number;
  possessionDate?: string;
  constructionStatus?: "under_construction" | "ready" | "launching";
  facingDirection?: string;
  notes?: string;
  totalUnitsCount?: number;
  availableUnitsCount?: number;
  resaleUnitsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type UnitStatus =
  | "available"
  | "hold"
  | "site_visit"
  | "negotiation"
  | "booked"
  | "sold";

export type UnitType =
  | "apartment"
  | "penthouse"
  | "villa"
  | "builder_floor"
  | "duplex"
  | "plot"
  | "commercial";

export type OccupancyStatus =
  | "owner_occupied"
  | "rented"
  | "vacant"
  | "under_fitout"
  | "unknown";

export type SellerIntent =
  | "actively_selling"
  | "soft_testing_market"
  | "willing_to_sell_at_price"
  | "not_selling"
  | "distress_sale"
  | "unknown";

export type ListingStatus =
  | "unlisted"
  | "exclusive_mandate"
  | "open_market"
  | "private_pocket"
  | "off_market";

export type VerificationStatus =
  | "verified"
  | "unverified"
  | "stale"
  | "disputed"
  | "historical"
  | "user_reported"
  | "inferred";

export interface ProjectUnit {
  id: string;
  orgId: string;
  projectId: string;
  projectName: string;
  towerId?: string;
  tower: string;
  unitNumber: string;
  floor: number;
  configuration: string;
  unitType?: UnitType;
  sizeSqFt: number;
  superAreaSqFt?: number;
  carpetAreaSqFt?: number;
  builtUpAreaSqFt?: number;
  balconiesCount?: number;
  bathroomsCount?: number;
  parkingSlots?: number;
  parkingType?: "covered" | "open" | "basement_stack" | "none";
  isCornerUnit?: boolean;
  furnishingStatus?: "unfurnished" | "semi_furnished" | "fully_furnished" | "bare_shell";
  physicalCondition?: "brand_new" | "excellent" | "good" | "needs_renovation";
  viewType?: string;
  
  // Commercial
  price: number;
  askingPrice?: number;
  estimatedMarketPrice?: number;
  lastTransactedPrice?: number;
  lastTransactedDate?: string;
  maintenanceMonthly?: number;
  expectedMonthlyRent?: number;
  rentalYieldPct?: number;

  // Status & Resale
  status: UnitStatus;
  occupancyStatus?: OccupancyStatus;
  sellerIntent?: SellerIntent;
  sellerTargetTimeline?: string;
  listingStatus?: ListingStatus;
  verificationStatus?: VerificationStatus;
  lastVerifiedAt?: string;
  verifiedByUserId?: string;
  keyLocation?: string;
  unitAmenities?: string[];
  notes?: string;

  // CRM Assignment
  assignedLeadId?: string;
  assignedLeadName?: string;
  assignedLeadPhone?: string;
  assignedBuyerName?: string;
  facing?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  developer: string;
  location: string;
  regionId: string;
  regionName: string;
  areaId?: string;
  areaName?: string;
  societyType?: "gated_community" | "high_rise" | "luxury_township" | "builder_floors" | "commercial_hub" | "mixed_use";
  totalTowers?: number;
  totalUnitsCount?: number;
  possessionYear?: number;
  gatedSecurityType?: "24x7_guards" | "3_tier" | "biometric_smart" | "unrestricted";
  reraRegistrationNumber?: string;
  masterAmenities?: string[];
  maintenanceContactPhone?: string;
  societyOfficeAddress?: string;
  priceRange: string;
  status: "active" | "launching_soon" | "completed";
  activeLeadsCount: number;
  siteVisitsCount: number;
  totalUnits?: number;
  availableUnitsCount?: number;
  bookedUnitsCount?: number;
  resaleOpportunitiesCount?: number;
  contacts?: ProjectContact[];
  towers?: ProjectTower[];
}

export interface Person {
  id: string;
  orgId: string;
  name: string;
  phone: string;
  phoneNormalized?: string;
  email?: string;
  city?: string;
  source?: string;
  regionId?: string;
  regionName?: string;
  associatedProjectNames?: string[];
  preferredConfiguration?: string;
  budget?: number;
  occupation?: string;
  address?: string;
  vipTier?: "standard" | "hni" | "ultra_hni" | "investor" | "nri";
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

export type OrgType =
  | "developer"
  | "rwa"
  | "property_management"
  | "brokerage"
  | "architect"
  | "contractor"
  | "law_firm"
  | "channel_partner"
  | "vendor"
  | "other";

export interface ExternalOrganization {
  id: string;
  orgId: string;
  name: string;
  orgType: OrgType;
  phone?: string;
  email?: string;
  website?: string;
  officeAddress?: string;
  city?: string;
  gstin?: string;
  reraId?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SubjectType = "person" | "organization" | "user" | "lead";
export type TargetType = "unit" | "project" | "person" | "organization";

export type RelationshipType =
  | "owns"
  | "current_owner"
  | "co_owns"
  | "previous_owner"
  | "previously_owned"
  | "rents"
  | "current_tenant"
  | "previously_rented"
  | "investor_in"
  | "power_of_attorney"
  | "caretaker"
  | "rwa_president"
  | "rwa_secretary"
  | "rwa_treasurer"
  | "rwa_member"
  | "facility_manager"
  | "society_guard"
  | "estate_manager"
  | "exclusive_broker"
  | "channel_partner_for"
  | "representing_seller"
  | "representing_buyer"
  | "works_for"
  | "contractor_for"
  | "developed_by"
  | "architect_of"
  | "constructed_by"
  | "managed_by"
  | "family_member_of"
  | "referred_by"
  | "primary_contact_for"
  | "other";

export interface EntityRelationship {
  id: string;
  orgId: string;
  subjectType: SubjectType;
  subjectId: string;
  subjectName?: string;
  subjectPhone?: string;
  relationshipType: RelationshipType;
  targetType: TargetType;
  targetId: string;
  targetName?: string;
  validFrom?: string;
  validUntil?: string;
  isCurrent: boolean;
  confidenceScore: number;
  verificationStatus: VerificationStatus;
  provenanceSource: string;
  verifiedAt?: string;
  verifiedBy?: string;
  commercialTerms?: Record<string, any>;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export type FactCategory =
  | "visitor_access_rules"
  | "society_regulations"
  | "owner_preferences"
  | "pricing_intelligence"
  | "neighbourhood_context"
  | "construction_quality"
  | "amenity_status"
  | "legal_rera_status"
  | "general";

export type FactVerificationTier =
  | "verified"
  | "historical"
  | "user_provided"
  | "inferred"
  | "unknown";

export interface PropertyFact {
  id: string;
  orgId: string;
  entityType: "project" | "tower" | "unit" | "area";
  entityId: string;
  category: FactCategory;
  title: string;
  factStatement: string;
  verificationTier: FactVerificationTier;
  confidencePct: number;
  sourceReference?: string;
  expiresAt?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UnitPriceHistory {
  id: string;
  orgId: string;
  unitId: string;
  eventType: "asking_price_change" | "market_valuation_update" | "transaction_closed" | "circle_rate_revision" | "rental_change";
  oldPrice?: number;
  newPrice: number;
  pricePerSqFt?: number;
  source?: string;
  notes?: string;
  effectiveDate: string;
  recordedBy?: string;
  createdAt: string;
}

export interface SearchResultItem {
  id: string;
  entityType: "unit" | "project" | "person" | "organization" | "lead";
  title: string;
  subtitle: string;
  status?: string;
  badge?: string;
  url?: string;
  score?: number;
  metadata?: Record<string, any>;
}

export type PipelineStage =
  | "new"
  | "contacted"
  | "qualified"
  | "site_visit"
  | "negotiation"
  | "won"
  | "lost";

export interface PipelineStageConfig {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  sortOrder: number;
  color?: string;
}

export type DealHealth = "strong" | "neutral" | "at_risk";
export type LeadScoreLabel = "Hot" | "Warm" | "Cold";

export interface DealHealthFactor {
  type: string;
  impact: number;
  description: string;
}

export interface Lead {
  id: string;
  orgId: string;
  personId: string;
  personName: string;
  phone: string;
  phoneNormalized?: string;
  email?: string;
  projectId: string;
  projectName: string;
  regionId: string;
  regionName: string;
  salespersonId: string;
  salespersonName: string;
  budget: number; // in INR
  stage: PipelineStage;
  stageId?: string;
  source: string;
  dealType?: "primary_sale" | "resale" | "rental" | "investor_exit";
  leadScore: number; // e.g. 92
  leadScoreLabel: LeadScoreLabel; // "Hot" | "Warm" | "Cold"
  dealHealth: DealHealth; // "strong" | "neutral" | "at_risk"
  dealHealthScore?: number; // 0 to 100
  dealHealthReason?: string; // e.g. "No activity for 4 days"
  dealHealthFactors?: DealHealthFactor[];
  dealHealthRecommendedAction?: string;
  dealHealthCalculatedAt?: string;
  recommendedAction?: string; // e.g. "Send Tower C vs D floor-plan comparison"
  configurationPreference?: string; // e.g. "3 BHK + Servant"
  preferredFloor?: string; // e.g. "High floor (12 - 18)"
  facingPreference?: string; // e.g. "North-East / Park Facing"
  parkingRequirement?: string; // e.g. "2 Covered Car Parks"
  buyerIntent?: string; // e.g. "End-User (Primary Residence)"
  decisionMakers?: string; // e.g. "Buyer & Spouse"
  buyingSignals?: string[]; // e.g. ["Budget verified", "Unit shortlisted", "Family involved"]
  objections?: string[]; // e.g. ["Price", "Floor rise"]
  lastConversationSummary?: string; // e.g. "Customer prefers 3 BHK + servant, comparing Tower C vs D. Price is the main concern."
  suggestedNextMove?: string; // e.g. "Send Tower C vs D comparison and payment schedule."
  assignedUnitId?: string;
  assignedUnitNumber?: string;
  unitId?: string; // Dedicated FK to project_units
  daysInStage: number;
  stageEnteredAt?: string;
  lastActivityText: string;
  lastActivityAt: string;
  nextFollowUpAt?: string;
  followUpStatus?: "due_today" | "upcoming" | "overdue" | "completed";
  lostAt?: string;
  lostReason?: string;
  lastResurrectedAt?: string;
  resurrectionCount?: number;
  notes?: string;
  createdAt: string;
}

export type ActivityType =
  | "call"
  | "meeting"
  | "site_visit"
  | "whatsapp"
  | "note"
  | "stage_change"
  | "booking"
  | "ai_agent";

export type CallOutcome =
  | "interested"
  | "site_visit_booked"
  | "call_back"
  | "not_interested"
  | "ringing_no_response"
  | "wrong_number";

export interface Activity {
  id: string;
  orgId: string;
  leadId: string;
  projectId?: string;
  unitId?: string;
  personId?: string;
  personName: string;
  userId: string;
  userName: string;
  type: ActivityType;
  durationSeconds?: number;
  outcome?: CallOutcome;
  outcomeLabel?: string;
  notes?: string;
  scheduledFollowUpAt?: string;
  occurredAt?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  orgId: string;
  leadId: string;
  personName: string;
  phone: string;
  projectName: string;
  salespersonId: string;
  salespersonName: string;
  title: string;
  dueDate: string;
  dueTime?: string;
  status: "due_today" | "upcoming" | "overdue" | "completed";
  priority: "high" | "medium" | "low";
  createdFromActivityId?: string;
}

export interface CRMDocument {
  id: string;
  orgId: string;
  projectId?: string;
  leadId?: string;
  title: string;
  fileUrl: string;
  type: "brochure" | "floor_plan" | "cost_sheet" | "kyc" | "agreement" | "photo" | "other";
  createdAt: string;
}

export interface AuditLog {
  id: string;
  orgId: string;
  userId: string;
  userName: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details: string;
  timestamp: string;
}

export interface TeamInvitation {
  id: string;
  orgId: string;
  email: string;
  role: string;
  regionId?: string;
  regionName?: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  createdAt: string;
}

export type SellerSignalType =
  | "tenancy_expiring"
  | "vacant_unit"
  | "investor_exit_window"
  | "valuation_request"
  | "repeated_price_enquiry"
  | "market_comp_transacted"
  | "distress_indicator"
  | "manual_prospect";

export type SellerOpportunityStatus =
  | "detected"
  | "assigned"
  | "contacted"
  | "valuation_presented"
  | "mandate_secured"
  | "dismissed"
  | "listed";

export type SellerOpportunityUrgency = "low" | "medium" | "high" | "urgent";

export interface SellerOpportunity {
  id: string;
  orgId: string;
  unitId: string;
  unitTitle?: string;
  projectName?: string;
  tower?: string;
  unitNumber?: string;
  ownerId?: string;
  ownerName?: string;
  ownerPhone?: string;
  signalType: SellerSignalType;
  signalStrength: number; // 0 to 100
  estimatedValuation?: number;
  suggestedPitch?: string;
  urgency: SellerOpportunityUrgency;
  status: SellerOpportunityStatus;
  assignedToUserId?: string;
  assignedToUserName?: string;
  aiRationale?: string;
  metadata?: Record<string, any>;
  lastContactedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SiteVisitBriefing {
  id: string;
  orgId: string;
  leadId: string;
  leadName?: string;
  leadPhone?: string;
  unitId: string;
  unitTitle?: string;
  societyName?: string;
  activityId?: string;
  scheduledAt: string;
  gateAccessProtocol?: string;
  parkingInstructions?: string;
  ownerExpectationsSummary?: string;
  buyerPreferencesSummary?: string;
  previousObjections?: string[];
  talkingPoints?: string[];
  generatedByAi?: boolean;
  viewedBySalespersonAt?: string;
  createdAt: string;
}

export interface StructuredMeetingDisposition {
  activityType: ActivityType;
  outcome: CallOutcome;
  outcomeLabel: string;
  suggestedStage: PipelineStage;
  sentiment: "bullish" | "cautious" | "hesitant" | "negative";
  budgetConfirmed?: number;
  extractedObjections: string[];
  buyingSignals: string[];
  conversationSummary: string;
  suggestedNextMove: string;
  suggestedFollowUpAt?: string;
  requiresHumanApproval: boolean;
}

