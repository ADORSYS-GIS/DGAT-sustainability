import { describe, it, expect } from "vitest";
import { DataTransformationService } from "../dataTransformation";

describe("DataTransformationService", () => {
  it("transforms a Question into OfflineQuestion", () => {
    const question = {
      question_id: "q1",
      category: "cat1",
      latest_revision: {
        question_revision_id: "qr1",
        question_id: "q1",
        text: { en: "Hello" },
        weight: 5,
        created_at: "2024-01-01T00:00:00Z",
      },
      created_at: "2024-01-01T00:00:00Z",
    } as any;

    const offline = DataTransformationService.transformQuestion(question);
    expect(offline.question_id).toBe("q1");
    expect(offline.latest_revision.question_revision_id).toBe("qr1");
    expect(offline.sync_status).toBe("synced");
  });

  it("validates transformed data arrays", () => {
    const valid = DataTransformationService.validateTransformedData(
      [{ sync_status: "synced", updated_at: "2024-01-01T00:00:00Z" }] as any[],
      "questions",
    );
    expect(valid).toBe(true);
  });
});
