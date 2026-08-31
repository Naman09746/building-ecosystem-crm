"use client";

import * as React from "react";
import {
  Contact,
  Search,
  Phone,
  MessageSquare,
  Plus,
  Building2,
  Calendar,
  Clock,
  User,
  History,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { useCRM } from "@/context/crm-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { PipelineBadge, TaskStatusBadge } from "@/components/ui/status-badge";
import { formatCurrencyINR, formatPhone } from "@/lib/utils";
import { Person, Lead } from "@/types/crm";
import { useIsMobile } from "@/hooks/use-device";

export function PeoplePage() {
  const { people, leads, activities } = useCRM();
  const [search, setSearch] = React.useState("");
  const [selectedPerson, setSelectedPerson] = React.useState<Person | null>(null);
  const [profileOpen, setProfileOpen] = React.useState(false);

  const filteredPeople = people.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search) ||
      (p.email && p.email.toLowerCase().includes(search.toLowerCase())) ||
      ((p.regionName || p.city) && (p.regionName || p.city)!.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenPerson = (person: Person) => {
    setSelectedPerson(person);
    setProfileOpen(true);
  };

  // Enquiries and activities for selected person
  const personLeads = selectedPerson
    ? leads.filter((l) => l.personId === selectedPerson.id || l.phone === selectedPerson.phone)
    : [];

  const personActivities = selectedPerson
    ? activities.filter((a) => personLeads.some((l) => l.id === a.leadId))
    : [];

  const totalInquiredBudget = personLeads.reduce((acc, l) => acc + (l.budget || 0), 0);

  const isMobile = useIsMobile();

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Contact className="h-5 w-5 text-primary" />
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground">
              People Directory & 360° Contact Dossier
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Deduplicated master contact directory with multi-project inquiry tracking and communication history.
          </p>
        </div>

        <span className="text-xs font-mono text-muted-foreground self-start sm:self-auto">
          {people.length} Verified Contacts
        </span>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3.5 rounded-xl border border-border bg-card shadow-subtle flex items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts by name, phone, city..."
            className="pl-8 h-9 text-xs bg-secondary/40 rounded-xl"
          />
        </div>
        <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
          Showing {filteredPeople.length} contacts
        </span>
      </div>

      {/* Contacts List: Mobile Cards vs Desktop Table */}
      {isMobile ? (
        <div className="space-y-3">
          {filteredPeople.map((p) => {
            const pLeads = leads.filter((l) => l.personId === p.id || l.phone === p.phone);
            const pVal = pLeads.reduce((acc, l) => acc + (l.budget || 0), 0);

            return (
              <div
                key={p.id}
                onClick={() => handleOpenPerson(p)}
                className="p-3.5 rounded-xl border border-border bg-card shadow-subtle space-y-3 cursor-pointer hover:border-primary/40 active:scale-[0.99] transition-all text-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-sm text-foreground">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">{formatPhone(p.phone)}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block uppercase font-bold">Inquired Value</span>
                    <span className="font-bold font-mono text-foreground text-xs">{formatCurrencyINR(pVal)}</span>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-secondary/40 text-[11px] flex items-center justify-between">
                  <span className="text-muted-foreground">{p.regionName || p.city || "NCR Hub"}</span>
                  <div className="flex items-center gap-1">
                    {p.associatedProjectNames?.slice(0, 2).map((projName, i) => (
                      <span key={i} className="bg-card border border-border px-1.5 py-0.2 rounded font-medium text-foreground text-[10px]">
                        {projName}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 44px Touch Action Row */}
                <div className="flex items-center gap-2 pt-1 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={`tel:${p.phone}`}
                    className="flex-1 inline-flex items-center justify-center h-10 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white"
                  >
                    <Phone className="h-3.5 w-3.5 mr-1" />
                    Call
                  </a>
                  <a
                    href={`https://wa.me/${p.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center h-10 px-3 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1" />
                    WhatsApp
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact Profile</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>City / Region</TableHead>
              <TableHead>Project Enquiries</TableHead>
              <TableHead>Total Inquired Value</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPeople.map((p) => {
              const pLeads = leads.filter((l) => l.personId === p.id || l.phone === p.phone);
              const pVal = pLeads.reduce((acc, l) => acc + (l.budget || 0), 0);

              return (
                <TableRow
                  key={p.id}
                  onClick={() => handleOpenPerson(p)}
                  className="cursor-pointer hover:bg-secondary/40 transition-colors"
                >
                  <TableCell>
                    <div className="font-bold text-foreground text-sm">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      Client since {new Date(p.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold text-foreground">
                    {formatPhone(p.phone)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{p.email || "—"}</TableCell>
                  <TableCell className="text-xs font-medium text-foreground">{p.regionName || p.city || "NCR Hub"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {p.associatedProjectNames?.map((projName, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-secondary px-1.5 py-0.5 rounded font-medium text-foreground"
                        >
                          {projName}
                        </span>
                      )) || <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono font-bold text-foreground text-xs">
                    {formatCurrencyINR(pVal)}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <a
                        href={`tel:${p.phone}`}
                        className="inline-flex items-center justify-center h-7 px-2 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                      >
                        <Phone className="h-3 w-3 mr-1" />
                        Call
                      </a>
                      <a
                        href={`https://wa.me/${p.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center h-7 px-2 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                      >
                        <MessageSquare className="h-3 w-3" />
                      </a>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* 360° Contact Profile Modal */}
      {selectedPerson && (
        <ResponsiveModal
          open={profileOpen}
          onOpenChange={setProfileOpen}
          className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto p-5"
        >
          <div className="space-y-4">
            <div className="pb-3 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {selectedPerson.name}
                  </h2>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">
                    {formatPhone(selectedPerson.phone)} {selectedPerson.email && `• ${selectedPerson.email}`}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${selectedPerson.phone}`}
                    className="inline-flex items-center justify-center h-8 px-2.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                  >
                    <Phone className="h-3.5 w-3.5 mr-1" />
                    Call
                  </a>
                  <a
                    href={`https://wa.me/${selectedPerson.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center h-8 px-2.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1" />
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>

            {/* Profile Content */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg border border-border bg-secondary/30">
                <span className="text-[10px] text-muted-foreground block uppercase font-bold">Total Inquiries</span>
                <span className="text-base font-bold text-foreground font-mono">{personLeads.length}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-secondary/30">
                <span className="text-[10px] text-muted-foreground block uppercase font-bold">Cumulative Budget</span>
                <span className="text-base font-bold font-mono text-foreground">{formatCurrencyINR(totalInquiredBudget)}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-secondary/30">
                <span className="text-[10px] text-muted-foreground block uppercase font-bold">Preferred Hub</span>
                <span className="text-xs font-bold text-foreground truncate block">{selectedPerson.regionName || selectedPerson.city || "NCR Hub"}</span>
              </div>
            </div>

            {/* Inquiries List */}
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Project Enquiries & Pipeline Status</h3>
              {personLeads.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                  No active project enquiries found.
                </div>
              ) : (
                personLeads.map((l) => (
                  <div key={l.id} className="p-3 rounded-lg border border-border bg-secondary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-bold text-foreground flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        <span>{l.projectName}</span>
                        {l.assignedUnitNumber && (
                          <span className="text-[10px] font-mono font-bold bg-secondary px-1.5 py-0.2 rounded border border-border">
                            Unit {l.assignedUnitNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        Budget: {formatCurrencyINR(l.budget)} • Rep: {l.salespersonName}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <PipelineBadge stage={l.stage} />
                      <TaskStatusBadge status={l.followUpStatus || "upcoming"} />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Touchpoints Stream */}
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Touchpoints & Activity Log</h3>
              {personActivities.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                  No recorded touchpoints for this contact yet.
                </div>
              ) : (
                personActivities.map((act) => (
                  <div key={act.id} className="p-2.5 rounded-lg border border-border/80 bg-card space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-foreground capitalize">{act.type.replace("_", " ")}</span>
                      <span className="text-muted-foreground font-mono">
                        {new Date(act.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {act.notes && (
                      <p className="text-muted-foreground italic text-[11px]">&ldquo;{act.notes}&rdquo;</p>
                    )}
                    <div className="text-[10px] text-muted-foreground/80 flex items-center justify-between">
                      <span>Logged by {act.userName}</span>
                      {act.scheduledFollowUpAt && (
                        <span className="text-amber-800 font-semibold font-mono">
                          Next: {act.scheduledFollowUpAt}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </ResponsiveModal>
      )}
    </div>
  );
}
