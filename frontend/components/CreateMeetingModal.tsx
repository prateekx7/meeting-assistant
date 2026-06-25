"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { createMeeting } from "@/lib/api";
import type { Meeting } from "@/lib/types";

export function CreateMeetingModal({
  open,
  onClose,
  onCreated
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (meeting: Meeting) => void;
}) {
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 16));
  const [duration, setDuration] = useState(30);
  const [participants, setParticipants] = useState("");
  const [transcript, setTranscript] = useState("Host: Welcome everyone. Let's review priorities and owners.\nTeam: The first priority is shipping the transcript experience.\nHost: Great, please confirm action items by the end of day.");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const meeting = await createMeeting({
        title,
        meeting_date: new Date(meetingDate).toISOString(),
        duration_seconds: duration * 60,
        participants: participants.split(",").map((item) => item.trim()).filter(Boolean),
        transcript_text: transcript
      });
      onCreated(meeting);
      setTitle("");
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal-panel" onSubmit={onSubmit}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Upload transcript</p>
            <h2>Create meeting</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        <label>
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Customer onboarding review" required />
        </label>
        <div className="form-grid">
          <label>
            Date
            <input type="datetime-local" value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} required />
          </label>
          <label>
            Duration
            <input type="number" min="1" value={duration} onChange={(event) => setDuration(Number(event.target.value))} />
          </label>
        </div>
        <label>
          Participants
          <input value={participants} onChange={(event) => setParticipants(event.target.value)} placeholder="Jane Cooper, Robert Fox" />
        </label>
        <label>
          Transcript
          <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={8} />
        </label>
        <div className="modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={saving}>
            {saving ? "Creating..." : "Create meeting"}
          </button>
        </div>
      </form>
    </div>
  );
}
