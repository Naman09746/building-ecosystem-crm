"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard } from "@repo/ui/components/auth-card";

function InviteLandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  React.useEffect(() => {
    if (!token) return;
    router.replace(`/onboarding?invite=${encodeURIComponent(token)}`);
  }, [router, token]);

  return (
    <AuthCard
      currentStep="onboarding"
      maxWidthClass="max-w-xl"
      title="Team Invitation"
      subtitle="Redirecting you to secure invitation acceptance."
    >
      <p className="text-xs text-muted-foreground">
        {token ? "Preparing your invite acceptance flow..." : "Missing invitation token. Please ask your team owner or manager for a fresh invite link."}
      </p>
    </AuthCard>
  );
}

export default function InviteLandingPage() {
  return (
    <React.Suspense>
      <InviteLandingContent />
    </React.Suspense>
  );
}
