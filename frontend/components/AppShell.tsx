"use client";

import Link from "next/link";
import { useState } from "react";
import { BarChart3, Calendar, CheckCircle2, Hash, Home, Settings, Sparkles, Upload, Users, X, Zap } from "lucide-react";

const tools = {
  calendar: {
    title: "Calendar",
    kicker: "Upcoming meetings",
    description: "Review scheduled recordings and preparation reminders.",
    items: ["Today 10:30 AM · Product sync", "Tomorrow 4:00 PM · Revenue review", "Friday 11:00 AM · Sprint retro"],
    action: "Connect calendar"
  },
  automations: {
    title: "Automations",
    kicker: "Bot rules",
    description: "Configure which meetings are auto-captured and summarized.",
    items: ["Auto-join internal calendar events", "Email summaries after every recording", "Create tasks when action items are detected"],
    action: "Save automation"
  },
  smart: {
    title: "Smart Search",
    kicker: "Ask across meetings",
    description: "Search across transcripts, summaries, owners, and action items.",
    items: ["Show customer objections", "Find every pricing discussion", "What did engineering commit to?"],
    action: "Run search"
  },
  topics: {
    title: "Topics",
    kicker: "Tracked themes",
    description: "Pinned topics help filter the library and group meeting insights.",
    items: ["Onboarding", "Revenue risk", "Transcript search", "Customer support", "Launch readiness"],
    action: "Add topic"
  },
  analytics: {
    title: "Analytics",
    kicker: "Meeting insights",
    description: "Quick pulse on meeting activity and follow-through.",
    items: ["3 meetings this week", "9 open action items", "38% positive sentiment", "26 transcript segments indexed"],
    action: "Refresh metrics"
  },
  team: {
    title: "Team",
    kicker: "Workspace members",
    description: "Invite teammates and manage sharing defaults.",
    items: ["Prateek Sharma · Owner", "Jane Cooper · Editor", "Robert Fox · Viewer"],
    action: "Invite teammate"
  },
  uploads: {
    title: "Uploads",
    kicker: "Import transcripts",
    description: "Use the New meeting button on the dashboard to paste a transcript and generate notes.",
    items: ["TXT transcript", "VTT captions", "JSON transcript", "Manual paste"],
    action: "Open dashboard"
  },
  settings: {
    title: "Settings",
    kicker: "Workspace preferences",
    description: "These preferences are mocked for the assignment but behave like app controls.",
    items: ["Default language: English", "Summary style: Concise", "Playback speed: 1x", "Notifications: Enabled"],
    action: "Save settings"
  }
} as const;

type ToolKey = keyof typeof tools;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);
  const [saved, setSaved] = useState("");
  const tool = activeTool ? tools[activeTool] : null;

  function runToolAction() {
    if (activeTool === "uploads") {
      window.location.href = "/";
      return;
    }
    setSaved(`${tool?.title} updated`);
    window.setTimeout(() => setSaved(""), 1800);
  }

  return (
    <div className="workspace">
      <aside className="rail" aria-label="Primary navigation">
        <Link className="brand-mark" href="/" title="Home">
          F
        </Link>
        <nav className="rail-icons">
          <Link className="rail-button active" href="/" title="Meetings">
            <Home size={19} />
          </Link>
          <button className="rail-button" title="Calendar" onClick={() => setActiveTool("calendar")}>
            <Calendar size={19} />
          </button>
          <button className="rail-button" title="Automations" onClick={() => setActiveTool("automations")}>
            <Zap size={19} />
          </button>
          <button className="rail-button" title="Smart search" onClick={() => setActiveTool("smart")}>
            <Sparkles size={19} />
          </button>
          <button className="rail-button" title="Topics" onClick={() => setActiveTool("topics")}>
            <Hash size={19} />
          </button>
          <button className="rail-button" title="Analytics" onClick={() => setActiveTool("analytics")}>
            <BarChart3 size={19} />
          </button>
          <button className="rail-button" title="Team" onClick={() => setActiveTool("team")}>
            <Users size={19} />
          </button>
          <button className="rail-button" title="Uploads" onClick={() => setActiveTool("uploads")}>
            <Upload size={19} />
          </button>
        </nav>
        <button className="rail-button rail-bottom" title="Settings" onClick={() => setActiveTool("settings")}>
          <Settings size={19} />
        </button>
      </aside>
      <main className="workspace-main">{children}</main>
      {tool && (
        <aside className="utility-drawer" aria-label={`${tool.title} panel`}>
          <div className="utility-header">
            <div>
              <p className="eyebrow">{tool.kicker}</p>
              <h2>{tool.title}</h2>
            </div>
            <button className="icon-button" onClick={() => setActiveTool(null)} aria-label="Close panel">
              <X size={17} />
            </button>
          </div>
          <p>{tool.description}</p>
          <div className="utility-list">
            {tool.items.map((item) => (
              <button key={item} onClick={() => setSaved(item)}>
                <CheckCircle2 size={16} />
                {item}
              </button>
            ))}
          </div>
          <button className="button primary utility-action" onClick={runToolAction}>
            {tool.action}
          </button>
          {saved && <div className="utility-status">{saved}</div>}
        </aside>
      )}
    </div>
  );
}
