import { describe, it, expect } from "vitest";
import {
  buildExportPayloadFromReport,
  mergeReportCategoryData,
  filterRecommendationsForReport,
} from "../reportExportData";

describe("reportExportData", () => {
  it("merges all category buckets from report.data array", () => {
    const merged = mergeReportCategoryData([
      {
        "Environmental (E)": {
          questions: [{ question: "Q1", answer: { yesNo: true, percentage: 50, text: "a" } }],
          recommendations: [{ id: "r1", text: "Rec env", status: "todo" }],
        },
      },
      {
        "Social (S)": {
          questions: [{ question: "Q2", answer: { yesNo: false, percentage: 0, text: "b" } }],
          recommendations: [{ id: "r2", text: "Rec social", status: "todo" }],
        },
      },
    ]);

    expect(Object.keys(merged)).toHaveLength(2);
    expect(merged["Environmental (E)"]?.questions).toHaveLength(1);
    expect(merged["Social (S)"]?.questions).toHaveLength(1);
  });

  it("buildExportPayloadFromReport only includes data for that report_id", () => {
    const report = {
      report_id: "report-a",
      submission_id: "sub-a",
      assessment_id: "assess-a",
      assessment_name: "Assessment A",
      generated_at: "2025-01-01T00:00:00Z",
      data: [
        {
          "Category One": {
            questions: [{ question: "Only A", answer: { yesNo: true, percentage: 100, text: "x" } }],
            recommendations: [{ id: "id-a", text: "Only recommendation A", status: "todo" }],
          },
        },
      ],
    };

    const { submissions, recommendations } = buildExportPayloadFromReport(report);

    expect(submissions).toHaveLength(1);
    expect(submissions[0].submission_id).toBe("sub-a");
    expect(submissions[0].content?.responses).toHaveLength(1);
    expect(submissions[0].content?.responses?.[0].question_text).toBe("Only A");

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].report_id).toBe("report-a");
    expect(recommendations[0].recommendation).toBe("Only recommendation A");
  });

  it("filterRecommendationsForReport excludes other reports", () => {
    const filtered = filterRecommendationsForReport(
      [
        {
          recommendation_id: "1",
          report_id: "report-a",
          assessment_id: "",
          assessment_name: "",
          category: "Cat",
          recommendation: "A",
          status: "todo",
          created_at: "",
        },
        {
          recommendation_id: "2",
          report_id: "report-b",
          assessment_id: "",
          assessment_name: "",
          category: "Cat",
          recommendation: "B",
          status: "todo",
          created_at: "",
        },
      ],
      "report-a"
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].report_id).toBe("report-a");
  });
});
