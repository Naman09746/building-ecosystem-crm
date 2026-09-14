import { z } from "zod";

// ====================================================================
// ENTERPRISE ZOD VALIDATION SCHEMAS FOR ALL INBOUND DATA
// ====================================================================

// Indian E.164 phone regex or standard 10-digit format
export const phoneSchema = z
  .string()
  .min(10, "Phone number must be at least 10 digits")
  .max(16, "Phone number cannot exceed 16 characters")
  .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/, "Invalid telephone format");

// Safe identifier reference (UUID or alphanumeric slug/ID without injection chars)
export const idSchema = z
  .string()
  .min(1, "Identifier required")
  .max(100)
  .regex(/^[a-zA-Z0-9_.-]+$/, "Invalid identifier format");

// 1. Create Lead Payload Schema
export const createLeadSchema = z.object({
  personName: z.string().min(2, "Buyer name must be at least 2 characters").max(100),
  phone: phoneSchema,
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  projectId: idSchema,
  unitId: idSchema.optional().nullable(),
  budget: z.number().positive("Budget must be a positive number").max(10_000_000_000),
  stage: z.enum(["new", "contacted", "qualified", "site_visit", "negotiation", "won", "lost"]).default("new"),
  source: z.string().max(100).default("Website Inbound"),
  propertyType: z.string().max(100).default("Luxury Apartment"),
  dealType: z.enum(["primary_sale", "resale", "rental", "investor_exit"]).default("primary_sale"),
  configurationPreference: z.string().max(100).optional(),
  preferredFloor: z.string().max(50).optional(),
  facingPreference: z.string().max(50).optional(),
  timeline: z.string().max(100).optional(),
  assignedSalespersonId: idSchema.optional(),
  leadScore: z.number().min(0).max(100).default(75),
  leadScoreLabel: z.enum(["Hot", "Warm", "Cold"]).default("Warm"),
  dealHealth: z.enum(["strong", "neutral", "at_risk"]).default("neutral"),
  dealHealthReason: z.string().max(500).optional(),
  suggestedNextMove: z.string().max(500).optional(),
  assignedUnitNumber: z.string().max(50).optional(),
});

// 2. Update Lead Payload Schema
export const updateLeadSchema = createLeadSchema.partial().extend({
  lostReason: z.string().max(500).optional(),
});

// 3. Create Activity Log Schema (Immutable Audit)
export const createActivitySchema = z.object({
  leadId: idSchema.optional(),
  projectId: idSchema.optional(),
  unitId: idSchema.optional().nullable(),
  personId: idSchema.optional(),
  personName: z.string().max(200).optional(),
  type: z.enum(["call", "whatsapp", "meeting", "site_visit", "note", "stage_change", "ai_agent"]),
  outcome: z.string().max(100).optional(),
  outcomeLabel: z.string().max(100).optional(),
  notes: z.string().max(2000, "Notes cannot exceed 2000 characters"),
  durationSeconds: z.number().min(0).max(86_400).default(0),
  scheduledFollowUpAt: z.string().max(100).optional(),
  metadata: z.record(z.string().max(100), z.union([
    z.string().max(500),
    z.number(),
    z.boolean(),
    z.null(),
  ])).optional(),
});

// 3b. Lost-Lead Resurrection Scan Schema
export const resurrectScanSchema = z.object({
  leadId: idSchema.optional().nullable(),
  daysThreshold: z
    .number()
    .int("daysThreshold must be an integer")
    .min(1, "daysThreshold must be at least 1 day")
    .max(365, "daysThreshold cannot exceed 365 days")
    .default(14),
  minScore: z.number().int().min(0).max(100).default(60),
  limit: z.number().int().min(1).max(100).default(20),
  force: z.boolean().default(false),
});

export const executeResurrectionSchema = z.object({
  leadId: idSchema.optional(),
  leadIds: z.array(idSchema).optional(),
  unitId: idSchema.optional().nullable(),
  pitch: z.string().max(2000).optional(),
});

// 4. Create Task Schema
export const createTaskSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  assignedToUserId: z.string().min(1, "Assignee user ID is required"),
  title: z.string().min(3, "Task title must be at least 3 characters").max(255),
  dueAt: z.string().datetime().or(z.string().min(1)),
  dueTime: z.string().max(20).optional(),
  status: z.enum(["overdue", "due_today", "upcoming", "completed"]).default("upcoming"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
});

// 5. WhatsApp Cloud API Webhook Inbound Schema
export const whatsappWebhookSchema = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z.array(
    z.object({
      id: z.string(),
      changes: z.array(
        z.object({
          value: z.object({
            messaging_product: z.literal("whatsapp"),
            metadata: z.object({
              display_phone_number: z.string(),
              phone_number_id: z.string(),
            }),
            contacts: z.array(
              z.object({
                profile: z.object({
                  name: z.string(),
                }),
                wa_id: z.string(),
              })
            ).optional(),
            messages: z.array(
              z.object({
                from: z.string(),
                id: z.string(),
                timestamp: z.string(),
                text: z.object({
                  body: z.string(),
                }).optional(),
                type: z.string(),
              })
            ).optional(),
          }),
          field: z.string(),
        })
      ),
    })
  ),
});

// 6. Meta Lead Ads Webhook Payload Schema
export const metaLeadAdsWebhookSchema = z.object({
  object: z.literal("page"),
  entry: z.array(
    z.object({
      id: z.string(),
      time: z.number(),
      changes: z.array(
        z.object({
          value: z.object({
            ad_id: z.string().optional(),
            form_id: z.string(),
            leadgen_id: z.string(),
            page_id: z.string(),
          }),
          field: z.literal("leadgen"),
        })
      ),
    })
  ),
});

// 7. AI Autonomous Qualification Tool Schema
export const aiAgentQualifySchema = z.object({
  buyerName: z.string().min(2),
  phone: phoneSchema,
  budgetINR: z.number().positive(),
  budgetFormatted: z.string().optional(),
  preferredLocation: z.string().min(2),
  targetProject: z.string().optional(),
  configuration: z.string().min(2),
  purchaseTimeline: z.string().min(2),
  intentScore: z.number().min(0).max(100),
  intentLevel: z.enum(["Hot", "Warm", "Cold"]),
  buyingSignals: z.array(z.string()),
  recommendedAction: z.string(),
});

// 8. Projects / Societies Schemas
export const createProjectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters").max(150),
  developer: z.string().min(2, "Developer name is required").max(150),
  location: z.string().min(2, "Location is required").max(200),
  regionId: idSchema.optional().nullable(),
  areaId: idSchema.optional().nullable(),
  societyType: z.enum(["gated_community", "high_rise", "luxury_township", "builder_floors", "commercial_hub", "mixed_use"]).default("gated_community"),
  totalTowers: z.number().int().min(1).max(100).default(1),
  totalUnitsCount: z.number().int().min(0).default(0),
  possessionYear: z.number().int().min(1980).max(2050).optional().nullable(),
  gatedSecurityType: z.enum(["24x7_guards", "3_tier", "biometric_smart", "unrestricted"]).default("3_tier"),
  reraRegistrationNumber: z.string().max(100).optional().nullable(),
  masterAmenities: z.array(z.string()).optional(),
  maintenanceContactPhone: phoneSchema.optional().nullable(),
  societyOfficeAddress: z.string().max(300).optional().nullable(),
  priceRange: z.string().max(100).optional(),
  status: z.enum(["active", "launching_soon", "completed"]).default("active"),
});

export const updateProjectSchema = createProjectSchema.partial();

// 8b. Property Areas / Localities Schemas
export const createPropertyAreaSchema = z.object({
  regionId: idSchema.optional().nullable(),
  name: z.string().min(2, "Area name must be at least 2 characters").max(150),
  slug: z.string().min(2).max(150),
  city: z.string().min(2).max(100).default("Gurugram"),
  state: z.string().min(2).max(100).default("Haryana"),
  pincode: z.string().max(20).optional().nullable(),
  tier: z.enum(["luxury", "ultra_luxury", "premium", "affordable"]).default("luxury"),
  description: z.string().max(1000).optional().nullable(),
});

export const updatePropertyAreaSchema = createPropertyAreaSchema.partial();

// 8c. Project Towers / Blocks Schemas
export const createProjectTowerSchema = z.object({
  projectId: idSchema,
  name: z.string().min(1, "Tower name required").max(100),
  towerCode: z.string().max(20).optional().nullable(),
  totalFloors: z.number().int().min(1).max(200).default(1),
  unitsPerFloor: z.number().int().min(1).max(50).default(4),
  elevatorsCount: z.number().int().min(0).max(20).default(2),
  possessionDate: z.string().max(50).optional().nullable(),
  constructionStatus: z.enum(["under_construction", "ready", "launching"]).default("ready"),
  facingDirection: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateProjectTowerSchema = createProjectTowerSchema.partial().omit({ projectId: true });

// 9. Project Units Schemas
export const createProjectUnitSchema = z.object({
  projectId: idSchema,
  towerId: idSchema.optional().nullable(),
  tower: z.string().min(1, "Tower identifier required").max(50),
  unitNumber: z.string().min(1, "Unit number required").max(50),
  floor: z.number().int().min(-5).max(200),
  configuration: z.string().min(2).max(100),
  unitType: z.enum(["apartment", "penthouse", "villa", "builder_floor", "duplex", "plot", "commercial"]).default("apartment"),
  superAreaSqFt: z.number().positive().max(100_000),
  carpetAreaSqFt: z.number().positive().max(100_000).optional().nullable(),
  builtUpAreaSqFt: z.number().positive().max(100_000).optional().nullable(),
  balconiesCount: z.number().int().min(0).max(20).default(1),
  bathroomsCount: z.number().int().min(1).max(20).default(2),
  parkingSlots: z.number().int().min(0).max(10).default(1),
  parkingType: z.enum(["covered", "open", "basement_stack", "none"]).default("covered"),
  isCornerUnit: z.boolean().default(false),
  furnishingStatus: z.enum(["unfurnished", "semi_furnished", "fully_furnished", "bare_shell"]).default("semi_furnished"),
  physicalCondition: z.enum(["brand_new", "excellent", "good", "needs_renovation"]).default("good"),
  viewType: z.string().max(100).optional().nullable(),
  price: z.number().positive().max(10_000_000_000),
  askingPrice: z.number().positive().max(10_000_000_000).optional().nullable(),
  estimatedMarketPrice: z.number().positive().max(10_000_000_000).optional().nullable(),
  lastTransactedPrice: z.number().positive().max(10_000_000_000).optional().nullable(),
  lastTransactedDate: z.string().max(50).optional().nullable(),
  maintenanceMonthly: z.number().min(0).max(1_000_000).optional().nullable(),
  expectedMonthlyRent: z.number().min(0).max(10_000_000).optional().nullable(),
  rentalYieldPct: z.number().min(0).max(100).optional().nullable(),
  status: z.enum(["available", "hold", "site_visit", "negotiation", "booked", "sold"]).default("available"),
  occupancyStatus: z.enum(["owner_occupied", "rented", "vacant", "under_fitout", "unknown"]).default("unknown"),
  sellerIntent: z.enum([
    "actively_selling", "soft_testing_market", "willing_to_sell_at_price", "not_selling",
    "distress_sale", "urgent_liquidation", "evaluating_market", "unknown"
  ]).default("unknown"),
  sellerTargetTimeline: z.string().max(100).optional().nullable(),
  listingStatus: z.enum(["unlisted", "exclusive_mandate", "open_market", "private_pocket", "off_market"]).default("unlisted"),
  verificationStatus: z.enum(["verified", "unverified", "stale", "disputed", "historical", "user_reported", "inferred"]).default("unverified"),
  facing: z.string().max(50).optional().nullable(),
  assignedLeadId: idSchema.optional().nullable(),
  assignedBuyerName: z.string().max(150).optional().nullable(),
  keyLocation: z.string().max(200).optional().nullable(),
  unitAmenities: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateProjectUnitSchema = createProjectUnitSchema.partial();

export const bulkImportUnitsSchema = z.object({
  projectId: idSchema,
  units: z.array(createProjectUnitSchema.omit({ projectId: true })).min(1).max(500),
});

// 9b. External Organizations Schemas
export const createExternalOrgSchema = z.object({
  name: z.string().min(2, "Organization name required").max(150),
  orgType: z.enum(["developer", "rwa", "property_management", "brokerage", "architect", "contractor", "law_firm", "channel_partner", "vendor", "other"]),
  phone: phoneSchema.optional().nullable(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  officeAddress: z.string().max(300).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  gstin: z.string().max(50).optional().nullable(),
  reraId: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateExternalOrgSchema = createExternalOrgSchema.partial();

// 9c. Universal Entity Relationships Schemas
export const createEntityRelationshipSchema = z.object({
  subjectType: z.enum(["person", "organization", "user", "lead"]),
  subjectId: idSchema,
  subjectName: z.string().max(150).optional().nullable(),
  subjectPhone: z.string().max(50).optional().nullable(),
  relationshipType: z.enum([
    "owns", "current_owner", "co_owns", "previous_owner", "previously_owned",
    "rents", "current_tenant", "previously_rented", "investor_in", "power_of_attorney", "caretaker",
    "rwa_president", "rwa_secretary", "rwa_treasurer", "rwa_member", "facility_manager", "society_guard", "estate_manager",
    "exclusive_broker", "channel_partner_for", "representing_seller", "representing_buyer", "works_for", "contractor_for",
    "developed_by", "architect_of", "constructed_by", "managed_by",
    "family_member_of", "referred_by", "primary_contact_for", "other"
  ]),
  targetType: z.enum(["unit", "project", "person", "organization"]),
  targetId: idSchema,
  targetName: z.string().max(150).optional().nullable(),
  validFrom: z.string().max(50).optional().nullable(),
  validUntil: z.string().max(50).optional().nullable(),
  isCurrent: z.boolean().default(true),
  confidenceScore: z.number().int().min(0).max(100).default(100),
  verificationStatus: z.enum(["verified", "historical", "user_reported", "inferred", "disputed"]).default("verified"),
  provenanceSource: z.enum([
    "salesperson_entry", "registry_document", "society_directory", "owner_direct",
    "builder_data", "broker_network", "inbound_lead", "ai_inferred"
  ]).default("salesperson_entry"),
  commercialTerms: z.record(z.string(), z.any()).optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateEntityRelationshipSchema = createEntityRelationshipSchema.partial();

// 9d. Property Facts / Sales Memory Schemas
export const createPropertyFactSchema = z.object({
  entityType: z.enum(["project", "tower", "unit", "area"]),
  entityId: idSchema,
  category: z.enum([
    "visitor_access_rules", "society_regulations", "owner_preferences", "pricing_intelligence",
    "neighbourhood_context", "construction_quality", "amenity_status", "legal_rera_status", "structural_features", "legal_title", "general"
  ]),
  title: z.string().min(2).max(150),
  factStatement: z.string().min(3).max(2000),
  verificationTier: z.enum(["verified", "historical", "user_provided", "inferred", "unknown"]).default("verified"),
  confidencePct: z.number().int().min(0).max(100).default(100),
  sourceReference: z.string().max(200).optional().nullable(),
  expiresAt: z.string().max(50).optional().nullable(),
});

export const updatePropertyFactSchema = createPropertyFactSchema.partial();

// 9e. Global Search Schema
export const globalSearchSchema = z.object({
  q: z.string().min(1, "Search query required").max(100),
  limit: z.number().int().min(1).max(50).default(15).optional(),
});

export const globalSearchQuerySchema = z.object({
  q: z.string().min(2, "Search query must be at least 2 characters").max(100),
  limit: z.number().int().min(1).max(50).default(15).optional(),
});

// 10. Regions Schemas
export const createRegionSchema = z.object({
  name: z.string().min(2, "Region name required").max(100),
  code: z.string().min(2, "Region code required").max(10).toUpperCase(),
});

export const updateRegionSchema = createRegionSchema.partial();

// 11. Team Invitations & Roles Schemas
export const createInvitationSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["owner", "manager", "salesperson"]).default("salesperson"),
  regionId: idSchema.optional().nullable(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["owner", "manager", "salesperson"]),
  regionId: idSchema.optional().nullable(),
});

export const orgSetupSchema = z.object({
  name: z.string().min(2).max(150),
  teamSize: z.string().min(1).max(40),
  primaryRegion: z.string().min(2).max(150),
});

export const planSchema = z.object({
  plan: z.enum(["starter", "growth", "enterprise"]),
  billingCycle: z.enum(["monthly", "yearly"]),
  trialActive: z.boolean().default(true),
});

// 12. Organization Settings Schema
export const updateOrgSettingsSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  reactivationDays: z.number().int().min(1).max(365).optional(),
  teamSize: z.string().min(1).max(40).optional(),
  primaryRegion: z.string().min(2).max(150).optional(),
  setupCompletedAt: z.string().datetime().optional().nullable(),
  customSettings: z.record(z.string(), z.any()).optional(),
});

// 13. CSV Lead Import Schemas
export const importLeadRowSchema = z.object({
  personName: z.string().min(2).max(100),
  phone: phoneSchema,
  email: z.string().email().optional().or(z.literal("")),
  budget: z.number().positive().max(10_000_000_000).default(10000000),
  projectId: idSchema.optional().nullable(),
  projectName: z.string().optional().nullable(),
  stage: z.enum(["new", "contacted", "qualified", "site_visit", "negotiation", "won", "lost"]).default("new"),
  source: z.string().max(100).default("CSV Import"),
  configurationPreference: z.string().max(100).optional().nullable(),
  preferredFloor: z.string().max(50).optional().nullable(),
  facingPreference: z.string().max(50).optional().nullable(),
});

export const importLeadsBatchSchema = z.object({
  leads: z.array(importLeadRowSchema).min(1).max(500),
});

// 14. Document Schema
export const createDocumentSchema = z.object({
  projectId: idSchema.optional().nullable(),
  leadId: idSchema.optional().nullable(),
  title: z.string().min(2).max(200),
  fileUrl: z.string().min(5).max(1000),
  type: z.enum(["brochure", "floor_plan", "cost_sheet", "kyc", "agreement", "photo", "other"]).default("brochure"),
});

// 15. Billing Schemas
export const createCheckoutSessionSchema = z.object({
  planId: z.enum(["starter", "growth", "enterprise"]),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
  successUrl: z.string().url().max(500).optional(),
  cancelUrl: z.string().url().max(500).optional(),
});

export const cancelSubscriptionSchema = z.object({
  reason: z.string().max(500).optional(),
  cancelAtPeriodEnd: z.boolean().default(true),
});

export const reactivateSubscriptionSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const createRefundSchema = z.object({
  invoiceId: idSchema,
  amount: z.number().positive("Refund amount must be greater than zero"),
  reason: z.string().min(3, "Reason required for refund").max(500),
});

export const updateBillingProfileSchema = z.object({
  legalName: z.string().max(150).optional(),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid Indian GSTIN format")
    .optional()
    .or(z.literal("")),
  billingEmail: z.string().email("Invalid billing email").optional().or(z.literal("")),
  billingPhone: phoneSchema.optional(),
  billingAddress: z
    .object({
      line1: z.string().max(150).optional(),
      line2: z.string().max(150).optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(100).optional(),
      postalCode: z.string().max(20).optional(),
      country: z.string().max(50).default("IN"),
    })
    .optional(),
});

// ====================================================================
// 16. PHASE 13 — INTELLIGENCE & AUTOMATION SCHEMAS
// ====================================================================

export const createSellerOpportunitySchema = z.object({
  unitId: idSchema,
  ownerId: idSchema.optional().nullable(),
  signalType: z.enum([
    "tenancy_expiring",
    "vacant_unit",
    "investor_exit_window",
    "valuation_request",
    "repeated_price_enquiry",
    "market_comp_transacted",
    "distress_indicator",
    "manual_prospect",
  ]),
  signalStrength: z.number().int().min(0).max(100).default(75),
  estimatedValuation: z.number().positive().max(10_000_000_000).optional(),
  suggestedPitch: z.string().max(1000).optional(),
  urgency: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  status: z.enum(["detected", "assigned", "contacted", "valuation_presented", "mandate_secured", "dismissed", "listed"]).default("detected"),
  assignedToUserId: idSchema.optional().nullable(),
  aiRationale: z.string().max(1000).optional(),
  metadata: z.record(z.string().max(100), z.any()).optional(),
});

export const updateSellerOpportunitySchema = createSellerOpportunitySchema.partial().extend({
  status: z.enum(["detected", "assigned", "contacted", "valuation_presented", "mandate_secured", "dismissed", "listed"]).optional(),
  lastContactedAt: z.string().optional(),
});

export const siteVisitBriefingInputSchema = z.object({
  leadId: idSchema,
  unitId: idSchema,
  activityId: idSchema.optional().nullable(),
  scheduledAt: z.string().optional(),
});

export const freeTextMeetingSummarySchema = z.object({
  leadId: idSchema.optional(),
  unitId: idSchema.optional().nullable(),
  personName: z.string().max(200).optional(),
  rawNotes: z.string().min(5, "Notes must contain at least 5 characters").max(5000),
  spokenLanguage: z.string().max(50).default("en-IN").optional(),
});

export const confirmMeetingDispositionSchema = z.object({
  leadId: idSchema,
  unitId: idSchema.optional().nullable(),
  activityType: z.enum(["call", "meeting", "site_visit", "whatsapp", "note", "stage_change", "booking", "ai_agent"]),
  outcome: z.string().max(100),
  outcomeLabel: z.string().max(100),
  suggestedStage: z.enum(["new", "contacted", "qualified", "site_visit", "negotiation", "won", "lost"]).optional(),
  sentiment: z.enum(["bullish", "cautious", "hesitant", "negative"]).default("cautious"),
  budgetConfirmed: z.number().positive().max(10_000_000_000).optional().nullable(),
  extractedObjections: z.array(z.string().max(100)).default([]),
  buyingSignals: z.array(z.string().max(100)).default([]),
  conversationSummary: z.string().max(2000),
  suggestedNextMove: z.string().max(1000),
  scheduledFollowUpAt: z.string().optional().nullable(),
  notes: z.string().max(2000).optional(),
});

