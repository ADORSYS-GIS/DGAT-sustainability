import type { TFunction } from "i18next";

export interface ParsedAssessmentAnswer {
  yesNo?: boolean;
  percentage?: number;
  text?: string;
}

export interface FormattedAssessmentAnswer {
  answer: string;
  percentage: string;
  textAnswer: string;
}

function extractFields(obj: Record<string, unknown>): ParsedAssessmentAnswer {
  return {
    yesNo: typeof obj.yesNo === "boolean" ? obj.yesNo : undefined,
    percentage: typeof obj.percentage === "number" ? obj.percentage : undefined,
    text: typeof obj.text === "string" ? obj.text : undefined,
  };
}

/**
 * Parses assessment answer payloads from API responses, report data, or export stubs.
 * Handles objects, JSON strings, double-encoded JSON, and array-wrapped responses.
 */
export function parseAssessmentAnswer(raw: unknown): ParsedAssessmentAnswer | null {
  if (raw == null || raw === "") {
    return null;
  }

  if (typeof raw === "object" && !Array.isArray(raw)) {
    return extractFields(raw as Record<string, unknown>);
  }

  if (Array.isArray(raw) && raw.length > 0) {
    return parseAssessmentAnswer(raw[0]);
  }

  if (typeof raw !== "string") {
    return null;
  }

  try {
    let parsed: unknown = JSON.parse(raw);

    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        return { text: parsed };
      }
    }

    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0];
      if (typeof first === "string") {
        try {
          parsed = JSON.parse(first);
        } catch {
          return { text: first };
        }
      } else if (typeof first === "object" && first !== null) {
        parsed = first;
      }
    }

    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return extractFields(parsed as Record<string, unknown>);
    }
  } catch {
    return { text: raw };
  }

  return null;
}

/** Serializes an answer for export table input without double-encoding JSON strings. */
export function serializeAnswerForExport(answer: unknown): string {
  if (typeof answer === "string") {
    return answer;
  }
  return JSON.stringify(answer ?? {});
}

export function formatAssessmentAnswerFields(
  parsed: ParsedAssessmentAnswer | null,
  t?: TFunction
): FormattedAssessmentAnswer {
  const translate = t || ((key: string) => key);
  const na = translate("export.na") || "N/A";

  if (!parsed) {
    return { answer: na, percentage: "0%", textAnswer: na };
  }

  const answer =
    typeof parsed.yesNo === "boolean"
      ? parsed.yesNo
        ? translate("export.yes") || "Yes"
        : translate("export.no") || "No"
      : na;

  const percentage =
    typeof parsed.percentage === "number" ? `${parsed.percentage}%` : "0%";

  const textAnswer = parsed.text?.trim() ? parsed.text : na;

  return { answer, percentage, textAnswer };
}
