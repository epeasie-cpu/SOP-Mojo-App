export type SpeechResultLike = {
  isFinal: boolean;
  transcript: string;
};

export function speechResultsFromEvent(
  results: ArrayLike<{ isFinal?: boolean } & ArrayLike<{ transcript?: string }>>,
): SpeechResultLike[] {
  const out: SpeechResultLike[] = [];
  for (let i = 0; i < results.length; i++) {
    const row = results[i];
    out.push({
      isFinal: Boolean(row.isFinal),
      transcript: String(row[0]?.transcript ?? ""),
    });
  }
  return out;
}

/** Merge a recognition session without appending interim text twice. */
export function foldSpeechResults(
  baseline: string,
  results: SpeechResultLike[],
): { committed: string; display: string } {
  const seed = baseline.replace(/\s+/g, " ").trim();
  const finals: string[] = [];
  const interims: string[] = [];
  for (const result of results) {
    const piece = result.transcript.replace(/\s+/g, " ").trim();
    if (!piece) continue;
    if (result.isFinal) finals.push(piece);
    else interims.push(piece);
  }
  const committed = [seed, ...finals].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const display = [committed, ...interims].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  return { committed, display };
}
