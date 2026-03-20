import type { SubmissionResponse } from "@/types/submission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ScoreCardProps {
  scoreData: SubmissionResponse;
}

export default function ScoreCard({ scoreData }: ScoreCardProps) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-slate-900">
          Score: {scoreData.score}/{scoreData.total}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {scoreData.results.map((item) => (
          <div key={`result-${item.question_index}`} className="rounded-md border border-slate-200 p-4">
            <p className="font-medium text-slate-900">Question {item.question_index}</p>
            <p className="text-sm text-slate-700">Your answer: {item.user_answer || "No answer"}</p>
            <p className="text-sm text-slate-700">Correct answer: {item.correct_answer}</p>
            <p
              className={`text-sm font-medium ${
                item.is_correct ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {item.is_correct ? "Correct" : "Incorrect"}
            </p>
            <p className="mt-2 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Explanation:</span> {item.explanation}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
