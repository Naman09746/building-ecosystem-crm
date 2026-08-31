"use client";

import * as React from "react";
import { toast } from "sonner";

export interface VoiceRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  isTranscribing: boolean;
  recordingDuration: number;
  audioBlob: Blob | null;
  transcript: string;
  error: string | null;
}

export function useVoiceRecorder(onTranscribed?: (transcript: string, structuredData?: any) => void) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [isTranscribing, setIsTranscribing] = React.useState(false);
  const [recordingDuration, setRecordingDuration] = React.useState(0);
  const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null);
  const [transcript, setTranscript] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = React.useRef<any>(null);
  const liveSpeechTextRef = React.useRef<string>("");
  const onTranscribedRef = React.useRef(onTranscribed);

  React.useEffect(() => {
    onTranscribedRef.current = onTranscribed;
  }, [onTranscribed]);

  // Clean up timer on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const transcribeAudio = React.useCallback(async (blob: Blob, fallbackText?: string) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "voice_note.webm");
      if (fallbackText) {
        formData.append("text", fallbackText);
      }

      const res = await fetch("/api/audio/transcribe", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        const text = json.data?.transcript || fallbackText || "";
        setTranscript(text);
        if (onTranscribedRef.current) {
          onTranscribedRef.current(text, json.data);
        }
        toast.success("Voice note transcribed successfully!");
      } else {
        if (fallbackText) {
          setTranscript(fallbackText);
          if (onTranscribedRef.current) onTranscribedRef.current(fallbackText);
          toast.success("Voice note captured via speech engine");
        } else {
          toast.error("Failed to transcribe audio note");
        }
      }
    } catch {
      if (fallbackText) {
        setTranscript(fallbackText);
        if (onTranscribedRef.current) onTranscribedRef.current(fallbackText);
      } else {
        toast.error("Network error during audio transcription");
      }
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const startRecording = React.useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    setTranscript("");
    audioChunksRef.current = [];
    liveSpeechTextRef.current = "";

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Audio recording is not supported in this browser environment");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? { mimeType: "audio/webm;codecs=opus" }
        : { mimeType: "audio/mp4" };

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Stop all audio tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());

        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);
        await transcribeAudio(blob, liveSpeechTextRef.current);
      };

      // Also attach Web Speech API for instant real-time live preview if available in Chrome/Safari
      if (typeof window !== "undefined") {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          try {
            const recognition = new SpeechRec();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = "en-IN"; // English (India) / Hinglish friendly
            recognition.onresult = (event: any) => {
              let currentText = "";
              for (let i = 0; i < event.results.length; i++) {
                currentText += event.results[i][0].transcript + " ";
              }
              liveSpeechTextRef.current = currentText.trim();
              setTranscript(currentText.trim());
            };
            recognition.start();
            speechRecognitionRef.current = recognition;
          } catch {}
        }
      }

      recorder.start(500); // 500ms chunks
      setIsRecording(true);
      setIsPaused(false);
      setRecordingDuration(0);

      // Start Duration Timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("[VOICE_RECORDER_ERROR]", err);
      const msg = err.name === "NotAllowedError" ? "Microphone permission denied" : err.message || "Could not access microphone";
      setError(msg);
      toast.error(msg);
    }
  }, [transcribeAudio]);

  const stopRecording = React.useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  }, []);

  const cancelRecording = React.useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
    }

    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      } catch {}
    }

    setIsRecording(false);
    setIsPaused(false);
    setAudioBlob(null);
    setTranscript("");
    audioChunksRef.current = [];
  }, []);

  return {
    isRecording,
    isPaused,
    isTranscribing,
    recordingDuration,
    audioBlob,
    transcript,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
