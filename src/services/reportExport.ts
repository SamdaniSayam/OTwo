/**
 * File-based doctor-report export.
 *
 * Writes a temporary text file, opens the platform share sheet, and removes the
 * temporary file afterwards. Errors are surfaced to the caller so the UI never
 * claims that a report was shared when it was not.
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getLocalDateString } from '../utils/date';

export function reportFileName(): string {
  return `otwo-doctor-summary-${getLocalDateString()}.txt`;
}

export async function exportReportText(reportText: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing files is not available on this device.');
  }

  const file = new File(Paths.cache, reportFileName());
  try {
    file.create({ overwrite: true, intermediates: true });
    await file.write(reportText);
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/plain',
      dialogTitle: 'Share OTwo doctor visit summary',
      UTI: 'public.plain-text',
    });
  } finally {
    if (file.exists) {
      try {
        file.delete();
      } catch {
        // Best-effort cleanup of a cache file; the share sheet already has the
        // content it needs.
      }
    }
  }
}
