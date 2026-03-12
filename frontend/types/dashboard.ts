export interface RecentExam {
  id: number;
  score: number;
  accuracy: number;
  created_at: string;
}

export interface DashboardSummaryResponse {
  average_accuracy: number;
  recent_exams: RecentExam[];
  weakest_question_type: string;
}
