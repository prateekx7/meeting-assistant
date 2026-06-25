export type Participant = {
  id: number;
  meeting_id: number;
  name: string;
  role: string | null;
  avatar_color: string;
  talk_ratio: number;
};

export type TranscriptSegment = {
  id: number;
  meeting_id: number;
  speaker: string;
  start_seconds: number;
  end_seconds: number;
  text: string;
  is_highlighted: number;
};

export type ActionItem = {
  id: number;
  meeting_id: number;
  assignee: string;
  text: string;
  due_label: string | null;
  completed: number;
};

export type Topic = {
  id: number;
  meeting_id: number;
  title: string;
  start_seconds: number;
  notes: string;
};

export type MeetingListItem = {
  id: number;
  title: string;
  meeting_date: string;
  duration_seconds: number;
  language: string;
  owner: string;
  summary: string;
  sentiment: string;
  transcript_count: number;
  participants: Participant[];
};

export type Meeting = MeetingListItem & {
  segments: TranscriptSegment[];
  action_items: ActionItem[];
  topics: Topic[];
};

export type SearchHit = {
  meeting_id: number;
  title: string;
  meeting_date: string;
  speaker: string;
  start_seconds: number;
  text: string;
};
