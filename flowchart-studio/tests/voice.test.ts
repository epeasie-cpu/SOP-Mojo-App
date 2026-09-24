import { describe, expect, it } from "vitest";
import { foldSpeechResults, speechResultsFromEvent } from "@/lib/voice";

describe("voice transcript fold", () => {
  it("does not append the same interim twice", () => {
    const first = foldSpeechResults("", [
      { isFinal: false, transcript: "boil the kettle" },
    ]);
    expect(first.display).toBe("boil the kettle");
    expect(first.committed).toBe("");

    const grew = foldSpeechResults("", [
      { isFinal: false, transcript: "boil the kettle then pour" },
    ]);
    expect(grew.display).toBe("boil the kettle then pour");
    expect(grew.committed).toBe("");
  });

  it("keeps finals and shows the latest interim after them", () => {
    const folded = foldSpeechResults("already typed", [
      { isFinal: true, transcript: "boil water" },
      { isFinal: false, transcript: "steep the tea" },
    ]);
    expect(folded.committed).toBe("already typed boil water");
    expect(folded.display).toBe("already typed boil water steep the tea");
  });

  it("reads a SpeechRecognition-like results list", () => {
    const results = [
      Object.assign([{ transcript: "hello" }], { isFinal: true }),
      Object.assign([{ transcript: "world" }], { isFinal: false }),
    ];
    expect(speechResultsFromEvent(results)).toEqual([
      { isFinal: true, transcript: "hello" },
      { isFinal: false, transcript: "world" },
    ]);
  });
});
