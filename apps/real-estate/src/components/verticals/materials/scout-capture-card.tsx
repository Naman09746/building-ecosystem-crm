"use client";

import * as React from "react";
import {
  Camera,
  MapPin,
  UploadCloud,
  CheckCircle2,
  Sparkles,
  Phone,
  User,
  Building,
  Layers,
  AlertCircle,
  Clock,
  Mic,
  Image as ImageIcon,
  X,
  Navigation,
} from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { VoiceNoteRecorder } from "@/components/crm/voice-note-recorder";
import { toast } from "sonner";
import type {
  MaterialsFieldScout,
  FieldScoutPhase,
} from "@repo/core/types/materials-extensions";

interface ScoutCaptureCardProps {
  onScouted?: (scout: MaterialsFieldScout) => void;
}

const CONSTRUCTION_PHASES: { id: FieldScoutPhase; label: string; materials: string[]; color: string }[] = [
  { id: "excavation", label: "Excavation / Earthwork", materials: ["PCC Cement", "Aggregates", "Shuttering Ply"], color: "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { id: "foundation", label: "Foundation / Raft", materials: ["OPC 53 Cement", "Fe 550D TMT Steel", "Ready-Mix (RMC)"], color: "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400" },
  { id: "superstructure", label: "Columns & Slab Casting", materials: ["PPC Cement", "TMT Rebar", "AAC Blocks", "Fly Ash Bricks"], color: "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { id: "finishing", label: "Plaster & Finishing", materials: ["Wall Putty", "Vitrified Tiles", "Tile Adhesive", "Sanitaryware"], color: "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { id: "renovation", label: "Remodeling / Renovation", materials: ["White Cement", "Waterproofing", "Paints", "Plumbing"], color: "border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400" },
];

export function ScoutCaptureCard({ onScouted }: ScoutCaptureCardProps) {
  const [siteTitle, setSiteTitle] = React.useState("");
  const [addressText, setAddressText] = React.useState("");
  const [geoLat, setGeoLat] = React.useState<number | null>(28.6139);
  const [geoLong, setGeoLong] = React.useState<number | null>(77.2090);
  const [isGettingLocation, setIsGettingLocation] = React.useState(false);
  const [phase, setPhase] = React.useState<FieldScoutPhase>("foundation");
  const [selectedMaterials, setSelectedMaterials] = React.useState<string[]>(["OPC 53 Cement", "Fe 550D TMT Steel"]);
  const [contractorName, setContractorName] = React.useState("");
  const [contractorPhone, setContractorPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Auto-acquire current GPS location
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLat(pos.coords.latitude);
        setGeoLong(pos.coords.longitude);
        setIsGettingLocation(false);
        toast.success(`GPS Tagged: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        if (!addressText) {
          setAddressText(`Near Lat ${pos.coords.latitude.toFixed(4)}, Long ${pos.coords.longitude.toFixed(4)}`);
        }
      },
      () => {
        setIsGettingLocation(false);
        toast.info("Using default depot vicinity GPS coordinates.");
      },
      { timeout: 8000 }
    );
  };

  // Trigger location on mount once
  React.useEffect(() => {
    handleGetLocation();
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        toast.success("Site photo attached");
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhaseSelect = (selectedPhase: FieldScoutPhase) => {
    setPhase(selectedPhase);
    const pInfo = CONSTRUCTION_PHASES.find((p) => p.id === selectedPhase);
    if (pInfo) {
      setSelectedMaterials(pInfo.materials);
    }
  };

  const toggleMaterial = (m: string) => {
    setSelectedMaterials((prev) =>
      prev.includes(m) ? prev.filter((item) => item !== m) : [...prev, m]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteTitle.trim()) {
      toast.error("Please provide a site name or landmark");
      return;
    }
    if (!notes.trim() || notes.trim().length < 5) {
      toast.error("Mandatory: Please write a field reconnaissance note.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newScout: MaterialsFieldScout = {
        id: crypto.randomUUID(),
        orgId: "org-materials-default",
        scoutedByName: "Field Rep (You)",
        title: siteTitle.trim(),
        geoLat: geoLat || 28.6139,
        geoLong: geoLong || 77.2090,
        addressText: addressText.trim() || "Unspecified Location",
        photoUrls: photoPreview ? [photoPreview] : [],
        estimatedPhase: phase,
        estimatedMaterialNeeds: selectedMaterials,
        potentialValue: phase === "foundation" ? 850000 : 450000,
        status: "raw",
        contractorContactName: contractorName.trim() || undefined,
        contractorContactPhone: contractorPhone.trim() || undefined,
        notes: notes.trim(),
        scoutedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      if (onScouted) {
        onScouted(newScout);
      }
      toast.success(`Scouted opportunity "${newScout.title}" recorded & added to Radar!`);

      // Reset
      setSiteTitle("");
      setAddressText("");
      setContractorName("");
      setContractorPhone("");
      setNotes("");
      setPhotoPreview(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit site scout");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card text-card-foreground rounded-xl border border-border p-4 sm:p-5 shadow-subtle space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center font-bold">
            <Camera className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Scout New Construction Site</h3>
            <p className="text-[11px] text-muted-foreground">Rep snaps photo + GPS location → system grabs opportunity</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGetLocation}
          className="flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20"
        >
          <Navigation className={`h-3 w-3 ${isGettingLocation ? "animate-spin" : ""}`} />
          <span>{geoLat ? `${geoLat.toFixed(3)}, ${geoLong?.toFixed(3)}` : "Tag GPS"}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Photo Upload / Camera Snap */}
        <div>
          <Label className="text-xs font-semibold text-foreground block mb-1">
            Site Photo / Excavation Board
          </Label>
          {photoPreview ? (
            <div className="relative rounded-lg overflow-hidden border border-border max-h-48 group">
              <img src={photoPreview} alt="Site" className="w-full h-44 object-cover" />
              <button
                type="button"
                onClick={() => setPhotoPreview(null)}
                className="absolute top-2 right-2 p-1 rounded-full bg-background/80 text-foreground hover:bg-background shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-white font-mono flex items-center gap-1">
                <MapPin className="h-3 w-3 text-emerald-400" />
                {geoLat?.toFixed(4)}, {geoLong?.toFixed(4)}
              </div>
            </div>
          ) : (
            <label className="border-2 border-dashed border-border hover:border-emerald-500/50 rounded-lg p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-secondary/15 hover:bg-secondary/30 transition-all text-center">
              <Camera className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">
                Tap to Take Photo or Upload
              </span>
              <span className="text-[10px] text-muted-foreground">
                Site boundary, billboard, foundation work or contractor truck
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Site Name & Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <Label className="text-xs font-semibold text-foreground">Site Title / Project Name *</Label>
            <Input
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              placeholder="e.g. G+4 Commercial Complex / Plot 82"
              className="h-9 text-xs bg-secondary/30 mt-1"
              required
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-foreground">Address / Nearby Landmark</Label>
            <Input
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              placeholder="e.g. Near Fortis Hospital, Sector 62"
              className="h-9 text-xs bg-secondary/30 mt-1"
            />
          </div>
        </div>

        {/* Construction Phase Selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Detected Construction Phase</span>
            <span className="text-[10px] text-muted-foreground">Determines immediate material demand</span>
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {CONSTRUCTION_PHASES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePhaseSelect(p.id)}
                className={`py-1.5 px-2 rounded-md text-xs font-semibold border text-left transition-all ${
                  phase === p.id
                    ? `${p.color} ring-1 ring-emerald-500 font-bold`
                    : "border-border bg-secondary/20 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{p.label}</span>
                  {phase === p.id && <CheckCircle2 className="h-3 w-3 shrink-0 ml-1" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Material Needs Pills */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-foreground">Estimated Material Demand</Label>
          <div className="flex flex-wrap gap-1.5">
            {[
              "OPC 53 Cement",
              "PPC Cement",
              "Fe 550D TMT Steel",
              "Ready-Mix (RMC)",
              "AAC Blocks",
              "Fly Ash Bricks",
              "Wall Putty",
              "Tiles",
            ].map((mat) => {
              const isSelected = selectedMaterials.includes(mat);
              return (
                <button
                  key={mat}
                  type="button"
                  onClick={() => toggleMaterial(mat)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {mat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Site Contact / Contractor (If met on ground) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <User className="h-3 w-3 text-muted-foreground" />
              Site Supervisor / Contractor Name
            </Label>
            <Input
              value={contractorName}
              onChange={(e) => setContractorName(e.target.value)}
              placeholder="e.g. Munna Mistri / Contractor Manoj"
              className="h-9 text-xs bg-secondary/30 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <Phone className="h-3 w-3 text-muted-foreground" />
              Contact Phone
            </Label>
            <Input
              type="tel"
              value={contractorPhone}
              onChange={(e) => setContractorPhone(e.target.value)}
              placeholder="e.g. 9811223344"
              className="h-9 text-xs font-mono bg-secondary/30 mt-1"
            />
          </div>
        </div>

        {/* Mandatory Field Notes with Voice Dictation */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="scout-notes" className="text-xs font-semibold text-foreground">
              Field Observation & Conclusion *
            </Label>
            <VoiceNoteRecorder
              buttonLabel="Speak Note"
              onTranscribed={(transcript) => {
                setNotes((prev) => (prev ? `${prev} ${transcript}` : transcript));
              }}
            />
          </div>
          <textarea
            id="scout-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Spoke with site supervisor Manoj. Foundation raft casting starts next Tuesday. Current supplier is late on deliveries. Good opening to pitch our UltraTech OPC."
            className="w-full text-xs bg-secondary/30 border border-border focus:border-emerald-500 focus:bg-background rounded-lg p-2.5 outline-none transition-colors resize-none placeholder:text-muted-foreground/60"
            required
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-10 gap-2 shadow-sm"
        >
          <UploadCloud className="h-4 w-4" />
          <span>Save Site Scout & Pin to Radar</span>
        </Button>
      </form>
    </div>
  );
}
