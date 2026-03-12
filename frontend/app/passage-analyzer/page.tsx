"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";
import DictionaryCard from "@/components/DictionaryCard";
import ReadingPanel from "@/components/ReadingPanel";
import TextHelperTool from "@/components/TextHelperTool";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { explainWord, generatePassage } from "@/services/api";
import { getAuthToken } from "@/lib/auth";
import type { WordMeaningResponse } from "@/types/dictionary";
import type { PassageResponse } from "@/types/passage";

export default function PassageAnalyzerPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [passage, setPassage] = useState<PassageResponse | null>(null);
  const [lookupText, setLookupText] = useState("");
  const [wordDetails, setWordDetails] = useState<WordMeaningResponse | null>(null);
  const [loadingPassage, setLoadingPassage] = useState(false);
  const [loadingHelper, setLoadingHelper] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  const handleGeneratePassage = async () => {
    setLoadingPassage(true);
    setError("");
    try {
      const result = await generatePassage();
      setPassage(result);
      setLookupText("");
      setWordDetails(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate passage.");
    } finally {
      setLoadingPassage(false);
    }
  };

  const handleExplainText = async () => {
    if (!lookupText.trim()) {
      return;
    }
    setLoadingHelper(true);
    setError("");
    try {
      const result = await explainWord({ word: lookupText.trim() });
      setWordDetails(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to explain text.");
    } finally {
      setLoadingHelper(false);
    }
  };

  if (!ready) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Header subtitle="Analyze passages and explain selected text" />
      <main className="container space-y-6 py-8">
        <Card className="border-slate-200 shadow-soft">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Passage Analyzer</h2>
              <p className="text-sm text-slate-600">
                Generate a new passage, then select text for the helper tool.
              </p>
            </div>
            <Button onClick={handleGeneratePassage} disabled={loadingPassage}>
              {loadingPassage ? "Generating..." : "Generate Passage"}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {passage && (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <ReadingPanel
              title={passage.title}
              passage={passage.passage}
              onTextHighlight={(text) => setLookupText(text)}
            />
            <aside className="space-y-4">
              <Card className="border-slate-200 shadow-soft">
                <CardContent className="p-5">
                  <TextHelperTool
                    text={lookupText}
                    onTextChange={setLookupText}
                    onExplain={handleExplainText}
                    isLoading={loadingHelper}
                  />
                </CardContent>
              </Card>
              {wordDetails && <DictionaryCard entry={wordDetails} />}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
