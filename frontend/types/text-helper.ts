export interface ExplainTextRequest {
  text: string;
}

export interface ExplainTextResponse {
  meaning: string;
  explanation: string;
  translation: string;
  example: string;
}
