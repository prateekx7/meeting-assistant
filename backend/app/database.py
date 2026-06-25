from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent.parent / "fireflies_clone.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return {key: row[key] for key in row.keys()}


def rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [row_to_dict(row) or {} for row in rows]


def init_db() -> None:
    with get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS meetings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                meeting_date TEXT NOT NULL,
                duration_seconds INTEGER NOT NULL,
                language TEXT NOT NULL DEFAULT 'English (Global)',
                owner TEXT NOT NULL DEFAULT 'Demo User',
                summary TEXT NOT NULL,
                sentiment TEXT NOT NULL DEFAULT 'Neutral',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meeting_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                role TEXT,
                avatar_color TEXT NOT NULL DEFAULT '#8B5CF6',
                talk_ratio INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY(meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS transcript_segments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meeting_id INTEGER NOT NULL,
                speaker TEXT NOT NULL,
                start_seconds INTEGER NOT NULL,
                end_seconds INTEGER NOT NULL,
                text TEXT NOT NULL,
                is_highlighted INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY(meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS action_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meeting_id INTEGER NOT NULL,
                assignee TEXT NOT NULL,
                text TEXT NOT NULL,
                due_label TEXT,
                completed INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY(meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS topics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meeting_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                start_seconds INTEGER NOT NULL,
                notes TEXT NOT NULL,
                FOREIGN KEY(meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
            );

            CREATE TRIGGER IF NOT EXISTS meetings_updated_at
            AFTER UPDATE ON meetings
            BEGIN
                UPDATE meetings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END;
            """
        )


def seed_db() -> None:
    with get_connection() as conn:
        count = conn.execute("SELECT COUNT(*) AS count FROM meetings").fetchone()["count"]
        if count:
            return

        meetings = [
            {
                "title": "Product Managers & UX",
                "meeting_date": "2026-06-18T10:30:00",
                "duration_seconds": 2310,
                "summary": "The team reviewed onboarding friction, agreed to prototype a contextual setup video, and aligned on owner assignments for launch-readiness follow-up.",
                "sentiment": "Positive",
                "participants": [
                    ("Jane Cooper", "Product", "#8B5CF6", 34),
                    ("Robert Fox", "UX", "#10B981", 28),
                    ("Floyd Miles", "Support", "#F59E0B", 22),
                    ("Kristin Watson", "Engineering", "#06B6D4", 16),
                ],
                "segments": [
                    ("Jane Cooper", 0, 16, "Thanks everyone. The core agenda is onboarding drop-off and whether the video prompt helps users finish setup."),
                    ("Robert Fox", 17, 38, "The research calls show people understand the value, but they do not know which integrations to connect first."),
                    ("Floyd Miles", 39, 63, "Support tickets mention the same thing. Customers ask if Google Meet or Zoom should be configured before inviting teammates."),
                    ("Kristin Watson", 64, 91, "Technically we can detect their calendar provider and put that integration at the top of the checklist."),
                    ("Jane Cooper", 92, 118, "Great. Let's make the prototype opinionated and measure completion rate, setup time, and invite conversion."),
                    ("Robert Fox", 119, 151, "I will create two versions: a short video card and an inline checklist with smart defaults."),
                    ("Floyd Miles", 152, 181, "I can tag recent tickets and send exact customer language to Robert by tomorrow."),
                    ("Kristin Watson", 182, 214, "Engineering can instrument the funnel this sprint as long as the event names are finalized today."),
                    ("Jane Cooper", 215, 248, "Action items are clear. Robert owns the prototype, Floyd sends examples, and Kristin owns analytics events."),
                ],
                "topics": [
                    ("Chapter 1: Onboarding gap", 0, "Customers understand value but need clearer setup sequencing."),
                    ("Chapter 2: Prototype options", 92, "Video card and smart checklist will be tested."),
                    ("Chapter 3: Measurement plan", 182, "Completion rate, setup time, and invite conversion are success metrics."),
                ],
                "actions": [
                    ("Robert Fox", "Create video card and smart checklist prototypes", "Friday", 0),
                    ("Floyd Miles", "Send recent support ticket language to UX", "Tomorrow", 1),
                    ("Kristin Watson", "Finalize analytics event names for onboarding funnel", "Today", 0),
                ],
            },
            {
                "title": "Revenue Forecast Review",
                "meeting_date": "2026-06-20T16:00:00",
                "duration_seconds": 1840,
                "summary": "Revenue is pacing slightly above plan, but enterprise renewals need executive attention. The team agreed to update the forecast model and prepare a board-ready risk note.",
                "sentiment": "Neutral",
                "participants": [
                    ("Aisha Patel", "Finance", "#EC4899", 42),
                    ("Ben Carter", "Sales", "#6366F1", 33),
                    ("Mina Lee", "Customer Success", "#14B8A6", 25),
                ],
                "segments": [
                    ("Aisha Patel", 0, 24, "We are four percent above plan for June, mostly because mid-market expansion came in earlier than expected."),
                    ("Ben Carter", 25, 57, "Pipeline coverage is healthy, but two enterprise renewals moved into legal review and may slip into July."),
                    ("Mina Lee", 58, 92, "Both accounts are active and satisfied. The delay is procurement, not product risk."),
                    ("Aisha Patel", 93, 126, "Let's keep the upside in the model but mark those renewals as timing risk for the board packet."),
                    ("Ben Carter", 127, 164, "I will update the close-date assumptions and add notes from the account executives."),
                    ("Mina Lee", 165, 198, "I will schedule executive check-ins so procurement has a clear escalation path."),
                ],
                "topics": [
                    ("Chapter 1: June pacing", 0, "Mid-market expansion lifted current month performance."),
                    ("Chapter 2: Renewal timing risk", 25, "Two large renewals may slip because of procurement/legal review."),
                    ("Chapter 3: Board packet updates", 93, "Forecast notes will separate upside from timing risk."),
                ],
                "actions": [
                    ("Ben Carter", "Update close-date assumptions in the revenue model", "Today", 0),
                    ("Mina Lee", "Schedule executive check-ins for two enterprise renewals", "This week", 0),
                    ("Aisha Patel", "Add timing-risk note to the board packet", "Monday", 0),
                ],
            },
            {
                "title": "Engineering Sprint Planning",
                "meeting_date": "2026-06-23T11:00:00",
                "duration_seconds": 2760,
                "summary": "The sprint will focus on transcript search performance, action item editing, and export reliability. The team reduced scope to protect quality.",
                "sentiment": "Positive",
                "participants": [
                    ("Nora Singh", "Engineering Manager", "#22C55E", 31),
                    ("Leo Grant", "Backend", "#A855F7", 29),
                    ("Sam Rivera", "Frontend", "#F97316", 26),
                    ("Ivy Chen", "QA", "#0EA5E9", 14),
                ],
                "segments": [
                    ("Nora Singh", 0, 20, "This sprint needs to balance the transcript search refactor with a few visible product improvements."),
                    ("Leo Grant", 21, 52, "Backend can add full-text indexes and keep the existing endpoint response shape stable."),
                    ("Sam Rivera", 53, 89, "On the frontend I want to preserve the Fireflies-style layout while making transcript search feel instant."),
                    ("Ivy Chen", 90, 118, "QA needs sample meetings that include long transcripts, repeated words, and multiple speakers."),
                    ("Nora Singh", 119, 150, "Let's cut the optional collaboration panel and focus on search, action item editing, and export."),
                    ("Leo Grant", 151, 185, "I will ship the SQLite migration and add API tests around search results."),
                    ("Sam Rivera", 186, 220, "I will handle highlighted matches and current playback state in the transcript panel."),
                    ("Ivy Chen", 221, 252, "I will write regression notes and test exports from at least three seeded meetings."),
                ],
                "topics": [
                    ("Chapter 1: Sprint priorities", 0, "Search performance and visible workflows are the focus."),
                    ("Chapter 2: Scope control", 119, "Collaboration panel is deferred to reduce risk."),
                    ("Chapter 3: QA coverage", 221, "Seeded data and export checks will cover regression risk."),
                ],
                "actions": [
                    ("Leo Grant", "Add SQLite search indexes and backend tests", "Wednesday", 0),
                    ("Sam Rivera", "Implement highlighted transcript matches", "Wednesday", 1),
                    ("Ivy Chen", "Validate exports from three seeded meetings", "Thursday", 0),
                ],
            },
        ]

        for meeting in meetings:
            cur = conn.execute(
                """
                INSERT INTO meetings (title, meeting_date, duration_seconds, summary, sentiment)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    meeting["title"],
                    meeting["meeting_date"],
                    meeting["duration_seconds"],
                    meeting["summary"],
                    meeting["sentiment"],
                ),
            )
            meeting_id = cur.lastrowid
            conn.executemany(
                """
                INSERT INTO participants (meeting_id, name, role, avatar_color, talk_ratio)
                VALUES (?, ?, ?, ?, ?)
                """,
                [(meeting_id, *participant) for participant in meeting["participants"]],
            )
            conn.executemany(
                """
                INSERT INTO transcript_segments (meeting_id, speaker, start_seconds, end_seconds, text)
                VALUES (?, ?, ?, ?, ?)
                """,
                [(meeting_id, *segment) for segment in meeting["segments"]],
            )
            conn.executemany(
                """
                INSERT INTO topics (meeting_id, title, start_seconds, notes)
                VALUES (?, ?, ?, ?)
                """,
                [(meeting_id, *topic) for topic in meeting["topics"]],
            )
            conn.executemany(
                """
                INSERT INTO action_items (meeting_id, assignee, text, due_label, completed)
                VALUES (?, ?, ?, ?, ?)
                """,
                [(meeting_id, *action) for action in meeting["actions"]],
            )
