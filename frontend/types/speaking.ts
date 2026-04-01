export type SpeakingTaskType = "role_play" | "opinion";
export type SpeakingMode = "practice" | "exam";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ConversationRequest {
  message: string;
  history: ConversationMessage[];
  task_type: SpeakingTaskType;
  mode?: SpeakingMode;
  hints?: boolean;
  session_id?: string;
}

export interface ConversationResponse {
  reply: string;
  audio_url?: string | null;
}

export interface SpeakingEvaluationRequest {
  history: ConversationMessage[];
  task_type: SpeakingTaskType;
  mode?: SpeakingMode;
}

export interface SpeakingEvaluationResponse {
  fluency: number;
  grammar: number;
  vocabulary: number;
  interaction: number;
  feedback: string[];
  improved_response: string;
}

