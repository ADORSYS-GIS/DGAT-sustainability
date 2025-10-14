import jsPDF from "jspdf";
import { drawAssessmentsTable } from "./drawTable";
import { drawKanbanBoard } from "./drawKanban";
import type { AdminSubmissionDetail, RecommendationWithStatus } from "@/openapi-rq/requests/types.gen";
import { offlineDB } from "@/services/indexeddb";
import type { OfflineImage } from "@/types/offline";

const PAGE_MARGIN = 14;
const dgrvBlue = [30, 58, 138];

const addHeader = (doc: jsPDF) => {
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(10);
  doc.setTextColor(100);
  const headerText = "Sustainability Report";
  const pageText = `Page ${pageCount}`;
  doc.text(headerText, PAGE_MARGIN, 10);
  doc.text(pageText, doc.internal.pageSize.width - PAGE_MARGIN - doc.getTextWidth(pageText), 10);
  doc.setDrawColor(dgrvBlue[0], dgrvBlue[1], dgrvBlue[2]);
  doc.line(PAGE_MARGIN, 12, doc.internal.pageSize.width - PAGE_MARGIN, 12);
};

const addNewPageWithHeader = (doc: jsPDF) => {
  doc.addPage();
  addHeader(doc);
};

async function loadImageAsBase64(url: string): Promise<string | undefined> {
  // 1. Try to load from IndexedDB
  const cachedImage = await offlineDB.getImage(url);
  if (cachedImage) {
    console.log(`Loaded image from IndexedDB: ${url}`);
    return cachedImage.dataUrl;
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
  recommendationChartDataUrl?: string
) {
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
    doc.addImage(imageBase64, "PNG", x, 20, imgWidth, imgHeight);
  } else {
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
      ctx.fillText('DGRV', 75, 75);
      ctx.font = '16px Arial';
      ctx.fillText('Sustainability', 75, 110);
    }
    const base64 = canvas.toDataURL('image/png');
    const imgWidth = 150; const imgHeight = 150;
    const x = (pageWidth - imgWidth) / 2;
    doc.addImage(base64, "PNG", x, 20, imgWidth, imgHeight);
  }

  doc.setFontSize(40);
  doc.setTextColor(dgrvBlue[0], dgrvBlue[1], dgrvBlue[2]);
  doc.setFont("helvetica", "bold");
  doc.text("SUSTAINABILITY REPORT 2025", pageWidth / 2, 175, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  const introText = "This document presents the findings of the 2025 sustainability assessment, offering a detailed analysis of performance across key environmental, social, and governance (ESG) dimensions. It provides a comprehensive overview of the assessment results, data-driven recommendations for measurable improvements, and an actionable roadmap to help guide future sustainability initiatives.";
  const splitText = doc.splitTextToSize(introText, pageWidth - 100);
  doc.text(splitText, pageWidth / 2, 185, { align: 'center' });

  // --- Radar Chart Section ---
  if (radarChartDataUrl) {
    addNewPageWithHeader(doc);
    doc.setFontSize(18);
    doc.setTextColor(dgrvBlue[0], dgrvBlue[1], dgrvBlue[2]);
    doc.text("Sustainability Dimensions Overview", PAGE_MARGIN, 22);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const radarIntro = "The following chart visualizes the performance across key sustainability dimensions, providing a high-level overview of strengths and areas for improvement.";
    doc.text(doc.splitTextToSize(radarIntro, pageWidth - (PAGE_MARGIN * 2)), PAGE_MARGIN, 30);
    
    const chartHeight = 150; // Maximize height within page
    const chartWidth = 400; // Maintain aspect ratio
    const x = (pageWidth - chartWidth) / 2;
    doc.addImage(radarChartDataUrl, "PNG", x, 45, chartWidth, chartHeight);
  }

  // --- Recommendation Status Chart Section ---
  if (recommendationChartDataUrl) {
    addNewPageWithHeader(doc);
    doc.setFontSize(18);
    doc.setTextColor(dgrvBlue[0], dgrvBlue[1], dgrvBlue[2]);
    doc.text("Recommendation Status Overview", PAGE_MARGIN, 22);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const recIntro = "This chart summarizes the current status of all recommendations, illustrating the progress made in implementing the suggested actions.";
    doc.text(doc.splitTextToSize(recIntro, pageWidth - (PAGE_MARGIN * 2)), PAGE_MARGIN, 30);

    const chartHeight = 150; // Maximize height within page
    const chartWidth = chartHeight * 1.5; // Maintain aspect ratio
    const x = (pageWidth - chartWidth) / 2;
    doc.addImage(recommendationChartDataUrl, "PNG", x, 45, chartWidth, chartHeight);
  }

  // --- Detailed Assessments Table Section ---
  addNewPageWithHeader(doc);
  doc.setFontSize(18);
  doc.setTextColor(dgrvBlue[0], dgrvBlue[1], dgrvBlue[2]);
  doc.text("Detailed Assessment Results", PAGE_MARGIN, 22);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const tableIntro = "The table below presents a detailed breakdown of the assessment responses, organized by sustainability category. It includes the original questions, the responses provided, and the corresponding recommendations.";
  const introLines = doc.splitTextToSize(tableIntro, pageWidth - (PAGE_MARGIN * 2));
  doc.text(introLines, PAGE_MARGIN, 30);
  const introTextHeight = doc.getTextDimensions(introLines).h;
  
  const tableStartY = 30 + introTextHeight + 10; // Start table 10 units below intro text

  // drawAssessmentsTable will now start on the current page at the calculated Y position.
  drawAssessmentsTable(doc, submissions, recommendations, tableStartY);

  // --- Action Plan Kanban Board Section ---
  addNewPageWithHeader(doc);
  doc.setFontSize(18);
  doc.setTextColor(dgrvBlue[0], dgrvBlue[1], dgrvBlue[2]);
  doc.text("Action Plan Kanban Board", PAGE_MARGIN, 22);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const kanbanIntro = "This Kanban board provides a visual tool to track the progress of each recommendation. Tasks are organized by their current status, from 'To Do' to 'Approved', facilitating effective project management.";
  doc.text(doc.splitTextToSize(kanbanIntro, pageWidth - (PAGE_MARGIN * 2)), PAGE_MARGIN, 30);

  drawKanbanBoard(doc, recommendations, () => addNewPageWithHeader(doc));

  // --- Final Save ---
  doc.save("sustainability-report.pdf");
}