export type WritingTaskType = "task1" | "task2";
export type WritingMode = "practice" | "exam";

export interface GenerateWritingTasksRequest {
  session_id?: string;
}

export interface GenerateWritingTasksResponse {
  task1_prompt: string;
  task2_prompt: string;
}

export interface WritingEvaluationRequest {
  task_type: WritingTaskType;
  prompt: string;
  response_text: string;
}

export interface WritingEvaluationResponse {
  level: string;
  scores: {
    structure: number;
    grammar: number;
    coherence: number;
    vocab: number;
  };
  feedback: string[];
  improved_version: string;
}

export interface WritingStepFeedbackRequest {
  task_type: WritingTaskType;
  step: string;
  prompt: string;
  text: string;
}

export interface WritingStepFeedbackResponse {
  feedback: string[];
  improved_version: string;
}

export interface WritingProgressRequest {
  session_id: string;
  mode: WritingMode;
  task_type: WritingTaskType;
  steps: Record<string, string>;
  task_prompt?: string;
}

export interface WritingProgressResponse {
  status: string;
}

export interface WritingSubmitRequest {
  session_id: string;
  mode: WritingMode;
  task1_prompt: string;
  task2_prompt: string;
  task1_text: string;
  task2_text: string;
  task1_steps?: Record<string, string>;
  task2_steps?: Record<string, string>;
}

export interface WritingSubmitResponse {
  task1: WritingEvaluationResponse;
  task2: WritingEvaluationResponse;
}

