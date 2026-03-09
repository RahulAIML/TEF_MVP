export interface WordMeaningRequest {
  word: string;
}

export interface WordMeaningResponse {
  word: string;
  part_of_speech: string;
  definition_simple: string;
  french_explanation: string;
  english_translation: string;
  example_sentence: string;
  synonyms: string[];
}
