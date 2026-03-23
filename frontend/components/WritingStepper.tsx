"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface WritingStep {
  key: string;
  title: string;
  description: string;
  helperPhrases?: string[];
  placeholder?: string;
}

interface WritingStepperProps {
  title: string;
  steps: WritingStep[];
  currentStep: number;
  values: Record<string, string>;
  onStepChange: (index: number) => void;
  onValueChange: (key: string, value: string) => void;
  onRequestFeedback?: (step: WritingStep, text: string) => void;
  feedback?: Record<string, { feedback: string[]; improved_version: string }>;
  isFeedbackLoading?: boolean;
}

export default function WritingStepper({
  title,
  steps,
  currentStep,
  values,
  onStepChange,
  onValueChange,
  onRequestFeedback,
  feedback,
  isFeedbackLoading
}: WritingStepperProps) {
  const step = steps[currentStep];
  const progress = Math.round(((currentStep + 1) / steps.length) * 100);
  const stepFeedback = feedback?.[step.key];

  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-slate-900">{title}</CardTitle>
        <p className="text-sm text-slate-500">Step {currentStep + 1} of {steps.length}</p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${progress}%` }} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
          <p className="mt-1 text-sm text-slate-600">{step.description}</p>
        </div>

        {step.helperPhrases && step.helperPhrases.length > 0 && (
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            <p className="text-xs font-semibold uppercase text-slate-400">Suggested phrases</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {step.helperPhrases.map((phrase) => (
                <li key={phrase}>{phrase}</li>
              ))}
            </ul>
          </div>
        )}

        <textarea
          className="min-h-[140px] w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none"
          placeholder={step.placeholder}
          value={values[step.key] ?? ""}
          onChange={(event) => onValueChange(step.key, event.target.value)}
        />

        {onRequestFeedback && (
          <Button
            variant="secondary"
            onClick={() => onRequestFeedback(step, values[step.key] ?? "")}
            disabled={isFeedbackLoading || !(values[step.key] ?? "").trim()}
          >
            {isFeedbackLoading ? "Checking..." : "Get Step Feedback"}
          </Button>
        )}

        {stepFeedback && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-slate-700">
            <p className="font-semibold text-indigo-700">Feedback</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {stepFeedback.feedback.map((item, index) => (
                <li key={`${step.key}-fb-${index}`}>{item}</li>
              ))}
            </ul>
            {stepFeedback.improved_version && (
              <div className="mt-3 rounded-lg bg-white p-3 text-sm text-slate-700">
                <p className="text-xs font-semibold uppercase text-slate-400">Improved version</p>
                <p className="mt-1 whitespace-pre-line">{stepFeedback.improved_version}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={() => onStepChange(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          <Button
            onClick={() => onStepChange(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep === steps.length - 1}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

