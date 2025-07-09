import jsPDF from "jspdf";

export async function exportAllAssessmentsPDF(
  assessments,
  getRecommendationsByAssessment,
  formatStatus,
) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Recent Sustainability Assessments", 10, 15);
  doc.setFontSize(12);
  let y = 30;
  for (let idx = 0; idx < assessments.length; idx++) {
    const assessment = assessments[idx];
    doc.text(`Assessment #${idx + 1}`, 10, y);
    y += 8;
    doc.text(`ID: ${assessment.assessmentId}`, 12, y);
    y += 8;
    doc.text(`Organization: `, 12, y);
    y += 8;
    doc.text(`User: `, 12, y);
    y += 8;
    doc.text(
      `Date: ${new Date(assessment.createdAt).toLocaleDateString()}`,
      12,
      y,
    );
    y += 8;
    doc.text(`Score: ${assessment.score ?? "N/A"}%`, 12, y);
    y += 8;
    doc.text(`Status: ${formatStatus(assessment.status)}`, 12, y);
    y += 8;
    // Fetch recommendations for this assessment
    const recommendations = await getRecommendationsByAssessment(
      assessment.assessmentId,
    );
    if (recommendations.length > 0) {
      doc.text("Recommendations:", 12, y);
      y += 8;
      recommendations.forEach((rec, recIdx) => {
        const recText = rec.text?.en || "";
        doc.text(`- ${recText}`, 14, y);
        y += 8;
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });
    } else {
      doc.text("No recommendations.", 12, y);
      y += 8;
    }
    y += 8;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  }
  doc.save("recent-assessments.pdf");
}
