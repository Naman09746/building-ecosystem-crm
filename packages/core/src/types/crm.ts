import type { EcosystemVertical, ComplexityMode } from "./ecosystem";

export type UserRole = "owner" | "manager" | "salesperson";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan?: "starter" | "growth" | "enterprise";
  reactivationDays?: number;
  industry?: EcosystemVertical;
  complexityMode?: ComplexityMode;
  verticalSettings?: Record<string, unknown>;
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
  | "urgent_liquidation"
  | "evaluating_market"
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

export type WealthTier = "uhni" | "hni" | "mass_affluent" | "retail" | "institutional";
export type KycStatus = "verified" | "pending" | "exempt" | "rejected";

export interface Person {
  id: string;
  orgId: string;
  name: string;
  fullName?: string;
  phone: string;
  primaryPhone?: string;
  phoneNormalized?: string;
  secondaryPhone?: string;
  whatsappNumber?: string;
  email?: string;
  secondaryEmail?: string;
  avatarUrl?: string;
  preferredLanguage?: string;
  nationality?: string;
  isNri?: boolean;
  residentCity?: string;
  city?: string;
  residentAddress?: string;
  address?: string;
  panNumber?: string;
  aadhaarLast4?: string;
  kycStatus?: KycStatus;
  kycVerifiedAt?: string;
  wealthTier?: WealthTier;
  vipTier?: "standard" | "hni" | "ultra_hni" | "investor" | "nri" | string;
  occupation?: string;
  primaryProfession?: string;
  companyName?: string;
  designation?: string;
  primaryTags?: string[];
  tags?: string[];
  notes?: string;
  isVip?: boolean;
  doNotContact?: boolean;
  source?: string;
  budget?: number;
  regionId?: string;
  regionName?: string;
  preferredConfiguration?: string;
  associatedProjectNames?: string[];
  createdBy?: string;
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

// ====================================================================
// ENTERPRISE DOMAIN MODEL (MIGRATION 0020)
// ====================================================================

export type PropertyCategory = "residential" | "commercial" | "plot_land" | "penthouse" | "farmhouse" | "retail";
export type TransactionIntent = "self_use" | "long_term_investment" | "rental_yield" | "upgrade" | "downsizing" | "relocation";
export type TimelineUrgency = "immediate_7_days" | "30_days" | "3_months" | "6_months" | "flexible";

export interface BuyerRequirement {
  id: string;
  orgId: string;
  leadId?: string;
  personId: string;
  propertyCategory: PropertyCategory;
  transactionIntent: TransactionIntent;
  marketSegment: "primary_builder" | "secondary_resale" | "rental_lease" | "both";
  budgetMin: number;
  budgetPreferred: number;
  budgetMax: number;
  fundingSource: "self_funded" | "bank_loan" | "part_liquidation" | "unknown";
  configurations: string[];
  carpetAreaMinSqft?: number;
  carpetAreaMaxSqft?: number;
  superAreaMinSqft?: number;
  superAreaMaxSqft?: number;
  preferredFloors: "any" | "ground" | "low_1_5" | "mid_6_15" | "high_16_plus" | "penthouse_top";
  facingDirections?: string[];
  viewPreferences?: string[];
  isVaastuCompliantMandatory?: boolean;
  isCornerUnitPreferred?: boolean;
  servantRoomMandatory?: boolean;
  parkingSlotsRequired?: number;
  targetCities: string[];
  targetMicroMarkets?: string[];
  targetProjectIds?: string[];
  timelineUrgency: TimelineUrgency;
  confidenceScore: number; // 0 to 100
  isActive: boolean;
  lastVerifiedAt?: string;
  verifiedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ListingType = "exclusive_mandate" | "semi_exclusive" | "open_market" | "builder_direct" | "pocket_listing";
export type MandateListingStatus = "active" | "soft_hold" | "under_token" | "under_negotiation" | "sold" | "withdrawn" | "expired";

export interface PropertyListing {
  id: string;
  orgId: string;
  unitId: string;
  listingType: ListingType;
  listingStatus: MandateListingStatus;
  askingPrice: number;
  expectedPrice: number;
  minimumAcceptablePrice: number; // Sensitive price floor
  priceNegotiable: boolean;
  maintenanceChargesMonthly?: number;
  mandateStartDate: string;
  mandateEndDate: string;
  autoRenew: boolean;
  sellerBrokeragePct: number;
  buyerBrokeragePct: number;
  fixedCommissionAmount?: number;
  keysHeldBy: "agency_custody" | "society_guard" | "owner" | "tenant" | "caretaker";
  keyLocationDetails?: string;
  viewingNoticeRequired: "instant" | "2_hours" | "same_day" | "24_hours";
  gateVisitorInstructions?: string;
  portalSyndicationAllowed: boolean;
  socialMediaAllowed: boolean;
  photoVideoRightsVerified: boolean;
  ownerPersonId?: string;
  assignedAgentId?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface NegotiationRound {
  id: string;
  orgId: string;
  dealId: string;
  unitId: string;
  leadId: string;
  roundNumber: number;
  bidderType: "buyer_offer" | "seller_counter" | "mediator_compromise";
  offeredPrice: number;
  priceDeltaFromAsk?: number;
  proposedPaymentPlan: "down_payment" | "clp" | "subvention" | "flexi_50_50" | "custom";
  tokenAmountProposed?: number;
  tokenChequeAvailable: boolean;
  closingTimelineDays: number;
  specialConditions?: string[];
  furnishingInclusions?: string;
  carParksRequested?: number;
  roundStatus: "accepted" | "rejected" | "countered" | "pending_review" | "expired";
  rejectionReason?: string;
  recordedBy?: string;
  recordedAt: string;
}

export type DispatchStatus = "scheduled" | "confirmed" | "en_route" | "in_progress" | "completed" | "rescheduled" | "no_show" | "cancelled";

export interface SiteVisitDispatch {
  id: string;
  orgId: string;
  leadId: string;
  unitId: string;
  projectId: string;
  scheduledStart: string;
  scheduledEnd: string;
  assignedSalespersonId: string;
  backupSalespersonId?: string;
  gateEntryName: string;
  digitalVisitorPassPin?: string;
  visitorParkingBay?: string;
  towerElevatorAccessCard?: string;
  caretakerContactPhone?: string;
  buyerReconfirmed: boolean;
  ownerAccessCleared: boolean;
  keysVerified: boolean;
  costSheetPrinted: boolean;
  backupUnitsSelected?: string[];
  dispatchStatus: DispatchStatus;
  buyerFeedbackSentiment?: "loved_it" | "interested_needs_family" | "hesitant_on_price" | "disliked_layout" | "rejected";
  buyerLikedAspects?: string[];
  buyerObjections?: string[];
  offerDiscussed?: number;
  nextFollowupDate?: string;
  debriefNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type CommissionPaymentStatus = "unpaid" | "partially_paid" | "paid" | "overdue" | "written_off";

export interface CommissionLedger {
  id: string;
  orgId: string;
  dealId: string;
  unitId: string;
  finalTransactedValue: number;
  bookingDate: string;
  registrationDate?: string;
  buyerBrokeragePct: number;
  buyerBrokerageAmount: number;
  sellerBrokeragePct: number;
  sellerBrokerageAmount: number;
  totalGrossBrokerage: number;
  gstRatePct: number;
  gstAmount: number;
  tdsRatePct: number;
  tdsDeducted: number;
  netBrokerageReceivable: number;
  channelPartnerOrgId?: string;
  channelPartnerCommissionPct: number;
  channelPartnerPayout: number;
  salespersonUserId?: string;
  salespersonIncentivePct: number;
  salespersonIncentiveAmount: number;
  managerUserId?: string;
  managerOverridePct: number;
  managerOverrideAmount: number;
  companyNetRetention: number;
  invoiceNumber?: string;
  invoiceDate?: string;
  paymentStatus: CommissionPaymentStatus;
  amountCollected: number;
  outstandingBalance: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export * from "./commercial";
