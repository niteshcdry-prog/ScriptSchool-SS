import { describe, expect, it } from "vitest";
import { runPracticeSnippet } from "./practice-runner";

describe("runPracticeSnippet", () => {
  it("captures console output from valid JavaScript", () => {
    const result = runPracticeSnippet("const total = 2 + 3; console.log('Total:', total);");

    expect(result.status).toBe("success");
    expect(result.output).toContain("Total: 5");
  });

  it("returns a friendly empty-state result for blank code", () => {
    const result = runPracticeSnippet("   \n\t");

    expect(result.status).toBe("empty");
    expect(result.output).toContain("Write some JavaScript");
  });

  it("surfaces syntax problems clearly", () => {
    const result = runPracticeSnippet("console.log('broken");

    expect(result.status).toBe("error");
    expect(result.output).toMatch(/Unexpected|unterminated|Syntax/iu);
  });
});
