"use client";

import * as React from "react";
import { Mic, MicOff, Square, Check, X, Loader2, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { useVoiceRecorder, VoiceLanguage } from "@/hooks/use-voice-recorder";

interface VoiceNoteRecorderProps {
  onTranscribed: (transcriptText: string, structuredData?: any) => void;
  className?: string;
  buttonLabel?: string;
  variant?: "inline" | "floating" | "button_only";
  defaultLanguage?: VoiceLanguage;
  saveAudio?: boolean;
}

export function VoiceNoteRecorder({
  onTranscribed,
  className = "",
  buttonLabel = "Dictate Note",
  variant = "inline",
  defaultLanguage = "en-IN",
  saveAudio = false,
}: VoiceNoteRecorderProps) {
  const [language, setLanguage] = React.useState<VoiceLanguage>(defaultLanguage);
  const [consentGiven, setConsentGiven] = React.useState(false);
  const [hasConsentedThisSession, setHasConsentedThisSession] = React.useState(false);

  const {
    isRecording,
    isTranscribing,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder(onTranscribed, language, saveAudio && consentGiven);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleConsentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConsentGiven(e.target.checked);
    setHasConsentedThisSession(true);
  };

  if (isTranscribing) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium ${className}`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
        <span>AI Transcribing Voice Note...</span>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs font-medium animate-pulse shadow-lg ${className}`}>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
          </span>
          <span className="font-mono text-xs font-bold text-rose-300">
            {formatTime(recordingDuration)}
          </span>
        </div>

        <div className="flex items-center gap-0.5 h-3.5">
          <span className="w-0.5 h-2 bg-rose-400 rounded-full animate-bounce"></span>
          <span className="w-0.5 h-3.5 bg-rose-400 rounded-full animate-bounce [animation-delay:0.15s]"></span>
          <span className="w-0.5 h-1.5 bg-rose-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
          <span className="w-0.5 h-3 bg-rose-400 rounded-full animate-bounce [animation-delay:0.45s]"></span>
          <span className="w-0.5 h-2 bg-rose-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
        </div>

        <span className="text-[11px] text-rose-300/90 hidden sm:inline">
          {language === "hi-IN" ? "Hindi" : "English"}
        </span>

        <div className="flex items-center gap-1 ml-auto">
          <Button
            type="button"
            size="sm"
            onClick={stopRecording}
            className="h-6 px-2 text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white gap-1"
          >
            <Square className="h-2.5 w-2.5 fill-current" />
            <span>Done</span>
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={cancelRecording}
            className="h-6 w-6 text-rose-300 hover:text-white hover:bg-rose-900/50"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-900/60 p-0.5 rounded-md border border-slate-700">
          <button
            type="button"
            onClick={() => { setLanguage("en-IN"); setHasConsentedThisSession(false); }}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              language === "en-IN"
                ? "bg-slate-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => { setLanguage("hi-IN"); setHasConsentedThisSession(false); }}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              language === "hi-IN"
                ? "bg-slate-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            HI
          </button>
        </div>

        {saveAudio && !hasConsentedThisSession && (
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={handleConsentChange}
              className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-primary focus:ring-primary"
            />
            <span>Save audio</span>
          </label>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={startRecording}
        className={`h-7 px-2.5 text-xs font-medium gap-1.5 border-slate-700 bg-slate-800/40 text-slate-300 hover:text-amber-300 hover:border-amber-500/40 hover:bg-amber-500/10 transition-all ${className}`}
      >
        <Mic className="h-3.5 w-3.5 text-amber-400" />
        <span>{buttonLabel}</span>
        <Sparkles className="h-2.5 w-2.5 text-amber-400/80" />
      </Button>
    </div>
  );
}