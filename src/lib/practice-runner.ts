export type PracticeRunResult = {
  output: string;
  status: "idle" | "success" | "error" | "empty";
};

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "undefined") return "undefined";
  if (typeof value === "function") return value.toString();
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function runPracticeSnippet(source: string): PracticeRunResult {
  const trimmed = source.trim();
  if (!trimmed) {
    return {
      output: "Write some JavaScript to run your example.",
      status: "empty",
    };
  }

  const lines: string[] = [];
  const consoleProxy = {
    log: (...args: unknown[]) => {
      lines.push(args.map(formatValue).join(" "));
    },
    info: (...args: unknown[]) => {
      lines.push(args.map(formatValue).join(" "));
    },
    warn: (...args: unknown[]) => {
      lines.push(`WARN: ${args.map(formatValue).join(" ")}`);
    },
    error: (...args: unknown[]) => {
      lines.push(`ERROR: ${args.map(formatValue).join(" ")}`);
    },
  };

  try {
    const runner = new Function("console", `"use strict";\n${trimmed}`);
    runner(consoleProxy);
    return {
      output: lines.length ? lines.join("\n") : "Code ran without output.",
      status: "success",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong while running your code.";
    return {
      output: message,
      status: "error",
    };
  }
}
