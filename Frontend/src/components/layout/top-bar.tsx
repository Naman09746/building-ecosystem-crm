"use client";

import * as React from "react";
import { Search, Plus, User, Shield, Menu, LogOut, ExternalLink, RotateCcw } from "lucide-react";
import { useCRM } from "@/context/crm-context";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/layout/notification-bell";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { isManagerRole, roleLabel } from "@/lib/rbac";

interface TopBarProps {
  onOpenQuickLog: () => void;
  onOpenSearch: () => void;
  onToggleMobileMenu?: () => void;
}

export function TopBar({ onOpenQuickLog, onOpenSearch, onToggleMobileMenu }: TopBarProps) {
  const { currentUser, users, switchActiveUser } = useCRM();
  const { user: authUser, org, signOut, resetWorkflow } = useAuth();
  const [profileOpen, setProfileOpen] = React.useState(false);

  return (
    <header className="h-14 border-b border-border bg-card/95 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-subtle">
      {/* Mobile Menu Button & Search Trigger */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 rounded-md border border-border bg-secondary text-foreground"
            aria-label="Open Navigation Menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        {/* Global Search Bar Trigger */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-secondary/50 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-all w-44 sm:w-64"
        >
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate">Search leads, people...</span>
          <kbd className="hidden sm:inline-block ml-auto pointer-events-none text-[10px] font-mono border border-border/80 bg-card px-1 rounded text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Side: Quick Action, Notifications & User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <Button
          size="sm"
          onClick={onOpenQuickLog}
          className="h-8 text-xs font-semibold gap-1.5 shadow-subtle"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Log Activity</span>
          <span className="sm:hidden">Log</span>
        </Button>

        {/* In-App Notification Bell */}
        <NotificationBell />

        {/* Organization / Plan Badge */}
        {org?.plan && (
          <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
            {org.plan} Plan (Trial)
          </span>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-border hover:opacity-80 transition-opacity"
          >
            <Avatar className="h-7 w-7 text-xs">
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                {(authUser?.name || currentUser.name).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left leading-none">
              <div className="text-xs font-semibold text-foreground">
                {authUser?.name || currentUser.name}
              </div>
              <div className="text-[10px] text-muted-foreground capitalize">
                {org?.name || "Apex Realty"}
              </div>
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl py-2 z-50 animate-in fade-in-50 text-xs">
              <div className="px-3 py-2 border-b border-border">
                <p className="font-bold text-foreground">{authUser?.name || currentUser.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {authUser?.email || currentUser.email}
                </p>
                <p className="text-[10px] text-primary font-medium mt-1">
                  Org: {org?.name || "Apex Realty"} ({org?.teamSize || "6-20"} reps)
                </p>
              </div>

              {/* Role & Persona Switcher */}
              <div className="py-1 border-b border-border/80">
                <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Switch Persona
                </div>
                {users.slice(0, 3).map((u) => {
                  const isSelected = currentUser.id === u.id;
                  const isUserExec = isManagerRole(u.role);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        switchActiveUser(u.id);
                        setProfileOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors text-[11px]",
                        isSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span>{isUserExec ? "👑" : "⚡"}</span>
                        <span className="truncate">{u.name} ({roleLabel(u.role)})</span>
                      </div>
                      {isSelected && <span className="text-[10px] font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>

              <div className="py-1">
                <Link
                  href="/"
                  className="flex items-center gap-2 px-3 py-2 text-foreground hover:bg-muted transition-colors"
                  onClick={() => setProfileOpen(false)}
                >
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Public Landing Page</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    resetWorkflow();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-amber-600 hover:bg-amber-50 transition-colors text-left"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset SaaS Demo Funnel</span>
                </button>
              </div>

              <div className="border-t border-border pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 transition-colors text-left font-medium"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
