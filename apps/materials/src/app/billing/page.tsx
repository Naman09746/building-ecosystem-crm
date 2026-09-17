import { BillingPage } from "@/components/crm/pages/billing-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing & Subscription | EcosystemRealty",
  description: "Manage plans, seat quotas, GST tax receipts, and payment methods.",
};

export default function BillingPageRoute() {
  return (
    <div className="p-6">
      <BillingPage />
    </div>
  );
}
