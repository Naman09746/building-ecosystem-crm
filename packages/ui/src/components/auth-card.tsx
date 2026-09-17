import * as React from "react";
import { Check } from "lucide-react";

export interface StepItem {
  id: "auth" | "org" | "plan" | "onboarding";
  label: string;
}

const STEPS: StepItem[] = [
  { id: "auth", label: "Account" },
  { id: "org", label: "Organization" },
  { id: "plan", label: "Plan & Billing" },
  { id: "onboarding", label: "Setup Wizard" },
];

interface AuthCardProps {
  currentStep?: "auth" | "org" | "plan" | "onboarding";
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerContent?: React.ReactNode;
  maxWidthClass?: string;
}

export function AuthCard({
  currentStep,
  title,
  subtitle,
  children,
  footerContent,
  maxWidthClass = "max-w-md",
}: AuthCardProps) {
  const currentIdx = currentStep ? STEPS.findIndex((s) => s.id === currentStep) : -1;

  return (
    <div className={`w-full ${maxWidthClass} space-y-6 animate-in fade-in-50 duration-200`}>
      {/* Visual Stepper */}
      {currentStep && (
        <div className="w-full bg-card border border-border rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const isDone = idx < currentIdx;
              const isCurrent = idx === currentIdx;

              return (
                <React.Fragment key={step.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                        isDone
                          ? "bg-emerald-600 text-white shadow-sm"
                          : isCurrent
                          ? "bg-primary text-primary-foreground ring-2 ring-primary/20"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {isDone ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                    </div>
                    <span
                      className={`text-xs font-medium hidden sm:inline ${
                        isCurrent
                          ? "text-foreground font-semibold"
                          : isDone
                          ? "text-muted-foreground"
                          : "text-muted-foreground/60"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-[2px] mx-2 transition-colors ${
                        idx < currentIdx ? "bg-emerald-600" : "bg-border"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Card Container */}
      <div className="w-full bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="space-y-1.5 mb-6 text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {/* Content */}
        <div className="space-y-5">{children}</div>

        {/* Optional Card Footer */}
        {footerContent && (
          <div className="mt-6 pt-5 border-t border-border text-center text-xs text-muted-foreground">
            {footerContent}
          </div>
        )}
      </div>
    </div>
  );
}
