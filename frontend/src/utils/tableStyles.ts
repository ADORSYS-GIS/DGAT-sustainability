import type { UserOptions } from "jspdf-autotable";

export const getTableStyles = (): Partial<UserOptions> => ({
  styles: {
    font: "helvetica",
    overflow: "linebreak",
    cellPadding: 3,
    valign: 'middle',
    lineWidth: 0.1,
    lineColor: [44, 62, 80], // Dark gray border
  },
  headStyles: {
    fillColor: [41, 128, 185], // A nice blue color
    textColor: 255,
    fontStyle: "bold",
    halign: 'center',
    fontSize: 10,
  },
  alternateRowStyles: {
    fillColor: [245, 245, 245], // Light gray for alternate rows
  },
  footStyles: {
    fillColor: [41, 128, 185],
    textColor: 255,
    fontStyle: "bold",
  },
  columnStyles: {
    0: { cellWidth: 60 }, // Question
    1: { cellWidth: 20 }, // Answer
    2: { cellWidth: 25 }, // Percentage
    3: { cellWidth: 60 }, // Text Answer
    4: { cellWidth: 104 }, // Recommendations
  },
});