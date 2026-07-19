export interface ClientMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  model?: string;
  provider?: string;
  category?: string;
  tier?: string;
  escalated?: boolean;
}

export interface ConversationSummary {
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: number;
  folderId: string | null;
}
