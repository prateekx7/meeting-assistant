"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Plus, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CreateMeetingModal } from "@/components/CreateMeetingModal";
import { Toast } from "@/components/Toast";
import { deleteMeeting, globalSearch, listMeetings } from "@/lib/api";
import { formatDate, formatDuration, formatStamp, initials } from "@/lib/format";
import type { MeetingListItem, SearchHit } from "@/lib/types";

export default function DashboardPage() {
  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [search, setSearch] = useState("");
  const [participant, setParticipant] = useState("");
  const [date, setDate] = useState("");
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);

  const participantOptions = useMemo(() => {
    const names = meetings.flatMap((meeting) => meeting.participants.map((person) => person.name));
    return Array.from(new Set(names)).sort();
  }, [meetings]);

  async function load() {
    setLoading(true);
    try {
      const data = await listMeetings({ search, participant, date, sort });
      setMeetings(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const id = window.setTimeout(load, 180);
    return () => window.clearTimeout(id);
  }, [search, participant, date, sort]);

  useEffect(() => {
    let active = true;
    if (search.trim().length < 2) {
      setHits([]);
      return;
    }
    globalSearch(search).then((data) => {
      if (active) setHits(data.slice(0, 5));
    });
    return () => {
      active = false;
    };
  }, [search]);

  async function removeMeeting(id: number) {
    await deleteMeeting(id);
    setMeetings((current) => current.filter((meeting) => meeting.id !== id));
    setToast("Meeting deleted");
  }

  function sendInvite() {
    setToast(inviteEmail ? `Invite prepared for ${inviteEmail}` : "Invite link copied");
    setInviteEmail("");
    setInviteOpen(false);
  }

  function clearFilters() {
    setSearch("");
    setParticipant("");
    setDate("");
    setSort("recent");
    setToast("Filters cleared");
  }

  return (
    <AppShell>
      <div className="dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">Notebook</p>
            <h1>Meetings</h1>
          </div>
          <div className="topbar-actions">
            <button className="button ghost" onClick={() => setInviteOpen(true)}>
              Invite Coworkers
            </button>
            <button className="button primary" onClick={() => setModalOpen(true)}>
              <Plus size={17} />
              New meeting
            </button>
            <button className="profile-chip" onClick={() => setToast("Profile settings panel opened from the side rail")}>
              PS
            </button>
          </div>
        </header>

        <section className="dashboard-controls">
          <div className="search-box">
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search meetings, participants, transcripts" />
          </div>
          <select value={participant} onChange={(event) => setParticipant(event.target.value)}>
            <option value="">All participants</option>
            {participantOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="recent">Most recent</option>
            <option value="oldest">Oldest</option>
            <option value="title">Title</option>
          </select>
          <button className="icon-button" aria-label="Filter settings" onClick={() => setShowFilters((value) => !value)}>
            <SlidersHorizontal size={18} />
          </button>
        </section>

        {showFilters && (
          <section className="filter-panel">
            <button onClick={() => setSort("recent")}>Recent first</button>
            <button onClick={() => setDate(new Date().toISOString().slice(0, 10))}>Today</button>
            <button onClick={() => setSearch("action")}>Action mentions</button>
            <button onClick={clearFilters}>Clear filters</button>
          </section>
        )}

        {hits.length > 0 && (
          <section className="search-results">
            <p className="section-label">Transcript matches</p>
            {hits.map((hit) => (
              <Link key={`${hit.meeting_id}-${hit.start_seconds}`} href={`/meetings/${hit.meeting_id}?t=${hit.start_seconds}`}>
                <span>{hit.title}</span>
                <small>
                  {formatStamp(hit.start_seconds)} · {hit.speaker}
                </small>
                <p>{hit.text}</p>
              </Link>
            ))}
          </section>
        )}

        <section className="meeting-grid" aria-busy={loading}>
          {meetings.map((meeting) => (
            <article className="meeting-card" key={meeting.id}>
              <Link href={`/meetings/${meeting.id}`} className="meeting-card-main">
                <div className="meeting-card-header">
                  <div>
                    <h2>{meeting.title}</h2>
                    <p>
                      <CalendarDays size={14} />
                      {formatDate(meeting.meeting_date)} · {formatDuration(meeting.duration_seconds)}
                    </p>
                  </div>
                  <ChevronRight size={19} />
                </div>
                <p className="meeting-summary">{meeting.summary}</p>
                <div className="participant-row">
                  {meeting.participants.slice(0, 4).map((participant) => (
                    <span className="avatar" style={{ backgroundColor: participant.avatar_color }} key={participant.id} title={participant.name}>
                      {initials(participant.name)}
                    </span>
                  ))}
                  <span className="participant-copy">{meeting.participants.map((item) => item.name).join(", ")}</span>
                </div>
              </Link>
              <div className="meeting-card-footer">
                <span>{meeting.transcript_count} transcript lines</span>
                <span>{meeting.sentiment}</span>
                <button className="icon-button danger" onClick={() => removeMeeting(meeting.id)} aria-label={`Delete ${meeting.title}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
          {!loading && meetings.length === 0 && (
            <div className="empty-state">
              <h2>No meetings found</h2>
              <p>Try clearing filters or create a new transcript-backed meeting.</p>
            </div>
          )}
        </section>
      </div>

      <CreateMeetingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(meeting) => {
          setMeetings((current) => [meeting, ...current]);
          setToast("Meeting created");
        }}
      />
      {inviteOpen && (
        <div className="modal-backdrop">
          <div className="modal-panel compact">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Workspace invite</p>
                <h2>Invite coworker</h2>
              </div>
              <button className="icon-button" onClick={() => setInviteOpen(false)} aria-label="Close invite modal">
                <X size={17} />
              </button>
            </div>
            <label>
              Email
              <input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="teammate@company.com" />
            </label>
            <div className="modal-actions">
              <button className="button ghost" onClick={() => setToast("Share link copied")}>
                Copy invite link
              </button>
              <button className="button primary" onClick={sendInvite}>
                Send invite
              </button>
            </div>
          </div>
        </div>
      )}
      <Toast message={toast} onClose={() => setToast("")} />
    </AppShell>
  );
}
