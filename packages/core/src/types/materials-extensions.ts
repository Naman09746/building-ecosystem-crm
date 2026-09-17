import { CatalogItem } from "./commercial";

export type FootfallVisitType = "walk_in" | "phone_inquiry" | "site_visitor" | "referral";
export type FootfallIntent = "price_check" | "bulk_order" | "sample_request" | "credit_khata" | "complaint" | "general";
export type FootfallConclusion =
  | "browsing"
  | "quote_given"
  | "order_placed"
  | "needs_follow_up"
  | "lost"
  | "payment_received";

export interface MaterialsFootfall {
  id: string;
  orgId: string;
  outletName: string;
  personName: string;
  personPhone?: string;
  personId?: string;
  handledBy?: string;
  handledByName?: string;
  visitType: FootfallVisitType;
  intent: FootfallIntent;
  conclusion: FootfallConclusion;
  conclusionNotes: string;
  estimatedValue?: number;
  followUpDate?: string;
  followUpTaskId?: string;
  activityId?: string;
  visitedAt: string;
  createdAt: string;
}

export type FieldScoutPhase = "excavation" | "foundation" | "superstructure" | "finishing" | "renovation" | "unknown";
export type FieldScoutStatus = "raw" | "verified" | "contacted" | "converted_to_lead" | "dead";

export interface MaterialsFieldScout {
  id: string;
  orgId: string;
  scoutedBy?: string;
  scoutedByName?: string;
  title: string;
  geoLat: number;
  geoLong: number;
  addressText: string;
  photoUrls: string[];
  voiceNoteUrl?: string;
  aiSummary?: string;
  estimatedPhase: FieldScoutPhase;
  estimatedMaterialNeeds: string[];
  potentialValue?: number;
  status: FieldScoutStatus;
  convertedLeadId?: string;
  contractorContactName?: string;
  contractorContactPhone?: string;
  notes?: string;
  scoutedAt: string;
  createdAt: string;
}

export type KhataLedgerStatus = "active" | "overdue" | "blocked" | "settled";

export interface MaterialsKhataLedger {
  id: string;
  orgId: string;
  personId?: string;
  externalOrgId?: string;
  customerName: string;
  customerPhone?: string;
  creditLimit: number;
  outstandingBalance: number;
  lastPaymentAt?: string;
  status: KhataLedgerStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type KhataTransactionType = "credit" | "debit"; // credit = material dispatched on credit (+), debit = payment settled (-)
export type KhataPaymentMode = "cash" | "upi" | "cheque" | "bank_transfer" | "credit_note";

export interface MaterialsKhataTransaction {
  id: string;
  ledgerId: string;
  orgId: string;
  type: KhataTransactionType;
  amount: number;
  orderId?: string;
  paymentMode?: KhataPaymentMode;
  referenceNumber?: string;
  notes?: string;
  recordedBy?: string;
  recordedByName?: string;
  createdAt: string;
}

export interface MaterialsDailyRate {
  id: string;
  orgId: string;
  catalogItemId: string;
  catalogItem?: CatalogItem;
  rate: number;
  effectiveDate: string;
  publishedBy?: string;
  publishedByName?: string;
  broadcastSent: boolean;
  broadcastSentAt?: string;
  notes?: string;
  createdAt: string;
}
