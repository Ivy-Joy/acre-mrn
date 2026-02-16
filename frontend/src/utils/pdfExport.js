// src/utils/pdfExport.js
import html2pdf from 'html2pdf.js';

export async function exportElementToPdf(element, filename = 'report.pdf', options = {}) {
  const opt = {
    margin: 12,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    ...options
  };
  return html2pdf().set(opt).from(element).save();
}
