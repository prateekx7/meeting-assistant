from __future__ import annotations

import re
from collections import Counter
from datetime import datetime
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Response
from fastapi.responses import PlainTextResponse

from .database import get_connection, init_db, row_to_dict, rows_to_dicts, seed_db
from .schemas import ActionItemCreate, ActionItemUpdate, MeetingCreate, MeetingUpdate

app = FastAPI(title="Fireflies Clone API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()
    seed_db()


def seconds_to_stamp(seconds: int) -> str:
    minutes, secs = divmod(seconds, 60)
    return f"{minutes:02d}:{secs:02d}"


def parse_transcript(text: str, fallback_speakers: list[str]) -> list[tuple[str, int, int, str]]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        lines = [
            "Host: Welcome everyone. Today we will review progress and agree on next steps.",
            "Team: The highest priority is keeping owners clear and following up quickly.",
            "Host: Great. We will capture action items and share a summary after the meeting.",
        ]

    speakers = fallback_speakers or ["Speaker 1", "Speaker 2"]
    parsed: list[tuple[str, int, int, str]] = []
    cursor = 0
    speaker_index = 0
    for line in lines:
        match = re.match(r"^(?:(\d{1,2}:\d{2})\s+)?([^:]{2,40}):\s*(.+)$", line)
        if match:
            stamp, speaker, content = match.groups()
            if stamp:
                mins, secs = [int(part) for part in stamp.split(":")]
                cursor = mins * 60 + secs
        else:
            speaker = speakers[speaker_index % len(speakers)]
            content = line
            speaker_index += 1
        duration = max(12, min(38, len(content.split()) * 3))
        parsed.append((speaker.strip(), cursor, cursor + duration, content.strip()))
        cursor += duration + 2
    return parsed


def summarize_segments(segments: list[tuple[str, int, int, str]]) -> str:
    words = " ".join(segment[3] for segment in segments).split()
    if not words:
        return "The meeting captured discussion, decisions, and follow-up work."
    opening = " ".join(words[:24]).rstrip(".,")
    return f"The meeting covered {opening.lower()}. Key decisions and next steps were captured for follow-up."


def infer_topics(segments: list[tuple[str, int, int, str]]) -> list[tuple[str, int, str]]:
    chunks = [segments[: max(1, len(segments) // 3)], segments[max(1, len(segments) // 3) : max(2, 2 * len(segments) // 3)], segments[max(2, 2 * len(segments) // 3) :]]
    topics: list[tuple[str, int, str]] = []
    for index, chunk in enumerate([chunk for chunk in chunks if chunk], start=1):
        text = " ".join(item[3] for item in chunk)
        common = [word for word, _ in Counter(re.findall(r"[A-Za-z]{5,}", text.lower())).most_common(3)]
        label = ", ".join(common).title() or "Discussion"
        topics.append((f"Chapter {index}: {label}", chunk[0][1], text[:130]))
    return topics


def hydrate_meeting(meeting_id: int) -> dict[str, Any]:
    with get_connection() as conn:
        meeting = row_to_dict(conn.execute("SELECT * FROM meetings WHERE id = ?", (meeting_id,)).fetchone())
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        meeting["participants"] = rows_to_dicts(
            conn.execute("SELECT * FROM participants WHERE meeting_id = ? ORDER BY id", (meeting_id,)).fetchall()
        )
        meeting["segments"] = rows_to_dicts(
            conn.execute("SELECT * FROM transcript_segments WHERE meeting_id = ? ORDER BY start_seconds", (meeting_id,)).fetchall()
        )
        meeting["action_items"] = rows_to_dicts(
            conn.execute("SELECT * FROM action_items WHERE meeting_id = ? ORDER BY completed, id", (meeting_id,)).fetchall()
        )
        meeting["topics"] = rows_to_dicts(
            conn.execute("SELECT * FROM topics WHERE meeting_id = ? ORDER BY start_seconds", (meeting_id,)).fetchall()
        )
    return meeting


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/meetings")
def list_meetings(
    search: str = "",
    participant: str = "",
    date: str = "",
    sort: str = Query(default="recent", pattern="^(recent|oldest|title)$"),
) -> list[dict[str, Any]]:
    order = {
        "recent": "m.meeting_date DESC",
        "oldest": "m.meeting_date ASC",
        "title": "m.title COLLATE NOCASE ASC",
    }[sort]
    filters = []
    params: list[Any] = []
    if search:
        filters.append("(m.title LIKE ? OR p.name LIKE ? OR t.text LIKE ?)")
        term = f"%{search}%"
        params.extend([term, term, term])
    if participant:
        filters.append("p.name LIKE ?")
        params.append(f"%{participant}%")
    if date:
        filters.append("date(m.meeting_date) = date(?)")
        params.append(date)
    where = f"WHERE {' AND '.join(filters)}" if filters else ""
    with get_connection() as conn:
        rows = conn.execute(
            f"""
            SELECT DISTINCT m.*, COUNT(DISTINCT t.id) AS transcript_count
            FROM meetings m
            LEFT JOIN participants p ON p.meeting_id = m.id
            LEFT JOIN transcript_segments t ON t.meeting_id = m.id
            {where}
            GROUP BY m.id
            ORDER BY {order}
            """,
            params,
        ).fetchall()
        meetings = rows_to_dicts(rows)
        for meeting in meetings:
            meeting["participants"] = rows_to_dicts(
                conn.execute("SELECT * FROM participants WHERE meeting_id = ? ORDER BY id", (meeting["id"],)).fetchall()
            )
    return meetings


@app.post("/api/meetings", status_code=201)
def create_meeting(payload: MeetingCreate) -> dict[str, Any]:
    participant_names = [name.strip() for name in payload.participants if name.strip()] or ["Speaker 1", "Speaker 2"]
    segments = parse_transcript(payload.transcript_text, participant_names)
    summary = summarize_segments(segments)
    topics = infer_topics(segments)
    colors = ["#8B5CF6", "#10B981", "#F59E0B", "#06B6D4", "#EC4899"]
    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO meetings (title, meeting_date, duration_seconds, summary, sentiment)
            VALUES (?, ?, ?, ?, ?)
            """,
            (payload.title, payload.meeting_date, payload.duration_seconds, summary, "Neutral"),
        )
        meeting_id = cur.lastrowid
        for index, name in enumerate(participant_names):
            conn.execute(
                """
                INSERT INTO participants (meeting_id, name, role, avatar_color, talk_ratio)
                VALUES (?, ?, ?, ?, ?)
                """,
                (meeting_id, name, "Participant", colors[index % len(colors)], round(100 / len(participant_names))),
            )
        conn.executemany(
            """
            INSERT INTO transcript_segments (meeting_id, speaker, start_seconds, end_seconds, text)
            VALUES (?, ?, ?, ?, ?)
            """,
            [(meeting_id, *segment) for segment in segments],
        )
        conn.executemany(
            "INSERT INTO topics (meeting_id, title, start_seconds, notes) VALUES (?, ?, ?, ?)",
            [(meeting_id, *topic) for topic in topics],
        )
        conn.execute(
            """
            INSERT INTO action_items (meeting_id, assignee, text, due_label)
            VALUES (?, ?, ?, ?)
            """,
            (meeting_id, participant_names[0], "Review generated notes and confirm follow-up owners", "Today"),
        )
    return hydrate_meeting(meeting_id)


@app.get("/api/meetings/{meeting_id}")
def get_meeting(meeting_id: int) -> dict[str, Any]:
    return hydrate_meeting(meeting_id)


@app.patch("/api/meetings/{meeting_id}")
def update_meeting(meeting_id: int, payload: MeetingUpdate) -> dict[str, Any]:
    hydrate_meeting(meeting_id)
    updates = payload.model_dump(exclude_unset=True)
    participant_names = updates.pop("participants", None)
    if updates:
        assignments = ", ".join(f"{key} = ?" for key in updates)
        with get_connection() as conn:
            conn.execute(f"UPDATE meetings SET {assignments} WHERE id = ?", [*updates.values(), meeting_id])
    if participant_names is not None:
        names = [name.strip() for name in participant_names if name.strip()]
        with get_connection() as conn:
            conn.execute("DELETE FROM participants WHERE meeting_id = ?", (meeting_id,))
            for index, name in enumerate(names):
                conn.execute(
                    """
                    INSERT INTO participants (meeting_id, name, role, avatar_color, talk_ratio)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (meeting_id, name, "Participant", ["#8B5CF6", "#10B981", "#F59E0B", "#06B6D4"][index % 4], round(100 / max(1, len(names)))),
                )
    return hydrate_meeting(meeting_id)


@app.delete("/api/meetings/{meeting_id}", status_code=204, response_class=Response)
def delete_meeting(meeting_id: int) -> Response:
    hydrate_meeting(meeting_id)
    with get_connection() as conn:
        conn.execute("DELETE FROM meetings WHERE id = ?", (meeting_id,))
    return Response(status_code=204)


@app.post("/api/meetings/{meeting_id}/action-items", status_code=201)
def create_action_item(meeting_id: int, payload: ActionItemCreate) -> dict[str, Any]:
    hydrate_meeting(meeting_id)
    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO action_items (meeting_id, assignee, text, due_label)
            VALUES (?, ?, ?, ?)
            """,
            (meeting_id, payload.assignee, payload.text, payload.due_label),
        )
        return row_to_dict(conn.execute("SELECT * FROM action_items WHERE id = ?", (cur.lastrowid,)).fetchone()) or {}


@app.patch("/api/action-items/{item_id}")
def update_action_item(item_id: int, payload: ActionItemUpdate) -> dict[str, Any]:
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    if "completed" in updates:
        updates["completed"] = 1 if updates["completed"] else 0
    with get_connection() as conn:
        existing = conn.execute("SELECT * FROM action_items WHERE id = ?", (item_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Action item not found")
        assignments = ", ".join(f"{key} = ?" for key in updates)
        conn.execute(f"UPDATE action_items SET {assignments} WHERE id = ?", [*updates.values(), item_id])
        return row_to_dict(conn.execute("SELECT * FROM action_items WHERE id = ?", (item_id,)).fetchone()) or {}


@app.get("/api/search")
def global_search(q: str = Query(min_length=1)) -> list[dict[str, Any]]:
    term = f"%{q}%"
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT m.id AS meeting_id, m.title, m.meeting_date, t.speaker, t.start_seconds, t.text
            FROM transcript_segments t
            JOIN meetings m ON m.id = t.meeting_id
            WHERE t.text LIKE ? OR m.title LIKE ?
            ORDER BY m.meeting_date DESC, t.start_seconds ASC
            LIMIT 40
            """,
            (term, term),
        ).fetchall()
    return rows_to_dicts(rows)


@app.get("/api/meetings/{meeting_id}/export", response_class=PlainTextResponse)
def export_meeting(meeting_id: int) -> str:
    meeting = hydrate_meeting(meeting_id)
    lines = [
        f"# {meeting['title']}",
        f"Date: {datetime.fromisoformat(meeting['meeting_date']).strftime('%b %d, %Y %I:%M %p')}",
        "",
        "## Summary",
        meeting["summary"],
        "",
        "## Action Items",
    ]
    lines.extend(
        f"- [{'x' if item['completed'] else ' '}] {item['assignee']}: {item['text']} ({item['due_label'] or 'No due date'})"
        for item in meeting["action_items"]
    )
    lines.extend(["", "## Transcript"])
    lines.extend(
        f"- {seconds_to_stamp(segment['start_seconds'])} {segment['speaker']}: {segment['text']}"
        for segment in meeting["segments"]
    )
    return "\n".join(lines)
