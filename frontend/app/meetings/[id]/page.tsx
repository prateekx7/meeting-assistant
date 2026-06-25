"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ClipboardList,
  Download,
  Edit3,
  MessageCircle,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Send,
  SkipBack,
  SkipForward,
  Trash2,
  Video,
  X
} from "lucide-react";
import { AiSidebar } from "@/components/AiSidebar";
import { AppShell } from "@/components/AppShell";
import { Toast } from "@/components/Toast";
import { createActionItem, deleteMeeting, exportMeeting, getMeeting, updateActionItem, updateMeeting } from "@/lib/api";
import { formatDate, formatDuration, formatStamp, initials } from "@/lib/format";
import type { Meeting } from "@/lib/types";

function highlighted(text: string, query: string) {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={`${part}-${index}`}>{part}</mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

export default function MeetingDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [activeTab, setActiveTab] = useState<"thread" | "video" | "soundbites">("thread");
  const [query, setQuery] = useState("");
  const [currentTime, setCurrentTime] = useState(Number(searchParams.get("t") ?? 0));
  const [playing, setPlaying] = useState(false);
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftParticipants, setDraftParticipants] = useState("");
  const [newAction, setNewAction] = useState("");
  const [comment, setComment] = useState("");
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    getMeeting(params.id).then((data) => {
      setMeeting(data);
      setDraftTitle(data.title);
      setDraftParticipants(data.participants.map((item) => item.name).join(", "));
    });
  }, [params.id]);

  useEffect(() => {
    if (!playing || !meeting) return;
    timer.current = window.setInterval(() => {
      setCurrentTime((time) => (time >= meeting.duration_seconds ? 0 : time + 1));
    }, 1000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [playing, meeting]);

  const activeSegmentId = useMemo(() => {
    return meeting?.segments.find((segment) => currentTime >= segment.start_seconds && currentTime <= segment.end_seconds)?.id;
  }, [meeting, currentTime]);

  if (!meeting) {
    return (
      <AppShell>
        <div className="loading-screen">Loading meeting...</div>
      </AppShell>
    );
  }

  async function saveMetadata(event: FormEvent) {
    event.preventDefault();
    if (!meeting) return;
    const updated = await updateMeeting(meeting.id, {
      title: draftTitle,
      participants: draftParticipants.split(",").map((item) => item.trim()).filter(Boolean)
    });
    setMeeting(updated);
    setEditing(false);
    setToast("Meeting updated");
  }

  async function addAction(event: FormEvent) {
    event.preventDefault();
    if (!meeting) return;
    if (!newAction.trim()) return;
    const created = await createActionItem(meeting.id, {
      assignee: meeting.participants[0]?.name ?? "Owner",
      text: newAction,
      due_label: "Next"
    });
    setMeeting({ ...meeting, action_items: [...meeting.action_items, created] });
    setNewAction("");
    setToast("Action item added");
  }

  async function toggleAction(id: number, completed: boolean) {
    if (!meeting) return;
    const updated = await updateActionItem(id, { completed });
    setMeeting({
      ...meeting,
      action_items: meeting.action_items.map((item) => (item.id === id ? updated : item))
    });
  }

  async function downloadExport() {
    if (!meeting) return;
    const markdown = await exportMeeting(meeting.id);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${meeting.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("Markdown export downloaded");
  }

  async function removeMeeting() {
    if (!meeting) return;
    await deleteMeeting(meeting.id);
    router.push("/");
  }

  async function copyLink() {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
    }
    setToast("Meeting link copied");
  }

  function cycleSpeed() {
    const speeds = [1, 1.25, 1.5, 2];
    setPlaybackSpeed((speed) => {
      const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
      setToast(`Playback speed set to ${next}x`);
      return next;
    });
  }

  function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!comment.trim()) return;
    setComment("");
    setToast("Comment added to meeting thread");
  }

  return (
    <AppShell>
      <div className="meeting-detail">
        <header className="detail-topbar">
          <div className="detail-title-row">
            <Link className="icon-button" href="/" aria-label="Back to meetings">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <p className="eyebrow">Notepad</p>
              <h1>{meeting.title}</h1>
              <p className="detail-meta">
                {formatDate(meeting.meeting_date)} · {formatDuration(meeting.duration_seconds)} · {meeting.language}
              </p>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="button ghost" onClick={() => setEditing(true)}>
              <Edit3 size={16} />
              Edit
            </button>
            <button className="button ghost" onClick={downloadExport}>
              <Download size={16} />
              Export
            </button>
            <button className="button primary" onClick={copyLink}>
              Copy Link
            </button>
            <button className="icon-button danger" onClick={removeMeeting} aria-label="Delete meeting">
              <Trash2 size={17} />
            </button>
          </div>
        </header>

        <div className="detail-layout">
          <AiSidebar meeting={meeting} />

          <section className="notes-panel">
            <div className="tabbar">
              <button className={activeTab === "thread" ? "active" : ""} onClick={() => setActiveTab("thread")}>
                <MessageCircle size={17} />
                Thread
              </button>
              <button className={activeTab === "video" ? "active" : ""} onClick={() => setActiveTab("video")}>
                <Video size={17} />
                Video
              </button>
              <button className={activeTab === "soundbites" ? "active" : ""} onClick={() => setActiveTab("soundbites")}>
                <ClipboardList size={17} />
                Soundbites
              </button>
            </div>

            {activeTab === "thread" && (
              <div className="thread-content">
                <section className="summary-block">
                  <h2>AI Summary</h2>
                  <p>{meeting.summary}</p>
                </section>

                <section className="summary-block">
                  <h2>Outline</h2>
                  <div className="topic-list">
                    {meeting.topics.map((topic) => (
                      <button key={topic.id} onClick={() => setCurrentTime(topic.start_seconds)}>
                        <span>{topic.title}</span>
                        <small>{formatStamp(topic.start_seconds)}</small>
                        <p>{topic.notes}</p>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="summary-block">
                  <div className="block-heading">
                    <h2>Action items</h2>
                    <span>{meeting.action_items.filter((item) => !item.completed).length} open</span>
                  </div>
                  <div className="action-list">
                    {meeting.action_items.map((item) => (
                      <label key={item.id} className={item.completed ? "done" : ""}>
                        <input type="checkbox" checked={Boolean(item.completed)} onChange={(event) => toggleAction(item.id, event.target.checked)} />
                        <span>
                          <strong>{item.assignee}</strong>
                          {item.text}
                          <small>{item.due_label || "No due date"}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                  <form className="add-action" onSubmit={addAction}>
                    <input value={newAction} onChange={(event) => setNewAction(event.target.value)} placeholder="Add an action item" />
                    <button className="icon-button" aria-label="Add action item">
                      <Plus size={17} />
                    </button>
                  </form>
                </section>
              </div>
            )}

            {activeTab === "video" && (
              <div className="video-placeholder">
                <div className="video-grid">
                  {meeting.participants.map((person) => (
                    <div key={person.id} style={{ borderColor: person.avatar_color }}>
                      <span>{initials(person.name)}</span>
                      <small>{person.name}</small>
                    </div>
                  ))}
                </div>
                <button className="play-float" onClick={() => setPlaying((value) => !value)} aria-label="Toggle playback">
                  {playing ? <Pause size={24} /> : <Play size={24} />}
                </button>
              </div>
            )}

            {activeTab === "soundbites" && (
              <div className="soundbite-placeholder">
                <h2>Soundbites</h2>
                <p>Coming soon: shareable clips and highlighted moments from the transcript.</p>
              </div>
            )}
          </section>

          <aside className="transcript-panel">
            <div className="transcript-header">
              <h2>Transcript</h2>
              <div className="transcript-search">
                <Search size={16} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find in transcript" />
              </div>
            </div>
            <div className="transcript-list">
              {meeting.segments.map((segment) => {
                const visible = !query || segment.text.toLowerCase().includes(query.toLowerCase()) || segment.speaker.toLowerCase().includes(query.toLowerCase());
                if (!visible) return null;
                return (
                  <button
                    key={segment.id}
                    className={`transcript-line ${activeSegmentId === segment.id ? "active" : ""}`}
                    onClick={() => setCurrentTime(segment.start_seconds)}
                  >
                    <span className="avatar small">{initials(segment.speaker)}</span>
                    <span className="line-body">
                      <strong>
                        {segment.speaker}
                        <small>{formatStamp(segment.start_seconds)}</small>
                      </strong>
                      <span>{highlighted(segment.text, query)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>

        <footer className="player-bar">
          <button className="icon-button" onClick={() => setCurrentTime(Math.max(0, currentTime - 15))} aria-label="Back 15 seconds">
            <SkipBack size={18} />
          </button>
          <button className="player-main" onClick={() => setPlaying((value) => !value)} aria-label="Toggle playback">
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button className="icon-button" onClick={() => setCurrentTime(Math.min(meeting.duration_seconds, currentTime + 15))} aria-label="Forward 15 seconds">
            <SkipForward size={18} />
          </button>
          <span>{formatStamp(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={meeting.duration_seconds}
            value={currentTime}
            onChange={(event) => setCurrentTime(Number(event.target.value))}
            aria-label="Playback position"
          />
          <span>{formatStamp(meeting.duration_seconds)}</span>
          <button className="icon-button" onClick={() => setCurrentTime(0)} aria-label="Restart">
            <RotateCcw size={17} />
          </button>
          <button className="button ghost" onClick={cycleSpeed}>
            {playbackSpeed}x
          </button>
        </footer>
      </div>

      {editing && (
        <div className="modal-backdrop">
          <form className="modal-panel compact" onSubmit={saveMetadata}>
            <div className="modal-header">
              <h2>Edit meeting</h2>
              <button type="button" className="icon-button" onClick={() => setEditing(false)} aria-label="Close edit modal">
                <X size={18} />
              </button>
            </div>
            <label>
              Title
              <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} />
            </label>
            <label>
              Participants
              <input value={draftParticipants} onChange={(event) => setDraftParticipants(event.target.value)} />
            </label>
            <div className="modal-actions">
              <button type="button" className="button ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className="button primary">
                <Check size={16} />
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      <form className="comment-compose" onSubmit={submitComment}>
        <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Make a comment" />
        <button className="icon-button" aria-label="Send comment placeholder">
          <Send size={17} />
        </button>
      </form>
      <Toast message={toast} onClose={() => setToast("")} />
    </AppShell>
  );
}
