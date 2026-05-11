"use client";

import { useState, useRef } from "react";
import { Upload, X, Phone, MessageSquare, Mail, Users } from "lucide-react";
import { InteractionType } from "@lms/types";
import { useAddInteraction, useUploadFile } from "@/hooks/useLeadDetail";
import { cn } from "@/lib/utils";

const TYPES = [
  { value: InteractionType.NOTE, label: "Note", icon: MessageSquare },
  { value: InteractionType.CALL, label: "Call", icon: Phone },
  { value: InteractionType.EMAIL, label: "Email", icon: Mail },
  { value: InteractionType.MEETING, label: "Meeting", icon: Users },
];

export function AddInteractionForm({ leadId }: { leadId: string }) {
  const [type, setType] = useState<InteractionType>(InteractionType.NOTE);
  const [note, setNote] = useState("");
  const [recording, setRecording] = useState<File | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addInteraction = useAddInteraction(leadId);
  const uploadFile = useUploadFile();

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setRecording(file);
    setIsUploading(true);

    try {
      const result = await uploadFile.mutateAsync({
        file,
        type: "recording",
      });
      setRecordingUrl(result.url);
    } catch {
      setRecording(null);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit() {
    if (!note.trim() && !recordingUrl) return;

    await addInteraction.mutateAsync({
      type,
      ...(note.trim() && { note: note.trim() }),
      ...(recordingUrl && { callRecordingUrl: recordingUrl }),
    });

    setNote("");
    setRecording(null);
    setRecordingUrl(null);
  }

  return (
    <div className="bg-white border border-surface-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Add Interaction
      </p>

      {/* Type selector */}
      <div className="flex gap-2 flex-wrap">
        {TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                type === t.value
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-600 border-surface-200 hover:border-primary",
              )}
            >
              <Icon size={12} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Note input */}
      <textarea
        title="Add interaction note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={
          type === InteractionType.CALL
            ? "What happened on the call? Any key points..."
            : type === InteractionType.EMAIL
              ? "Describe the email sent..."
              : "Write your note here..."
        }
        rows={3}
        className="w-full px-3 py-2.5 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary resize-none"
      />

      {/* Recording upload — only for CALL type */}
      {type === InteractionType.CALL && (
        <div>
          {recording ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-surface-50 rounded-lg border border-surface-200">
              <Phone size={13} className="text-primary" />
              <span className="text-xs text-gray-600 flex-1 truncate">
                {isUploading ? "Uploading..." : recording.name}
              </span>
              {!isUploading && (
                <button
                  type="button"
                  title="Remove recording"
                  onClick={() => {
                    setRecording(null);
                    setRecordingUrl(null);
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-surface-300 text-xs text-gray-500 hover:border-primary hover:text-primary transition-colors w-full"
            >
              <Upload size={13} />
              Upload call recording (optional)
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            title="Select call recording file"
            accept="audio/*,video/mp4"
            onChange={(e) => void handleFileSelect(e)}
            className="hidden"
          />
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          onClick={() => void handleSubmit()}
          disabled={
            (!note.trim() && !recordingUrl) ||
            addInteraction.isPending ||
            isUploading
          }
          className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-800 disabled:opacity-50 transition-colors"
        >
          {addInteraction.isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
