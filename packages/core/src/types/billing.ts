export type PlanId = "starter" | "growth" | "enterprise";
export type BillingCycle = "monthly" | "yearly";
export type BillingProvider = "stripe" | "razorpay" | "simulated" | "manual";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "unpaid"
  | "paused"
  | "canceled"
  | "incomplete"
  | "incomplete_expired";

export interface PlanPricing {
  monthlyPrice: number; // in INR
  annualMonthlyPrice: number; // in INR / month
  annualTotalPrice: number; // in INR / year
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  badge?: string;
  description: string;
  pricing: PlanPricing;
  limits: {
    maxSeats: number;
    maxLeads: number;
    maxProjects: number;
  };
  features: string[];
  popular?: boolean;
}

export interface Subscription {
  id: string;
  orgId: string;
  plan: PlanId;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  provider: BillingProvider;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  providerPlanId?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart?: string;
  trialEnd?: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  cancellationReason?: string;
  gracePeriodUntil?: string;
  currency: string;
  amount: number;
  latestPaymentId?: string;
  latestInvoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingCustomer {
  id: string;
  orgId: string;
  provider: BillingProvider;
  providerCustomerId: string;
  billingName?: string;
  billingEmail?: string;
  billingPhone?: string;
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  gstin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingInvoice {
  id: string;
  orgId: string;
  subscriptionId?: string;
  invoiceNumber: string;
  provider: BillingProvider;
  providerPaymentId?: string;
  providerInvoiceId?: string;
  amount: number;
  taxAmount: number;
  currency: string;
  status: "draft" | "open" | "paid" | "uncollectible" | "void" | "failed" | "refunded" | "partially_refunded";
  plan: PlanId;
  billingCycle: BillingCycle;
  periodStart: string;
  periodEnd: string;
  billingName?: string;
  billingEmail?: string;
  gstin?: string;
  paidAt?: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface BillingRefund {
  id: string;
  orgId: string;
  invoiceId: string;
  provider: BillingProvider;
  providerRefundId?: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "canceled";
  reason?: string;
  requestedBy?: string;
  requestedAt: string;
  completedAt?: string;
  createdAt: string;
}

export interface BillingOverviewData {
  subscription: Subscription;
  customer?: BillingCustomer;
  usage: {
    leadsUsed: number;
    leadsLimit: number;
    seatsUsed: number;
    seatsLimit: number;
    projectsCount: number;
  };
  invoices: BillingInvoice[];
  refunds: BillingRefund[];
}
