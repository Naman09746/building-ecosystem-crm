"use client";

import { Suspense } from "react";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@repo/core/context/auth-context";
import { AuthCard } from "@repo/ui/components/auth-card";
import { 
  UploadCloud, 
  Users, 
  Kanban, 
  Check, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  ArrowLeft,
  FileSpreadsheet,
  Building2,
  PhoneCall
} from "lucide-react";
import { getPipelineStages } from "@repo/core/config/pipeline-presets";

type OnboardingStep = "leads" | "team" | "pipeline";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { org, completeOnboardingStep, skipOnboarding, onboardingData } = useAuth();
  const inviteToken = searchParams.get("invite");

  const [acceptingInvite, setAcceptingInvite] = React.useState(false);
  const [inviteError, setInviteError] = React.useState<string | null>(null);
  const [currentStep, setCurrentStep] = React.useState<OnboardingStep>("leads");
  const [csvUploaded, setCsvUploaded] = React.useState(false);
  const [sampleLeadsAdded, setSampleLeadsAdded] = React.useState(false);
  const [teamMembers, setTeamMembers] = React.useState<Array<{ email: string; role: string }>>([
    { email: "", role: "salesperson" },
  ]);
  const [stages, setStages] = React.useState(() =>
    getPipelineStages(org?.industry || "real_estate", org?.complexityMode || "deep")
  );

  React.useEffect(() => {
    if (org?.industry || org?.complexityMode) {
      setStages(getPipelineStages(org?.industry || "real_estate", org?.complexityMode || "deep"));
    }
  }, [org?.industry, org?.complexityMode]);

  React.useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;

    async function acceptInvite() {
      setAcceptingInvite(true);
      setInviteError(null);
      try {
        const res = await fetch("/api/team/invitations/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: inviteToken }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          if (!cancelled) setInviteError(json.error?.message || "Failed to accept invitation.");
          return;
        }
        if (!cancelled) {
          router.replace("/dashboard");
        }
      } catch {
        if (!cancelled) setInviteError("Failed to accept invitation.");
      } finally {
        if (!cancelled) setAcceptingInvite(false);
      }
    }

    acceptInvite();
    return () => {
      cancelled = true;
    };
  }, [inviteToken, router]);

  if (inviteToken) {
    return (
      <AuthCard
        currentStep="onboarding"
        maxWidthClass="max-w-xl"
        title="Accepting Team Invitation"
        subtitle="We are securely linking your account to the invited organization."
      >
        <div className="space-y-3 text-xs text-muted-foreground">
          <p>{acceptingInvite ? "Please wait while we validate your invite token." : "Finalizing your access."}</p>
          {inviteError && <p className="text-red-600">{inviteError}</p>}
        </div>
      </AuthCard>
    );
  }

  const handleFinishAll = () => {
    skipOnboarding();
    router.push("/dashboard");
  };

  const handleAddTeamRow = () => {
    setTeamMembers([...teamMembers, { email: "", role: "salesperson" }]);
  };

  const handleRemoveTeamRow = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  const handleImportSampleLeads = () => {
    setSampleLeadsAdded(true);
    setCsvUploaded(true);
    completeOnboardingStep("leads", { count: 12 });
  };

  const handleTeamSubmit = async () => {
    const validRows = teamMembers.filter((t) => t.email.trim());
    const emails = validRows.map((t) => t.email.trim());
    completeOnboardingStep("team", { emails });
    setCurrentStep("pipeline");

    // Fire real invitations (manager/salesperson only). Non-blocking — the
    // owner can re-invite from Settings → Team if any dispatch fails.
    for (const member of validRows) {
      try {
        await fetch("/api/team/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: member.email.trim(),
            role: member.role === "manager" ? "manager" : "salesperson",
          }),
        });
      } catch {
        // Swallow dispatch errors — invite re-issue is available in the app.
      }
    }
  };

  return (
    <AuthCard
      currentStep="onboarding"
      maxWidthClass="max-w-3xl"
      title="Welcome to your Workspace Setup Wizard"
      subtitle={`Let's get ${org?.name || "your organization"} ready for high-velocity sales in under 60 seconds.`}
      footerContent={
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleFinishAll}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip All Steps → Go Straight to CRM Dashboard
          </button>
          <span className="text-[11px] text-muted-foreground">
            Step {currentStep === "leads" ? "1" : currentStep === "team" ? "2" : "3"} of 3
          </span>
        </div>
      }
    >
      {/* Wizard Step Progress Pills */}
      <div className="flex items-center justify-between bg-muted/60 p-2 rounded-xl border border-border">
        {[
          { id: "leads", label: "1. Import Leads", icon: UploadCloud },
          { id: "team", label: "2. Invite Closers", icon: Users },
          { id: "pipeline", label: "3. Configure Pipeline", icon: Kanban },
        ].map((s) => {
          const isActive = currentStep === s.id;
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrentStep(s.id as OnboardingStep)}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                isActive
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* STEP 1: IMPORT LEADS */}
      {currentStep === "leads" && (
        <div className="space-y-5 animate-in fade-in-50">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Import your Existing Inquiries & Buyer Leads</h3>
            <p className="text-xs text-muted-foreground">
              Upload a spreadsheet (CSV/Excel) from 99acres, MagicBricks, or Facebook Ads to auto-populate your calling queue.
            </p>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onClick={handleImportSampleLeads}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              csvUploaded
                ? "border-emerald-500 bg-emerald-50/50"
                : "border-border hover:border-primary/50 bg-background/50 hover:bg-muted/30"
            }`}
          >
            {csvUploaded ? (
              <div className="flex flex-col items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 animate-in zoom-in-50" />
                <p className="font-bold text-sm">12 High-Ticket Luxury Leads Ready to Sync</p>
                <p className="text-xs text-emerald-600/80">
                  Pre-configured with ₹3 Cr - ₹15 Cr buyer budgets and verified phone numbers.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <FileSpreadsheet className="h-10 w-10 text-primary/70 mb-1" />
                <p className="font-semibold text-sm text-foreground">
                  Drag & Drop your CSV file here, or click to upload
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports columns: Buyer Name, Phone, Budget, Project, Unit Preference
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleImportSampleLeads}
              className="text-xs font-semibold text-primary flex items-center gap-1.5 hover:underline"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Load 12 Ready-Made Indian Luxury Test Leads</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep("team")}
              className="py-2.5 px-4 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:bg-primary-hover transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>{csvUploaded ? "Continue with Leads" : "Skip to Team Setup"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: INVITE TEAM */}
      {currentStep === "team" && (
        <div className="space-y-5 animate-in fade-in-50">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Invite your Sales Closers & Channel Partners</h3>
            <p className="text-xs text-muted-foreground">
              Add email addresses of sales reps who should receive leads and calling SLAs.
            </p>
          </div>

          <div className="space-y-2.5">
            {teamMembers.map((member, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="email"
                  value={member.email}
                  onChange={(e) => {
                    const copy = [...teamMembers];
                    copy[idx].email = e.target.value;
                    setTeamMembers(copy);
                  }}
                  placeholder="closer.email@realtyteam.in"
                  className="flex-1 px-3 py-2 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-foreground"
                />
                <select
                  value={member.role}
                  onChange={(e) => {
                    const copy = [...teamMembers];
                    copy[idx].role = e.target.value;
                    setTeamMembers(copy);
                  }}
                  className="w-36 px-2.5 py-2 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-foreground"
                >
                  <option value="salesperson">Sales Closer</option>
                  <option value="manager">Sales Manager</option>
                  <option value="owner">Owner / Founder</option>
                </select>
                {teamMembers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTeamRow(idx)}
                    className="p-2 text-muted-foreground hover:text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddTeamRow}
              className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline pt-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add another teammate</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setCurrentStep("leads")}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleTeamSubmit}
              className="py-2.5 px-4 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:bg-primary-hover transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>Continue to Pipeline</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PIPELINE SETUP */}
      {currentStep === "pipeline" && (
        <div className="space-y-5 animate-in fade-in-50">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Verify your Luxury Sales Progression Pipeline</h3>
            <p className="text-xs text-muted-foreground">
              These stages power your daily sales cockpit, auto-triggers, and touchpoint logging.
            </p>
          </div>

          <div className="space-y-2">
            {stages.map((stage, idx) => (
              <div
                key={stage.id}
                className="flex items-center justify-between p-2.5 bg-background border border-border rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{stage.name}</p>
                    <p className="text-[10px] text-muted-foreground">{stage.desc}</p>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Active Stage
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setCurrentStep("team")}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleFinishAll}
              className="py-3 px-6 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-[0.99]"
            >
              <Sparkles className="h-4 w-4" />
              <span>Launch Sales Command Center</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </AuthCard>
  );
}


export default function OnboardingPage() {
  return (
    <React.Suspense fallback={<div className="flex items-center justify-center p-8" />}>
      <OnboardingContent />
    </React.Suspense>
  );
}
