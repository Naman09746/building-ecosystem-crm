import { Suspense } from "react";
import { BillingSuccessView } from "@/components/crm/billing-success-view";
import { Loader2 } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment Successful | EcosystemRealty",
  description: "Your subscription has been activated.",
};

export default function BillingSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <BillingSuccessView />
      </Suspense>
    </div>
  );
}
