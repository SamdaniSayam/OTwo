/**
 * Web doctor-report download.
 *
 * A browser has no Expo sharing file sheet. Create a local text file download
 * instead. No data is uploaded, and the object URL is revoked afterwards.
 */
import { getLocalDateString } from '../utils/date';

export function reportFileName(): string {
  return `otwo-doctor-summary-${getLocalDateString()}.txt`;
}

export async function exportReportText(reportText: string): Promise<void> {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('File export is not available in this environment.');
  }

  const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = reportFileName();
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
