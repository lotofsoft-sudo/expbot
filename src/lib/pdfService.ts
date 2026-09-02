import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PdfGenerationOptions {
  filename?: string;
  marginMm?: number;
  scale?: number;
  onProgress?: (isGenerating: boolean) => void;
}

/**
 * Dedicated PDF Generation Service for A4 Landscape Approval Vouchers.
 * Enforces fixed table sizing, consistent font rendering, and A4 landscape dimensions.
 */
export async function generateApprovalVoucherPdf(
  containerId: string,
  options: PdfGenerationOptions = {}
): Promise<void> {
  const {
    filename = 'Approval_Voucher.pdf',
    marginMm = 5,
    scale = 2,
    onProgress
  } = options;

  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container element with id "${containerId}" not found.`);
  }

  if (onProgress) onProgress(true);

  try {
    // Scroll parent to top during rendering to prevent viewport clipping
    const scrollParent = container.closest('.overflow-auto');
    const originalScrollTop = scrollParent ? scrollParent.scrollTop : 0;
    if (scrollParent) {
      scrollParent.scrollTop = 0;
    }

    // Measure exact target dimensions
    const targetWidth = Math.max(container.offsetWidth, container.scrollWidth, 1180);
    const targetHeight = Math.max(container.offsetHeight, container.scrollHeight);

    const canvas = await html2canvas(container, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width: targetWidth,
      height: targetHeight,
      windowWidth: 1280,
      onclone: (clonedDoc) => {
        // 1. Sanitize CSS text containing unsupported oklch functions
        const styleElements = clonedDoc.querySelectorAll('style');
        styleElements.forEach((styleEl) => {
          if (styleEl.textContent && styleEl.textContent.includes('oklch')) {
            styleEl.textContent = styleEl.textContent.replace(/oklch\([^)]+\)/gi, '#000000');
          }
        });

        // 2. Sanitize inline elements with oklch
        const allElems = clonedDoc.querySelectorAll('*');
        allElems.forEach((el) => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.style && htmlEl.style.cssText && htmlEl.style.cssText.includes('oklch')) {
            htmlEl.style.cssText = htmlEl.style.cssText.replace(/oklch\([^)]+\)/gi, '#000000');
          }
        });

        // 3. Lock fixed table layout and explicit container dimensions
        const clonedContainer = clonedDoc.getElementById(containerId);
        if (clonedContainer) {
          clonedContainer.style.boxShadow = 'none';
          clonedContainer.style.border = 'none';
          clonedContainer.style.backgroundColor = '#ffffff';
          clonedContainer.style.color = '#000000';
          clonedContainer.style.margin = '0';
          clonedContainer.style.padding = '16px';
          clonedContainer.style.width = '1180px';
          clonedContainer.style.minWidth = '1180px';
          clonedContainer.style.maxWidth = '1180px';
          clonedContainer.style.height = 'auto';
          clonedContainer.style.maxHeight = 'none';
          clonedContainer.style.overflow = 'visible';
          clonedContainer.style.fontFamily = "'Courier New', Courier, monospace, sans-serif";

          const table = clonedContainer.querySelector('table');
          if (table) {
            table.style.width = '1130px';
            table.style.minWidth = '1130px';
            table.style.tableLayout = 'fixed';
            table.style.borderCollapse = 'collapse';
          }
        }
      }
    });

    // Restore scroll state
    if (scrollParent) {
      scrollParent.scrollTop = originalScrollTop;
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // Create jsPDF in standard A4 Landscape
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 297mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 210mm

    const printableWidth = pdfWidth - marginMm * 2;
    const printableHeight = pdfHeight - marginMm * 2;

    const imgWidthPx = canvas.width;
    const imgHeightPx = canvas.height;

    const ratio = Math.min(printableWidth / imgWidthPx, printableHeight / imgHeightPx);

    const renderWidth = imgWidthPx * ratio;
    const renderHeight = imgHeightPx * ratio;

    const x = (pdfWidth - renderWidth) / 2;
    const y = (pdfHeight - renderHeight) / 2;

    pdf.addImage(imgData, 'JPEG', x, y, renderWidth, renderHeight);
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } finally {
    if (onProgress) onProgress(false);
  }
}
