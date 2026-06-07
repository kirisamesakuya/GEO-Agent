import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import GeoReportPrintLayout, { type GeoReportPrintData } from '../components/geo/GeoReportPrintLayout';
import type { GeoReportWatermarkSettings } from './geo-report-watermark';

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '_').slice(0, 80);
}

export async function exportGeoReportToPdf(
  data: GeoReportPrintData,
  watermark: GeoReportWatermarkSettings
): Promise<void> {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.zIndex = '-1';
  document.body.appendChild(host);

  const root = createRoot(host);
  try {
    flushSync(() => {
      root.render(<GeoReportPrintLayout data={data} watermark={watermark} />);
    });

    await new Promise((r) => setTimeout(r, 120));

    const el = host.firstElementChild as HTMLElement | null;
    if (!el) throw new Error('报告渲染失败');

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 0;
    const contentWidth = pageWidth - margin * 2;
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;
    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = margin - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${sanitizeFilename(data.title)}.pdf`);
  } finally {
    root.unmount();
    host.remove();
  }
}
