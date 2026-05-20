import { describe, it, expect } from "vitest";
import {
  parseAssessmentAnswer,
  formatAssessmentAnswerFields,
  serializeAnswerForExport,
} from "../parseAssessmentAnswer";

describe("parseAssessmentAnswer", () => {
  it("parses a plain assessment answer object", () => {
    const result = parseAssessmentAnswer({
      yesNo: true,
      percentage: 50,
      text: "banayo imidasibhini emakethe yabo",
      response_id: "915bf719-a7c5-4db8-85d8-6c23eebc8ca3",
    });
    expect(result).toEqual({
      yesNo: true,
      percentage: 50,
      text: "banayo imidasibhini emakethe yabo",
    });
  });

  it("parses a JSON string answer", () => {
    const raw = JSON.stringify({
      yesNo: false,
      percentage: 0,
      text: "kute tindlela lesinato kuvikela imvelo",
    });
    expect(parseAssessmentAnswer(raw)).toEqual({
      yesNo: false,
      percentage: 0,
      text: "kute tindlela lesinato kuvikela imvelo",
    });
  });

  it("parses array-wrapped string responses", () => {
    const inner = JSON.stringify({ yesNo: true, percentage: 100, text: "yebo ngoba" });
    const raw = JSON.stringify([inner]);
    expect(parseAssessmentAnswer(raw)).toEqual({
      yesNo: true,
      percentage: 100,
      text: "yebo ngoba",
    });
  });

  it("parses double-encoded JSON strings", () => {
    const inner = JSON.stringify({ yesNo: true, percentage: 80, text: "answer text" });
    const doubleEncoded = JSON.stringify(inner);
    expect(parseAssessmentAnswer(doubleEncoded)).toEqual({
      yesNo: true,
      percentage: 80,
      text: "answer text",
    });
  });
});

describe("formatAssessmentAnswerFields", () => {
  it("formats yes/no, percentage, and text for export tables", () => {
    const formatted = formatAssessmentAnswerFields({
      yesNo: true,
      percentage: 50,
      text: "banayo imidasibhini emakethe yabo",
    });
    expect(formatted).toEqual({
      answer: "Yes",
      percentage: "50%",
      textAnswer: "banayo imidasibhini emakethe yabo",
    });
  });

  it("uses N/A and 0% when fields are missing", () => {
    expect(formatAssessmentAnswerFields(null)).toEqual({
      answer: "N/A",
      percentage: "0%",
      textAnswer: "N/A",
    });
  });
});

describe("serializeAnswerForExport", () => {
  it("does not double-stringify JSON strings", () => {
    const raw = '{"yesNo":true,"percentage":50,"text":"hello"}';
    expect(serializeAnswerForExport(raw)).toBe(raw);
  });

  it("stringifies object answers", () => {
    const obj = { yesNo: false, percentage: 0, text: "no answer" };
    expect(serializeAnswerForExport(obj)).toBe(JSON.stringify(obj));
  });
});
