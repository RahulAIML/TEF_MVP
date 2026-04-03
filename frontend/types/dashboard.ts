export interface RecentExam {
  id: number;
  score: number;
  accuracy: number;
  created_at: string;
}

export interface ModuleExamSummary {
  average_accuracy: number;
  recent_exams: RecentExam[];
  weakest_question_type?: string | null;
}

export interface WritingSubmissionSummary {
  id: number;
  average_score: number;
  created_at: string;
}

export interface WritingSummary {
  average_score: number;
  recent_submissions: WritingSubmissionSummary[];
}

export interface LearnSessionSummary {
  id: number;
  topic?: string | null;
  level?: string | null;
  score?: number | null;
  exercises_completed: number;
  exercises_total: number;
  created_at: string;
}

export interface LearnSummary {
  average_score: number;
  recent_sessions: LearnSessionSummary[];
}

export interface DashboardSummaryResponse {
  reading: ModuleExamSummary;
  listening: ModuleExamSummary;
  writing: WritingSummary;
  learning: LearnSummary;
}

