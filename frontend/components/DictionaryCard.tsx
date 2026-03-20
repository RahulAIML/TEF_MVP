import type { WordMeaningResponse } from "@/types/dictionary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DictionaryCardProps {
  entry: WordMeaningResponse;
}

export default function DictionaryCard({ entry }: DictionaryCardProps) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-slate-900">
          {entry.word}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({entry.part_of_speech})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-700">
        <div>
          <p className="font-medium text-slate-900">Simple definition</p>
          <p>{entry.definition_simple}</p>
        </div>
        <div>
          <p className="font-medium text-slate-900">French explanation</p>
          <p>{entry.french_explanation}</p>
        </div>
        <div>
          <p className="font-medium text-slate-900">English translation</p>
          <p>{entry.english_translation}</p>
        </div>
        <div>
          <p className="font-medium text-slate-900">Example sentence</p>
          <p>{entry.example_sentence}</p>
        </div>
        <div>
          <p className="font-medium text-slate-900">Synonyms</p>
          <p>{entry.synonyms.join(", ")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
