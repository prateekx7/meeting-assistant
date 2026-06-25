from __future__ import annotations

from pydantic import BaseModel, Field


class ParticipantInput(BaseModel):
    name: str
    role: str | None = None


class MeetingCreate(BaseModel):
    title: str = Field(min_length=1)
    meeting_date: str
    duration_seconds: int = Field(default=900, ge=60)
    participants: list[str] = Field(default_factory=list)
    transcript_text: str = Field(default="", description="Plain transcript pasted by the user.")


class MeetingUpdate(BaseModel):
    title: str | None = None
    meeting_date: str | None = None
    duration_seconds: int | None = None
    participants: list[str] | None = None


class ActionItemCreate(BaseModel):
    assignee: str = Field(min_length=1)
    text: str = Field(min_length=1)
    due_label: str | None = None


class ActionItemUpdate(BaseModel):
    assignee: str | None = None
    text: str | None = None
    due_label: str | None = None
    completed: bool | None = None
