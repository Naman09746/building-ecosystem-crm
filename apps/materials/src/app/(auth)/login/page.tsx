"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@repo/core/context/auth-context";
import { AuthCard } from "@repo/ui/components/auth-card";
import { 
  Building2, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  Eye,
  EyeOff,
  CheckCircle2
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "login" ? "login" : "signup";

  const { signUp, signIn, signInWithGoogle, signInAsDemo, user, workflowStep, isConfigured } = useAuth();

  const [mode, setMode] = React.useState<"signup" | "login">(initialMode);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // If already logged in, navigate to the correct workflow step
  React.useEffect(() => {
    if (user && !loading) {
      const path =
        workflowStep === "org"
          ? "/setup-org"
          : workflowStep === "plan"
          ? "/choose-plan"
          : workflowStep === "onboarding"
          ? "/onboarding"
          : "/dashboard";
      router.replace(path);
    }
  }, [user, loading, workflowStep, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!name.trim()) {
          setErrorMessage("Please enter your full name");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMessage("Password must be at least 6 characters");
          setLoading(false);
          return;
        }

        const res = await signUp(email, password, name);
        if (!res.success) {
          setErrorMessage(res.error || "Sign up failed");
        } else {
          router.push(res.nextPath || "/dashboard");
        }
      } else {
        const res = await signIn(email, password);
        if (!res.success) {
          setErrorMessage(res.error || "Invalid email or password");
        } else {
          router.push(res.nextPath || "/dashboard");
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMessage(null);
    setGoogleLoading(true);
    try {
      const res = await signInWithGoogle();
      if (!res.success) {
        setErrorMessage(res.error || "Google authentication failed");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Google authentication failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthCard
      currentStep="auth"
      title={mode === "signup" ? "Create your SaaS account" : "Welcome back to EcosystemRealty"}
      subtitle={
        mode === "signup"
          ? "Start closing high-ticket Indian real estate deals with high velocity."
          : "Sign in to access your sales cockpit and team performance."
      }
      footerContent={
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <span>
            {mode === "signup" ? "Already have an account?" : "Don't have an account yet?"}
          </span>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setErrorMessage(null);
            }}
            className="font-semibold text-primary hover:underline"
          >
            {mode === "signup" ? "Log in" : "Sign up free"}
          </button>
        </div>
      }
    >
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2 animate-in fade-in-50">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Google OAuth Button */}
      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={googleLoading || loading}
        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-card hover:bg-muted text-foreground font-medium text-sm rounded-lg border border-border transition-all active:scale-[0.99] disabled:opacity-60 shadow-xs"
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
        )}
        <span>{mode === "signup" ? "Sign up with Google" : "Log in with Google"}</span>
      </button>

      <div className="relative flex items-center justify-center my-2">
        <div className="border-t border-border w-full" />
        <span className="bg-card px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium relative">
          Or continue with email
        </span>
      </div>

      {/* Main Email / Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vikram Malhotra"
                className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-foreground"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground block">Work Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@realtycompany.in"
              className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-foreground"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground block">Password</label>
            {mode === "login" && (
              <button
                type="button"
                className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
                onClick={() => alert("Password reset link will be sent to your email.")}
              >
                Forgot password?
              </button>
            )}
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-10 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-foreground"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {mode === "signup" && (
            <p className="text-[11px] text-muted-foreground">Minimum 6 characters</p>
          )}
        </div>

        {/* Instant 1-Click Demo Login */}
        <div className="p-3 rounded-xl border border-border/80 bg-secondary/30 space-y-2 text-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            ⚡ Instant Demo Login (1-Click, No Password Needed):
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => signInAsDemo("salesperson")}
              className="p-2 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 text-left transition-all active:scale-[0.98] shadow-xs"
            >
              <div className="font-bold text-xs flex items-center gap-1">
                <span>⚡</span> Salesperson
              </div>
              <div className="text-[10px] text-emerald-800 font-medium">Rahul Sharma (Gurgaon)</div>
            </button>

            <button
              type="button"
              onClick={() => signInAsDemo("manager")}
              className="p-2 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-950 text-left transition-all active:scale-[0.98] shadow-xs"
            >
              <div className="font-bold text-xs flex items-center gap-1">
                <span>📋</span> Manager
              </div>
              <div className="text-[10px] text-blue-800 font-medium">Priya Kapoor</div>
            </button>

            <button
              type="button"
              onClick={() => signInAsDemo("owner")}
              className="p-2 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 text-left transition-all active:scale-[0.98] shadow-xs"
            >
              <div className="font-bold text-xs flex items-center gap-1">
                <span>👑</span> Owner
              </div>
              <div className="text-[10px] text-amber-800 font-medium">Vikram Malhotra</div>
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:bg-primary-hover transition-all active:scale-[0.99] disabled:opacity-60 shadow-sm mt-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <span>{mode === "signup" ? "Continue to Organization Setup" : "Sign In to Cockpit"}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}

