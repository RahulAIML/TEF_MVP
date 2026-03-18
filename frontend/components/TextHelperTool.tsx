"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface TextHelperToolProps {
  text: string;
  onTextChange: (text: string) => void;
  onExplain: () => void;
  isLoading: boolean;
}

export default function TextHelperTool({
  text,
  onTextChange,
  onExplain,
  isLoading
}: TextHelperToolProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-800">Text Helper Tool</label>
      <textarea
        className="min-h-[120px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-slate-900 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        placeholder="Type or paste any word, phrase, or paragraph to explain"
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
      />
      <Button className="w-full" onClick={onExplain} disabled={isLoading || !text.trim()}>
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Explaining...
          </>
        ) : (
          "Explain Text"
        )}
      </Button>
    </div>
  );
}
