import type { ListeningResultItem } from "@/types/listening";
import { Card, CardContent } from "@/components/ui/card";

interface ListeningResultsProps {
  score: number;
  total: number;
  accuracy: number;
  results: ListeningResultItem[];
}

export default function ListeningResults({ score, total, accuracy, results }: ListeningResultsProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        Score: {score} / {total} ? Accuracy: {accuracy.toFixed(1)}%
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {results.map((item) => (
          <Card key={`listening-result-${item.question_number}`} className="border-slate-200">
            <CardContent className="space-y-2 p-4">
              <p className="text-sm font-semibold text-slate-900">Question {item.question_number}</p>
              <p className="text-sm text-slate-800">{item.question}</p>
              <p className="text-sm text-slate-700">Your answer: {item.user_answer || "(blank)"}</p>
              <p className="text-sm text-emerald-700">Correct answer: {item.correct_answer}</p>
              <p className="text-xs text-slate-600">{item.explanation}</p>
            </CardContent>
          </Card>
        ))}
        {results.length === 0 && (
          <p className="text-sm text-slate-600">No attempted questions to review.</p>
        )}
      </div>
    </div>
  );
}
