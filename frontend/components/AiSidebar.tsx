"use client";

import { CheckSquare, Clock3, HelpCircle, MessageSquareText, TrendingUp } from "lucide-react";
import type { Meeting } from "@/lib/types";
import { initials } from "@/lib/format";

const filters = [
  ["Tasks", 8, "#EEF2FF", CheckSquare],
  ["Questions", 12, "#FFF7ED", HelpCircle],
  ["Date & Time", 32, "#FDF2F8", Clock3],
  ["Metrics", 20, "#ECFEFF", TrendingUp],
  ["Topics", 16, "#F0FDF4", MessageSquareText]
] as const;

export function AiSidebar({ meeting }: { meeting: Meeting }) {
  return (
    <aside className="ai-sidebar">
      <div className="smart-search">
        <span>Smart Search</span>
      </div>
      <section>
        <p className="section-label">AI Filters</p>
        <div className="filter-pills">
          {filters.map(([label, count, color, Icon]) => (
            <button key={label} style={{ backgroundColor: color }}>
              <Icon size={14} />
              {label} · {count}
            </button>
          ))}
        </div>
      </section>
      <section>
        <p className="section-label">Sentiments</p>
        <div className="sentiment-row">
          <span>Neutral · 49%</span>
          <span className="positive">Positive · 38%</span>
          <span className="negative">Negative · 13%</span>
        </div>
      </section>
      <section>
        <p className="section-label">Speakers</p>
        <div className="speaker-list">
          {meeting.participants.map((participant) => (
            <div className="speaker-stat" key={participant.id}>
              <span className="avatar" style={{ backgroundColor: participant.avatar_color }}>
                {initials(participant.name)}
              </span>
              <div>
                <strong>{participant.name}</strong>
                <small>{participant.role || "Participant"}</small>
              </div>
              <span className="talk-ring">{participant.talk_ratio}%</span>
            </div>
          ))}
        </div>
      </section>
      <section>
        <p className="section-label">Integrations</p>
        <div className="placeholder-stack">
          <button>Zoom · Coming soon</button>
          <button>Google Meet · Coming soon</button>
          <button>CRM Sync · Coming soon</button>
        </div>
      </section>
    </aside>
  );
}
