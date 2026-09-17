"use client";

import * as React from "react";
import {
  Users as UsersIcon,
  Plus,
  Shield,
  UserCheck,
  MapPin,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Copy,
  Check,
  Send,
  X,
  Clock,
} from "lucide-react";
import { useCRM } from "@repo/core/context/crm-context";
import { Button } from "@repo/ui/components/button";
import { Badge } from "@repo/ui/components/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@repo/ui/components/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@repo/ui/components/table";
import { Avatar, AvatarFallback } from "@repo/ui/components/avatar";
import { User, TeamInvitation } from "@repo/core/types/crm";
import { toast } from "sonner";
import { isManagerRole } from "@repo/core/lib/rbac";

export function UsersPage() {
  const {
    currentUser,
    users,
    regions,
    invitations,
    inviteTeamMember,
    revokeInvitation,
    updateUserRole,
  } = useCRM();

  const isManager = isManagerRole(currentUser.role);

  // Invite Modal
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("salesperson");
  const [inviteRegionId, setInviteRegionId] = React.useState("");
  const [isInviting, setIsInviting] = React.useState(false);
  const [generatedInviteUrl, setGeneratedInviteUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Edit Role Modal
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [editRole, setEditRole] = React.useState("salesperson");
  const [editRegionId, setEditRegionId] = React.useState("");
  const [isUpdatingRole, setIsUpdatingRole] = React.useState(false);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsInviting(true);
    try {
      const res = await inviteTeamMember(inviteEmail.trim(), inviteRole, inviteRegionId || undefined);
      if (res?.inviteUrl) {
        const fullUrl = `${window.location.origin}${res.inviteUrl}`;
        setGeneratedInviteUrl(fullUrl);
      } else {
        setIsInviteOpen(false);
        setInviteEmail("");
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedInviteUrl) return;
    navigator.clipboard.writeText(generatedInviteUrl);
    setCopied(true);
    toast.success("Invitation link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUpdatingRole(true);
    try {
      const success = await updateUserRole(editingUser.id, editRole, editRegionId || undefined);
      if (success) {
        setEditingUser(null);
      }
    } finally {
      setIsUpdatingRole(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Team Members & Regional Permissions
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage organization members, role-based access control, seat allocations, and sales regional assignments.
          </p>
        </div>

        {isManager && (
          <Button
            size="sm"
            onClick={() => {
              setGeneratedInviteUrl(null);
              setInviteEmail("");
              setIsInviteOpen(true);
            }}
            className="gap-1.5 shadow-subtle text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>Invite Team Member</span>
          </Button>
        )}
      </div>

      {/* Active Team Members List/Table */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-foreground">Active Organization Members ({users.length})</h2>

        {/* Mobile View: Cards */}
        <div className="space-y-2.5 sm:hidden">
          {users.map((u) => (
            <div key={u.id} className="p-3.5 rounded-xl border border-border bg-card shadow-subtle space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-8 w-8 text-xs">
                    <AvatarFallback className="bg-secondary text-foreground font-bold">
                      {u.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-bold text-foreground">{u.name}</div>
                    <div className="text-muted-foreground text-[11px] font-mono">{u.email || "—"}</div>
                  </div>
                </div>

                <Badge
                  variant={
                    u.role === "owner"
                      ? "default"
                      : u.role === "manager"
                      ? "secondary"
                      : "outline"
                  }
                  className="capitalize text-[10px]"
                >
                  {u.role}
                </Badge>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px]">
                <span className="text-muted-foreground">
                  {u.regionName ? `${u.regionName} Hub` : "All Regions (Admin)"}
                </span>

                {isManager && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingUser(u);
                      setEditRole(u.role);
                      setEditRegionId(u.regionId || "");
                    }}
                    className="h-8 text-xs px-2.5 gap-1 font-semibold"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit Role</span>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden sm:block rounded-xl border border-border bg-card overflow-hidden shadow-subtle">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User / Sales Rep</TableHead>
                <TableHead>Email Address</TableHead>
                <TableHead>Assigned Role</TableHead>
                <TableHead>Assigned Regional Hub</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-7 w-7 text-xs">
                        <AvatarFallback className="bg-secondary text-foreground font-semibold">
                          {u.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="font-semibold text-foreground">{u.name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{u.email || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        u.role === "owner"
                          ? "default"
                          : u.role === "manager"
                          ? "secondary"
                          : "outline"
                      }
                      className="capitalize text-[11px]"
                    >
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-foreground">
                      {u.regionName ? `${u.regionName} Hub` : "All Regions (Admin)"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {isManager ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingUser(u);
                          setEditRole(u.role);
                          setEditRegionId(u.regionId || "");
                        }}
                        className="h-7 text-xs px-2 gap-1"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Edit Role</span>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pending Invitations Section */}
      {isManager && (
        <div className="space-y-3 pt-4">
          <h2 className="text-sm font-bold text-foreground">
            Pending Team Invitations ({invitations.filter((i) => i.status === "pending").length})
          </h2>
          {invitations.length === 0 ? (
            <Card className="p-6 text-center text-xs text-muted-foreground border-dashed border-border bg-card">
              No pending invitations. Click &quot;Invite Team Member&quot; to add new sales representatives.
            </Card>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-subtle">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invited Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned Hub</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-semibold text-xs text-foreground">{inv.email}</TableCell>
                      <TableCell className="capitalize text-xs">{inv.role}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{inv.regionName || "All Regions"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={inv.status === "pending" ? "outline" : "secondary"}
                          className={`text-[10px] ${
                            inv.status === "pending"
                              ? "border-amber-500/30 text-amber-600 dark:text-amber-400"
                              : ""
                          }`}
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground font-mono">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {inv.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => revokeInvitation(inv.id)}
                            className="h-7 text-xs text-destructive hover:text-destructive px-2"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Revoke
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-border shadow-2xl bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold text-foreground">Invite New Team Member</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsInviteOpen(false)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {generatedInviteUrl ? (
                <div className="space-y-4 text-xs">
                  <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 space-y-1.5">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 block flex items-center gap-1.5">
                      <Check className="h-4 w-4" /> Invitation Link Generated!
                    </span>
                    <p className="text-muted-foreground">
                      Share this one-time secure onboarding link with your new recruit to join the organization:
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <input
                        type="text"
                        readOnly
                        value={generatedInviteUrl}
                        className="w-full h-8 px-2 rounded border border-border bg-card font-mono text-[11px] text-foreground"
                      />
                      <Button size="sm" onClick={handleCopyLink} className="h-8 shrink-0 gap-1 text-xs">
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copied ? "Copied" : "Copy"}</span>
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => setIsInviteOpen(false)} className="h-8 text-xs">
                      Done
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendInvite} className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-bold text-foreground block mb-1">Colleague Email Address *</label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="e.g. rep@realestateagency.com"
                      className="w-full h-8 px-2.5 rounded border border-border bg-secondary/50 text-foreground font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-foreground block mb-1">CRM Role *</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full h-8 px-2.5 rounded border border-border bg-secondary/50 text-foreground font-medium"
                      >
                        <option value="salesperson">Salesperson</option>
                        <option value="manager">Sales Manager</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-foreground block mb-1">Assigned Regional Hub</label>
                      <select
                        value={inviteRegionId}
                        onChange={(e) => setInviteRegionId(e.target.value)}
                        className="w-full h-8 px-2.5 rounded border border-border bg-secondary/50 text-foreground font-medium"
                      >
                        <option value="">All Regions</option>
                        {regions.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsInviteOpen(false)}
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={isInviting} className="h-8 text-xs font-semibold gap-1.5">
                      <Send className="h-3.5 w-3.5" />
                      <span>{isInviting ? "Generating..." : "Generate Invite"}</span>
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-border shadow-2xl bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold text-foreground">Edit Member Role: {editingUser.name}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setEditingUser(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveRole} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-foreground block mb-1">Role Permission *</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full h-8 px-2.5 rounded border border-border bg-secondary/50 text-foreground font-medium"
                  >
                    <option value="salesperson">Salesperson</option>
                    <option value="manager">Sales Manager</option>
                    {currentUser.role === "owner" && <option value="owner">Transfer Owner</option>}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Assigned Regional Hub</label>
                  <select
                    value={editRegionId}
                    onChange={(e) => setEditRegionId(e.target.value)}
                    className="w-full h-8 px-2.5 rounded border border-border bg-secondary/50 text-foreground font-medium"
                  >
                    <option value="">All Regions (Unrestricted)</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingUser(null)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isUpdatingRole}
                    className="h-8 text-xs font-semibold"
                  >
                    {isUpdatingRole ? "Saving..." : "Save Role"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
