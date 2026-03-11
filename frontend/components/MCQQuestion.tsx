"use client";

import type { AnswerOption, ReadingQuestion } from "@/types/reading";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface MCQQuestionProps {
  index: number;
  question: ReadingQuestion;
  selectedAnswer: AnswerOption | "";
  onAnswerChange: (answer: AnswerOption) => void;
  isDisabled?: boolean;
}

function parseOption(option: string, fallbackIndex: number) {
  const directMatch = option.match(/^([A-D])[).:\-\s]+(.*)$/i);
  if (directMatch) {
    return {
      letter: directMatch[1].toUpperCase() as AnswerOption,
      label: directMatch[2].trim()
    };
  }

  const letters: AnswerOption[] = ["A", "B", "C", "D"];
  return { letter: letters[fallbackIndex], label: option };
}

export default function MCQQuestion({
  index,
  question,
  selectedAnswer,
  onAnswerChange,
  isDisabled
}: MCQQuestionProps) {
  return (
    <Card className="border-slate-200">
      <CardContent className="space-y-4 p-5">
        <p className="font-medium text-slate-900">
          {index + 1}. {question.question}
        </p>
        <RadioGroup
          value={selectedAnswer}
          onValueChange={(value) => onAnswerChange(value as AnswerOption)}
          className="gap-3"
          disabled={isDisabled}
        >
          {question.options.map((option, optionIndex) => {
            const parsed = parseOption(option, optionIndex);
            const id = `question-${index}-${parsed.letter}`;
            return (
              <div
                key={id}
                className="flex items-start gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5"
              >
                <RadioGroupItem value={parsed.letter} id={id} disabled={isDisabled} />
                <Label
                  htmlFor={id}
                  className={`text-sm font-normal leading-relaxed ${
                    isDisabled ? "cursor-not-allowed text-slate-400" : "cursor-pointer"
                  }`}
                >
                  <span className="mr-2 font-semibold text-slate-900">{parsed.letter}.</span>
                  <span>{parsed.label}</span>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
