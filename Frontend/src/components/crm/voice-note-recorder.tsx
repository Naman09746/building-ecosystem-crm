"use client";

import * as React from "react";
import { Mic, MicOff, Square, Check, X, Loader2, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";

interface VoiceNoteRecorderProps {
  onTranscribed: (text: string, structuredData?: any) => void;
  className?: string;
  buttonLabel?: string;
  variant?: "inline" | "floating" | "button_only";
}

export function VoiceNoteRecorder({
  onTranscribed,
  className = "",
  buttonLabel = "Dictate Note",
  variant = "inline",
}: VoiceNoteRecorderProps) {
  const {
    isRecording,
    isTranscribing,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder(onTranscribed);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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
        {/* Pulsing red indicator */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
          </span>
          <span className="font-mono text-xs font-bold text-rose-300">
            {formatTime(recordingDuration)}
          </span>
        </div>

        {/* Audio Waveform Bars Simulation */}
        <div className="flex items-center gap-0.5 h-3.5">
          <span className="w-0.5 h-2 bg-rose-400 rounded-full animate-bounce"></span>
          <span className="w-0.5 h-3.5 bg-rose-400 rounded-full animate-bounce [animation-delay:0.15s]"></span>
          <span className="w-0.5 h-1.5 bg-rose-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
          <span className="w-0.5 h-3 bg-rose-400 rounded-full animate-bounce [animation-delay:0.45s]"></span>
          <span className="w-0.5 h-2 bg-rose-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
        </div>

        <span className="text-[11px] text-rose-300/90 hidden sm:inline">Listening (English / Hindi)...</span>

        {/* Action Controls */}
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
  );
}
