"use client";

import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { UserRole } from "@/types/crm";
import { mapCanonicalRole } from "@/lib/server/rbac";
import type { EcosystemVertical, ComplexityMode } from "@/types/ecosystem";

export type WorkflowStep = "auth" | "org" | "plan" | "onboarding" | "app";

export interface AuthOrg {
  id: string;
  name: string;
  slug: string;
  teamSize: string;
  primaryRegion: string;
  plan?: "starter" | "growth" | "enterprise";
  billingCycle?: "monthly" | "yearly";
  industry?: EcosystemVertical;
  complexityMode?: ComplexityMode;
  trialActive?: boolean;
  setupCompletedAt?: string | null;
  needsSetup?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface OnboardingData {
  importedLeadsCount: number;
  invitedEmails: string[];
  pipelineConfigured: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  org: AuthOrg | null;
  workflowStep: WorkflowStep;
  isLoading: boolean;
  isConfigured: boolean;
  onboardingData: OnboardingData;

  // Actions
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string; nextPath?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; nextPath?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInAsDemo: (role?: "owner" | "manager" | "salesperson") => void;
  signOut: () => Promise<void>;

  saveOrgSetup: (orgData: { 
    name: string; 
    teamSize: string; 
    primaryRegion: string;
    industry?: EcosystemVertical;
    complexityMode?: ComplexityMode;
  }) => void;
  updateEcosystemSettings: (industry: EcosystemVertical, complexityMode: ComplexityMode) => void;
  selectPlan: (plan: "starter" | "growth" | "enterprise", billingCycle: "monthly" | "yearly") => void;
  completeOnboardingStep: (step: "leads" | "team" | "pipeline", payload?: any) => void;
  skipOnboarding: () => void;
  setWorkflowStep: (step: WorkflowStep) => void;
  resetWorkflow: () => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

// Non-security UI state only. Identity/session NEVER comes from here.
const STORAGE_KEYS = {
  ORG: "callcrm_auth_org",
  STEP: "callcrm_workflow_step",
  ONBOARDING: "callcrm_onboarding_data",
  DEMO_ROLE: "callcrm_demo_role",
} as const;

// Map server-side profile roles to the three client-facing perspectives.
// Authorization is still enforced by RLS + API routes; this is display-only.
function mapDbRole(dbRole: string | null | undefined): UserRole {
  return mapCanonicalRole(dbRole) as UserRole;
}

function deriveWorkflowStep(authOrg: AuthOrg | null): WorkflowStep {
  if (!authOrg) return "org";
  if (!authOrg.teamSize || !authOrg.primaryRegion) return "org";
  if (!authOrg.plan || !authOrg.billingCycle) return "plan";
  if (!authOrg.setupCompletedAt) return "onboarding";
  return "app";
}

async function loadProfileUserAndOrg(
  supabase: SupabaseClient,
  sessionUser: { id: string; email?: string; user_metadata?: Record<string, any> }
): Promise<{ authUser: AuthUser; authOrg: AuthOrg | null }> {
  const fallbackName =
    sessionUser.user_metadata?.full_name || sessionUser.email?.split("@")[0] || "User";

  let role: UserRole = "salesperson";
  let authOrg: AuthOrg | null = null;

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name, org_id, org:orgs(*)")
      .eq("user_id", sessionUser.id)
      .maybeSingle();

    if (profile) {
      role = mapDbRole(profile.role);
      const orgData = Array.isArray(profile.org) ? profile.org[0] : profile.org;
      if (orgData) {
        const setupCompletedAt = orgData.setup_completed_at || null;
        authOrg = {
          id: orgData.id,
          name: orgData.name || "Apex Realty",
          slug: orgData.name ? orgData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "apex-realty",
          plan: orgData.plan || "growth",
          billingCycle: orgData.billing_cycle || "monthly",
          primaryRegion: orgData.primary_region || "",
          teamSize: orgData.team_size || "",
          setupCompletedAt,
          needsSetup: !setupCompletedAt,
        };
      }
    }
  } catch (err) {
    console.warn("Error fetching profile and org:", err);
  }

  return {
    authUser: {
      id: sessionUser.id,
      email: sessionUser.email || "",
      name: fallbackName,
      role,
      avatarUrl: sessionUser.user_metadata?.avatar_url,
    },
    authOrg,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [org, setOrg] = React.useState<AuthOrg | null>(null);
  const [workflowStep, setWorkflowStepState] = React.useState<WorkflowStep>("auth");
  const [isLoading, setIsLoading] = React.useState(true);
  const [onboardingData, setOnboardingData] = React.useState<OnboardingData>({
    importedLeadsCount: 0,
    invitedEmails: [],
    pipelineConfigured: false,
  });

  const lastActiveRef = React.useRef<number>(Date.now());

  // Restore session from Supabase ONLY. Identity is never trusted from localStorage.
  React.useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function initAuth() {
      setIsLoading(true);
      const supabase = getSupabaseClient();
      let hasAuthenticatedSession = false;

      if (supabase && isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && !cancelled) {
            hasAuthenticatedSession = true;
            const { authUser, authOrg } = await loadProfileUserAndOrg(supabase, session.user);
            if (!cancelled) {
              setUser(authUser);
              if (authOrg) setOrg(authOrg);
              setWorkflowStepState(deriveWorkflowStep(authOrg));
              lastActiveRef.current = Date.now();
            }
          }
        } catch (e) {
          console.warn("Supabase auth session fetch failed:", e);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (cancelled) return;
          if (session?.user) {
            const { authUser, authOrg } = await loadProfileUserAndOrg(supabase, session.user);
            if (!cancelled) {
              setUser(authUser);
              if (authOrg) setOrg(authOrg);
              setWorkflowStepState(deriveWorkflowStep(authOrg));
              lastActiveRef.current = Date.now();
            }
          } else {
            if (!cancelled) {
              setUser(null);
              setOrg(null);
              setWorkflowStepState("auth");
            }
          }
        });

        unsubscribe = () => subscription.unsubscribe();
      }

      // Restore non-security UI state if not already in app
      try {
        const savedOrgStr = localStorage.getItem(STORAGE_KEYS.ORG);
        const savedStep = localStorage.getItem(STORAGE_KEYS.STEP) as WorkflowStep | null;
        const savedOnboardingStr = localStorage.getItem(STORAGE_KEYS.ONBOARDING);

        if (savedOrgStr && !cancelled) setOrg((prev) => prev || JSON.parse(savedOrgStr));
        if (savedStep && !cancelled) setWorkflowStepState((prev) => (prev === "app" ? "app" : savedStep || "auth"));
        if (savedOnboardingStr && !cancelled) setOnboardingData(JSON.parse(savedOnboardingStr));

        if (!hasAuthenticatedSession) {
          const demoRole = localStorage.getItem(STORAGE_KEYS.DEMO_ROLE) as "owner" | "salesperson" | null;
          if (demoRole) {
            signInAsDemo(demoRole);
          }
        }
      } catch (e) {
        console.warn("Could not read UI state from localStorage", e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    initAuth();

    // Idle UX timer (45 min). Real enforcement lives in JWT expiry + server checks.
    const updateActivity = () => {
      lastActiveRef.current = Date.now();
    };

    const interval = setInterval(() => {
      if (Date.now() - lastActiveRef.current > 45 * 60 * 1000) {
        console.warn("[SECURITY] Session marked idle after 45 minutes of inactivity.");
        signOut();
      }
    }, 60000);

    window.addEventListener("mousemove", updateActivity, { passive: true });
    window.addEventListener("keydown", updateActivity, { passive: true });
    window.addEventListener("touchstart", updateActivity, { passive: true });

    return () => {
      cancelled = true;
      clearInterval(interval);
      unsubscribe?.();
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("touchstart", updateActivity);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setWorkflowStep = (step: WorkflowStep) => {
    setWorkflowStepState(step);
    try {
      localStorage.setItem(STORAGE_KEYS.STEP, step);
    } catch {}
  };

  const signUp = async (email: string, password: string, name: string) => {
    const supabase = getSupabaseClient();

    if (!supabase || !isSupabaseConfigured) {
      return {
        success: false,
        error:
          "Authentication backend is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/login?verified=true`,
        },
      });
      if (error) {
        return { success: false, error: error.message };
      }

      // If email confirmation is required by Supabase
      if (data.user && !data.session) {
        return {
          success: true,
          error: "Verification email sent. Please check your inbox and confirm your email before signing in.",
        };
      }

      if (data.user && data.session) {
        const { authUser, authOrg } = await loadProfileUserAndOrg(supabase, data.user);
        setUser(authUser);
        if (authOrg) setOrg(authOrg);
        const nextStep = deriveWorkflowStep(authOrg);
        setWorkflowStep(nextStep);
        return {
          success: true,
          nextPath: nextStep === "org" ? "/setup-org" : nextStep === "plan" ? "/choose-plan" : nextStep === "onboarding" ? "/onboarding" : "/dashboard",
        };
      }

      return { success: false, error: "Sign up did not return a user." };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to sign up" };
    }
  };

  const signIn = async (email: string, password: string) => {
    const supabase = getSupabaseClient();

    if (!supabase || !isSupabaseConfigured) {
      return {
        success: false,
        error:
          "Authentication backend is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      if (data.user) {
        const { authUser, authOrg } = await loadProfileUserAndOrg(supabase, data.user);
        setUser(authUser);
        if (authOrg) setOrg(authOrg);
        const nextStep = deriveWorkflowStep(authOrg);
        setWorkflowStep(nextStep);
        return {
          success: true,
          nextPath: nextStep === "org" ? "/setup-org" : nextStep === "plan" ? "/choose-plan" : nextStep === "onboarding" ? "/onboarding" : "/dashboard",
        };
      }
      return { success: false, error: "Invalid credentials." };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to sign in" };
    }
  };

  const signInWithGoogle = async () => {
    const supabase = getSupabaseClient();

    if (!supabase || !isSupabaseConfigured) {
      return {
        success: false,
        error:
          "Authentication backend is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
      };
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/setup-org`,
        },
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to initialize Google login" };
    }
  };

  const signInAsDemo = (role: "owner" | "manager" | "salesperson" = "salesperson") => {
    const demoUsers: Record<string, AuthUser> = {
      owner: { id: "usr-vikram", name: "Vikram Malhotra", email: "vikram@apexrealty.in", role: "owner" },
      manager: { id: "usr-priya", name: "Priya Kapoor", email: "priya@apexrealty.in", role: "manager" },
      salesperson: { id: "usr-rahul", name: "Rahul Sharma", email: "rahul@apexrealty.in", role: "salesperson" },
    };
    const demoUser = demoUsers[role];

    const demoOrg: AuthOrg = {
      id: "org-dlf-partners",
      name: "Apex Realty Partners",
      slug: "apex-realty",
      plan: "growth",
      billingCycle: "monthly",
      primaryRegion: "Gurgaon",
      teamSize: "6-20",
      industry: "real_estate",
      complexityMode: "deep",
      setupCompletedAt: new Date().toISOString(),
      needsSetup: false,
    };

    setUser(demoUser);
    setOrg(demoOrg);
    setWorkflowStepState("app");
    try {
      localStorage.setItem(STORAGE_KEYS.ORG, JSON.stringify(demoOrg));
      localStorage.setItem(STORAGE_KEYS.STEP, "app");
      localStorage.setItem(STORAGE_KEYS.DEMO_ROLE, role);
      document.cookie = `callcrm_demo_session=1; path=/; max-age=86400; SameSite=Lax`;
    } catch {}
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setOrg(null);
    setWorkflowStep("auth");
    try {
      localStorage.removeItem(STORAGE_KEYS.ORG);
      localStorage.removeItem(STORAGE_KEYS.STEP);
      localStorage.removeItem(STORAGE_KEYS.ONBOARDING);
      localStorage.removeItem(STORAGE_KEYS.DEMO_ROLE);
      document.cookie = "callcrm_demo_session=; path=/; max-age=0";
    } catch {}
  };

  const saveOrgSetup = async (orgData: { 
    name: string; 
    teamSize: string; 
    primaryRegion: string;
    industry?: EcosystemVertical;
    complexityMode?: ComplexityMode;
  }) => {
    let realOrgId = org?.id && !String(org.id).startsWith("local") ? org.id : undefined;

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured) {
      try {
        const { data: { user: currentAuthUser } } = await supabase.auth.getUser();
        if (currentAuthUser) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("org_id")
            .eq("user_id", currentAuthUser.id)
            .maybeSingle();
          if (profile?.org_id) {
            realOrgId = profile.org_id;
            await fetch("/api/orgs/settings", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: orgData.name,
                teamSize: orgData.teamSize,
                primaryRegion: orgData.primaryRegion,
                industry: orgData.industry || "real_estate",
                complexityMode: orgData.complexityMode || "deep",
              }),
            });
          }
        }
      } catch (e) {
        console.warn("[AUTH] Could not persist organization setup:", e);
      }
    }

    const newOrg: AuthOrg = {
      id: realOrgId ?? `local-${Date.now()}`,
      name: orgData.name,
      slug: orgData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      teamSize: orgData.teamSize,
      primaryRegion: orgData.primaryRegion,
      industry: orgData.industry || "real_estate",
      complexityMode: orgData.complexityMode || "deep",
      plan: org?.plan,
      billingCycle: org?.billingCycle,
      setupCompletedAt: null,
      needsSetup: true,
    };
    setOrg(newOrg);
    try {
      localStorage.setItem(STORAGE_KEYS.ORG, JSON.stringify(newOrg));
    } catch {}
    setWorkflowStep("plan");
  };

  const updateEcosystemSettings = (industry: EcosystemVertical, complexityMode: ComplexityMode) => {
    if (!org) return;
    const updated: AuthOrg = {
      ...org,
      industry,
      complexityMode,
    };
    setOrg(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.ORG, JSON.stringify(updated));
    } catch {}
  };

  const selectPlan = async (
    plan: "starter" | "growth" | "enterprise",
    billingCycle: "monthly" | "yearly"
  ) => {
    if (!org) return;
    // Persist the selected plan on the tenant row (billing enforcement itself
    // remains a server-side concern for the payments pass).
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured && org.id && !String(org.id).startsWith("local")) {
      try {
        await fetch("/api/orgs/plan", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, billingCycle, trialActive: true }),
        });
      } catch (e) {
        console.warn("[AUTH] Could not persist plan selection:", e);
      }
    }

    const updatedOrg: AuthOrg = {
      ...org,
      id: String(org.id).startsWith("local") ? `local-${Date.now()}` : org.id,
      plan,
      billingCycle,
      trialActive: true,
      setupCompletedAt: null,
      needsSetup: true,
    };
    setOrg(updatedOrg);
    try {
      localStorage.setItem(STORAGE_KEYS.ORG, JSON.stringify(updatedOrg));
    } catch {}
    setWorkflowStep("onboarding");
  };

  const completeOnboardingStep = (step: "leads" | "team" | "pipeline", payload?: any) => {
    setOnboardingData((prev) => {
      let updated = { ...prev };
      if (step === "leads" && payload?.count) {
        updated.importedLeadsCount = payload.count;
      } else if (step === "team" && payload?.emails) {
        updated.invitedEmails = payload.emails;
      } else if (step === "pipeline") {
        updated.pipelineConfigured = true;
      }
      try {
        localStorage.setItem(STORAGE_KEYS.ONBOARDING, JSON.stringify(updated));
      } catch {}
      // Persist to database
      fetch("/api/orgs/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customSettings: {
            onboarding: updated,
          },
        }),
      }).catch(() => {});
      return updated;
    });
  };

  const skipOnboarding = () => {
    const setupCompletedAt = new Date().toISOString();
    setOrg((prev) => (prev ? { ...prev, setupCompletedAt, needsSetup: false } : prev));
    setWorkflowStep("app");
    fetch("/api/orgs/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        setupCompletedAt,
      }),
    }).catch(() => {});
  };

  const resetWorkflow = () => {
    setUser(null);
    setOrg(null);
    setWorkflowStep("auth");
    setOnboardingData({
      importedLeadsCount: 0,
      invitedEmails: [],
      pipelineConfigured: false,
    });
    // Clear only our own keys — never localStorage.clear()
    try {
      localStorage.removeItem(STORAGE_KEYS.ORG);
      localStorage.removeItem(STORAGE_KEYS.STEP);
      localStorage.removeItem(STORAGE_KEYS.ONBOARDING);
      localStorage.removeItem(STORAGE_KEYS.DEMO_ROLE);
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        org,
        workflowStep,
        isLoading,
        isConfigured: isSupabaseConfigured,
        onboardingData,
        signUp,
        signIn,
        signInWithGoogle,
        signInAsDemo,
        signOut,
        saveOrgSetup,
        updateEcosystemSettings,
        selectPlan,
        completeOnboardingStep,
        skipOnboarding,
        setWorkflowStep,
        resetWorkflow,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
