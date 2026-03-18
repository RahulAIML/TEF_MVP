import type { ExplainTextResponse } from "@/types/text-helper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TextExplanationCardProps {
  entry: ExplainTextResponse;
}

export default function TextExplanationCard({ entry }: TextExplanationCardProps) {
  return (
    <Card className="border-slate-200 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="text-slate-900">Text Explanation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-700">
        <div>
          <p className="font-medium text-slate-900">Meaning</p>
          <p>{entry.meaning}</p>
        </div>
        <div>
          <p className="font-medium text-slate-900">Explanation</p>
          <p>{entry.explanation}</p>
        </div>
        <div>
          <p className="font-medium text-slate-900">Translation</p>
          <p>{entry.translation}</p>
        </div>
        <div>
          <p className="font-medium text-slate-900">Example</p>
          <p>{entry.example}</p>
        </div>
      </CardContent>
    </Card>
  );
}
