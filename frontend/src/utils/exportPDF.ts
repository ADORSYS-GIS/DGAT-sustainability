import jsPDF from "jspdf";
import { drawAssessmentsTable } from "./drawTable";
import { drawKanbanBoard } from "./drawKanban";
import type { AdminSubmissionDetail, RecommendationWithStatus } from "@/openapi-rq/requests/types.gen";
import { offlineDB } from "@/services/indexeddb";
import type { TFunction } from "i18next";

const PAGE_MARGIN = 14;
const dgrvBlue = [30, 58, 138];
const PNG_DATA_URL_PREFIX = "data:image/png;base64,";

function hasPngSignature(dataUrl: string): boolean {
  if (!dataUrl.startsWith(PNG_DATA_URL_PREFIX)) {
    return false;
  }

  const base64 = dataUrl.slice(PNG_DATA_URL_PREFIX.length);
  try {
    const signature = atob(base64.slice(0, 12));
    return (
      signature.charCodeAt(0) === 0x89 &&
      signature.charCodeAt(1) === 0x50 &&
      signature.charCodeAt(2) === 0x4e &&
      signature.charCodeAt(3) === 0x47
    );
  } catch {
    return false;
  }
}

function addPngImage(
  doc: jsPDF,
  dataUrl: string | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string
): boolean {
  if (!dataUrl) {
    return false;
  }

  if (!hasPngSignature(dataUrl)) {
    console.warn(`Skipping invalid PNG image while exporting PDF: ${label}`);
    return false;
  }

  try {
    doc.addImage(dataUrl, "PNG", x, y, width, height);
    return true;
  } catch (error) {
    console.warn(`Skipping PNG image that jsPDF could not process: ${label}`, error);
    return false;
  }
}

export const addHeader = (doc: jsPDF, t: TFunction) => {
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(10);
  doc.setTextColor(100);
  const headerText = t('export.sustainabilityReport');
  const pageText = t('export.page', { count: pageCount });
  doc.text(headerText, PAGE_MARGIN, 10);
  doc.text(pageText, doc.internal.pageSize.width - PAGE_MARGIN - doc.getTextWidth(pageText), 10);
  doc.setDrawColor(dgrvBlue[0], dgrvBlue[1], dgrvBlue[2]);
  doc.line(PAGE_MARGIN, 12, doc.internal.pageSize.width - PAGE_MARGIN, 12);
};

const addNewPageWithHeader = (doc: jsPDF, t: TFunction) => {
  doc.addPage();
  addHeader(doc, t);
};

async function loadImageAsBase64(url: string): Promise<string | undefined> {
  // 1. Try to load from IndexedDB
  const cachedImage = await offlineDB.getImage(url);
  if (cachedImage && hasPngSignature(cachedImage.dataUrl)) {
    console.log(`Loaded image from IndexedDB: ${url}`);
    return cachedImage.dataUrl;
  } else if (cachedImage) {
    console.warn(`Ignoring cached image with invalid PNG data: ${url}`);
  }

  // 2. If not in IndexedDB, try to fetch from network
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const base64 = await new Promise<string | undefined>((resolve, reject) => {
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.warn("Could not get 2D context for canvas.");
            return resolve(undefined);
          }
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        } catch (error) {
          console.error(`Error processing image ${url}:`, error);
          reject(error);
        }
      };
      img.onerror = (e) => {
        console.warn(`Failed to load image from network: ${url}`, e);
        resolve(undefined);
      };
      img.src = url;
    });

    if (base64) {
      // 3. Cache the image in IndexedDB for future offline use
      await offlineDB.saveImage({
        id: url,
        dataUrl: base64,
        timestamp: new Date().toISOString(),
      });
      console.log(`Cached image to IndexedDB: ${url}`);
      return base64;
    }
  } catch (error) {
    console.error(`Failed to fetch and cache image ${url}:`, error);
  }

  return undefined;
}

// Main export function
export async function exportAllAssessmentsPDF(
  submissions: AdminSubmissionDetail[],
  recommendations: RecommendationWithStatus[],
  radarChartDataUrl?: string,
  recommendationChartDataUrl?: string,
  organizationName?: string,
  assessmentName?: string,
  t?: TFunction,
  reportId?: string
) {
  // Default translation function if not provided
  const translate = t || ((key: string, options?: Record<string, unknown>) => {
    // Fallback to English
    const defaults: Record<string, string> = {
      'export.sustainabilityReport': 'Sustainability Report',
      'export.page': 'Page',
      'export.dgrv': 'DGRV',
      'export.sustainability': 'Sustainability',
      'export.sustainabilityReportTitle': 'SUSTAINABILITY REPORT',
      'export.organisation': 'Organisation',
      'export.assessment': 'Assessment',
      'export.allAssessments': 'All Assessments',
      'export.reportIntro': 'This document presents the findings of the sustainability assessment, offering a detailed analysis of performance across key environmental, social, and governance (ESG) dimensions.',
      'export.sustainabilityDimensionsOverview': 'Sustainability Dimensions Overview',
      'export.sustainabilityDimensionsIntro': 'The following chart visualizes the performance across key sustainability dimensions, providing a high-level overview of strengths and areas for improvement.',
      'export.recommendationStatusOverview': 'Recommendation Status Overview',
      'export.recommendationStatusIntro': 'This chart summarizes the current status of all recommendations, illustrating the progress made in implementing the suggested actions.',
      'export.actionPlanKanbanBoard': 'Action Plan Kanban Board',
      'export.kanbanBoardIntro': 'This Kanban board provides a visual tool to track the progress of each recommendation. Tasks are organized by their current status, from \'To Do\' to \'Approved\', facilitating effective project management.'
    };
    return defaults[key] || key;
  });
  
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // --- Cover Page ---
  let imageBase64: string | undefined;
  const possiblePaths = [
    '/sustainability.png', './sustainability.png', 'sustainability.png', '/public/sustainability.png'
  ];

  for (const path of possiblePaths) {
    imageBase64 = await loadImageAsBase64(path);
    if (imageBase64) {
      break;
    }
  }

  if (imageBase64) {
    const imgWidth = 200;
    const imgHeight = 130;
    const x = (pageWidth - imgWidth) / 2;
    if (!addPngImage(doc, imageBase64, x, 20, imgWidth, imgHeight, "cover image")) {
      imageBase64 = undefined;
    }
  }

  if (!imageBase64) {
    // Fallback to drawing a blue rectangle with text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 150; canvas.height = 150;
    if (ctx) {
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(0, 0, 150, 150);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(translate('export.dgrv'), 75, 75);
      ctx.font = '16px Arial';
      ctx.fillText(translate('export.sustainability'), 75, 110);
    }
    const base64 = canvas.toDataURL('image/png');
    const imgWidth = 150; const imgHeight = 150;
    const x = (pageWidth - imgWidth) / 2;
    addPngImage(doc, base64, x, 20, imgWidth, imgHeight, "fallback cover image");
  }

  doc.setFontSize(36);
  doc.setTextColor(dgrvBlue[0], dgrvBlue[1], dgrvBlue[2]);
  doc.setFont("helvetica", "bold");
  doc.text(translate('export.sustainabilityReportTitle'), pageWidth / 2, 160, { align: 'center' });

  let coverY = 172;

  if (organizationName) {
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138); // dgrvBlue
    doc.text(`${translate('export.organisation')}: ${organizationName}`, pageWidth / 2, coverY, { align: 'center' });
    coverY += 14;
  }

  if (assessmentName && assessmentName !== translate('export.allAssessments')) {
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 163, 74); // green-600
    doc.text(`${translate('export.assessment')}: ${assessmentName}`, pageWidth / 2, coverY, { align: 'center' });
    coverY += 12;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  const introText = translate('export.reportIntro');
  const splitText = doc.splitTextToSize(introText, pageWidth - 100);
  doc.text(splitText, pageWidth / 2, coverY + 6, { align: 'center' });

  // --- Radar Chart Section ---
  if (radarChartDataUrl) {
    addNewPageWithHeader(doc, translate);
    doc.setFontSize(18);
    doc.setTextColor(dgrvBlue[0], dgrvBlue[1], dgrvBlue[2]);
    doc.text(translate('export.sustainabilityDimensionsOverview'), PAGE_MARGIN, 28);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const radarIntro = translate('export.sustainabilityDimensionsIntro');
    doc.text(doc.splitTextToSize(radarIntro, pageWidth - (PAGE_MARGIN * 2)), PAGE_MARGIN, 36);

    const chartHeight = 150;
    const chartWidth = 400;
    const x = (pageWidth - chartWidth) / 2;
    addPngImage(doc, radarChartDataUrl, x, 51, chartWidth, chartHeight, "radar chart");
  }

  // --- Recommendation Status Chart Section ---
  if (recommendationChartDataUrl) {
    addNewPageWithHeader(doc, translate);
    doc.setFontSize(18);
    doc.setTextColor(dgrvBlue[0], dgrvBlue[1], dgrvBlue[2]);
    doc.text(translate('export.recommendationStatusOverview'), PAGE_MARGIN, 28);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const recIntro = translate('export.recommendationStatusIntro');
    doc.text(doc.splitTextToSize(recIntro, pageWidth - (PAGE_MARGIN * 2)), PAGE_MARGIN, 36);

    const chartHeight = 150;
    const chartWidth = chartHeight * 1.5;
    const x = (pageWidth - chartWidth) / 2;
    addPngImage(doc, recommendationChartDataUrl, x, 51, chartWidth, chartHeight, "recommendation chart");
  }

  // --- Detailed Assessments Table Section ---
  drawAssessmentsTable(
    doc,
    submissions,
    recommendations,
    organizationName,
    assessmentName,
    translate,
    reportId
  );

  // --- Action Plan Kanban Board Section ---
  addNewPageWithHeader(doc, translate);
  doc.setFontSize(18);
  doc.setTextColor(dgrvBlue[0], dgrvBlue[1], dgrvBlue[2]);
  doc.text(translate('export.actionPlanKanbanBoard'), PAGE_MARGIN, 28);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const kanbanIntro = translate('export.kanbanBoardIntro');
  doc.text(doc.splitTextToSize(kanbanIntro, pageWidth - (PAGE_MARGIN * 2)), PAGE_MARGIN, 36);

  const scopedKanbanRecs = reportId
    ? recommendations.filter((r) => r.report_id === reportId)
    : recommendations;
  drawKanbanBoard(doc, scopedKanbanRecs, () => addNewPageWithHeader(doc, translate));

  // --- Final Save ---
  doc.save("sustainability-report.pdf");
}
