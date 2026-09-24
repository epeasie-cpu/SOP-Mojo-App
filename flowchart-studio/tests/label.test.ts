import { describe, expect, it } from "vitest";
import {
  briefLabel,
  clipAtWord,
  polishGraphLabels,
  splitLabel,
  visibleCardText,
  visibleDecisionText,
} from "@/lib/label";

describe("label clipping", () => {
  it("never cuts in the middle of a word", () => {
    const long =
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry used in onboarding";
    const clipped = clipAtWord(long, 28);
    expect(clipped.truncated).toBe(true);
    expect(clipped.preview.endsWith("dum")).toBe(false);
    expect(clipped.preview.endsWith("dummy")).toBe(false);
    expect(clipped.preview).toBe("Lorem Ipsum is simply");
    expect(long.startsWith(clipped.preview)).toBe(true);
    expect(clipped.preview.includes(" ")).toBe(true);
  });

  it("splits a short title from a longer body", () => {
    const split = splitLabel(
      "Create the workspace and kickoff SOP. Then invite the client and send the welcome pack with login details.",
    );
    expect(split.title).toBe("Create the workspace and kickoff SOP.");
    expect(split.body.startsWith("Then invite")).toBe(true);
    const visible = visibleCardText(
      "Create the workspace and kickoff SOP. Then invite the client and send the welcome pack with login details.",
    );
    expect(visible.title).toBe("Create the workspace and kickoff SOP.");
    expect(visible.body.length).toBeLessThanOrEqual(160);
    expect(visible.body.endsWith("deta")).toBe(false);
  });

  it("keeps decision text readable without mid-word chop", () => {
    const shown = visibleDecisionText("Is intake complete for this new client?");
    expect(shown.preview.toLowerCase().includes("complet")).toBe(true);
    expect(shown.preview.endsWith("complet")).toBe(false);
  });

  it("briefs walls of text into process-map labels", () => {
    expect(
      briefLabel(
        "Then walk to the front counter and politely greet the guest by name before asking what they would like to order today",
        "step",
      ),
    ).toBe("walk to the front counter and politely greet the guest");
    expect(briefLabel("Is the cash register loaded with a float?", "decision")).toBe(
      "Is the cash register loaded with a float?",
    );
    expect(briefLabel("First brew the tea", "step")).toBe("brew the tea");
  });

  it("polishes every node on generate without inventing copy", () => {
    const polished = polishGraphLabels({
      title: "Tea",
      nodes: [
        { id: "s", kind: "start", label: "Start", position: { x: 0, y: 0 } },
        {
          id: "n1",
          kind: "step",
          label: "Finally pour the water over the leaves and wait",
          position: { x: 0, y: 0 },
        },
      ],
      edges: [],
    });
    expect(polished.nodes[1].label).toBe("pour the water over the leaves and wait");
  });
});
