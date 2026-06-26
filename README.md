# Fireflies.ai Clone

A full-stack meeting notes and transcription workspace. The app recreates the core Fireflies post-meeting experience: meetings library, transcript detail view, AI notes, action items, search, CRUD, and a persistent SQLite backend.

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, plain CSS, lucide-react icons
- Backend: Python, FastAPI, SQLite
- Persistence: SQLite database created automatically at `backend/fireflies_clone.db`

## Features

- Meetings dashboard with title/date/duration/participants, search, participant/date filters, sorting, create, and delete
- Fireflies-style meeting detail page with AI filters, summary, outline, action items, transcript panel, and fixed player bar
- Interactive transcript: click transcript lines or outline chapters to seek the player
- Playback state highlights the active transcript segment
- Transcript search with highlighted matches
- Meeting metadata edit flow
- Add and complete action items
- Global transcript search from the dashboard
- Markdown export for meeting summary, actions, and transcript
- Placeholders for settings, integrations, team sharing, calendar, and real bot workflows

## Project Structure

```text
backend/
  app/
    database.py      SQLite schema, seed data, connection helpers
    main.py          FastAPI app and REST endpoints
    schemas.py       Pydantic request models
  requirements.txt

frontend/
  app/
    page.tsx                 Meetings dashboard
    meetings/[id]/page.tsx   Meeting detail workspace
    globals.css              Fireflies-inspired layout and styling
  components/
  lib/
```

## Setup

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The database is initialized and seeded on startup.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

If your backend runs somewhere else:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

## Database Schema

- `meetings`: meeting metadata, duration, language, summary, sentiment, timestamps
- `participants`: meeting participants with role, avatar color, and talk ratio
- `transcript_segments`: speaker-labelled transcript lines with start/end timestamps
- `action_items`: extracted or user-created tasks with assignee, due label, and completion state
- `topics`: outline/chapters linked to a timestamp

Relationships are one-to-many from `meetings` to every child table. Foreign keys use `ON DELETE CASCADE`, so deleting a meeting removes its transcript, topics, participants, and action items.

## API Overview

- `GET /api/health`
- `GET /api/meetings?search=&participant=&date=&sort=recent`
- `POST /api/meetings`
- `GET /api/meetings/{id}`
- `PATCH /api/meetings/{id}`
- `DELETE /api/meetings/{id}`
- `POST /api/meetings/{id}/action-items`
- `PATCH /api/action-items/{id}`
- `GET /api/search?q=term`
- `GET /api/meetings/{id}/export`

## Assumptions

- Authentication is mocked as a default logged-in user, as allowed by the assignment.
- Real speech-to-text and live meeting bots are out of scope.
- AI summaries are seeded for sample data and generated heuristically for pasted transcripts.
- The media player is a functional placeholder; no real audio/video file is required.
- The UI is inspired by public Fireflies screenshots: dark icon rail, notepad header, AI filter sidebar, central notes panel, transcript side panel, and fixed playback controls.
