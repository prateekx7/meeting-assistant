import type { ActionItem, Meeting, MeetingListItem, SearchHit } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function listMeetings(params: Record<string, string>) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value));
  return request<MeetingListItem[]>(`/api/meetings?${query}`);
}

export function getMeeting(id: string | number) {
  return request<Meeting>(`/api/meetings/${id}`);
}

export function createMeeting(payload: {
  title: string;
  meeting_date: string;
  duration_seconds: number;
  participants: string[];
  transcript_text: string;
}) {
  return request<Meeting>("/api/meetings", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateMeeting(id: number, payload: { title?: string; meeting_date?: string; duration_seconds?: number; participants?: string[] }) {
  return request<Meeting>(`/api/meetings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteMeeting(id: number) {
  return request<void>(`/api/meetings/${id}`, { method: "DELETE" });
}

export function createActionItem(meetingId: number, payload: { assignee: string; text: string; due_label?: string }) {
  return request<ActionItem>(`/api/meetings/${meetingId}/action-items`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateActionItem(
  id: number,
  payload: Partial<Omit<ActionItem, "completed">> & { completed?: boolean }
) {
  return request<ActionItem>(`/api/action-items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function globalSearch(q: string) {
  return request<SearchHit[]>(`/api/search?q=${encodeURIComponent(q)}`);
}

export async function exportMeeting(id: number) {
  const response = await fetch(`${API_BASE}/api/meetings/${id}/export`, { cache: "no-store" });
  if (!response.ok) throw new Error("Export failed");
  return response.text();
}
