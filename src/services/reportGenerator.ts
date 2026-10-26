/**
 * Doctor Report & Progress Sharing Service
 * Formats self-reported habit consistency and symptom observations
 * for patient-doctor review. Strictly includes non-diagnostic disclaimers.
 */
import { planRepo } from '../db/repositories/planRepo';
import { symptomRepo } from '../db/repositories/symptomRepo';
import { habitRepo } from '../db/repositories/habitRepo';
import { Disclaimers } from '../constants/disclaimers';
import { APP_NAME } from '../constants/app';

export interface DoctorReportData {
  generatedDate: string;
  userAge?: number;
  consistencyRate7d: number;
  totalLogs30d: number;
  averageBreathingComfort: string;
  topTriggers: { trigger: string; count: number }[];
  activeMedicationReminders: string[];
  reportText: string;
}

export async function generateDoctorReport(userAge?: number): Promise<DoctorReportData> {
  const weekly = await planRepo.getRecentCompletionRate(7);
  const avgRate =
    weekly.length > 0
      ? Math.round(weekly.reduce((acc, c) => acc + c.rate, 0) / weekly.length)
      : 0;

  const symptomLogs = await symptomRepo.getRecentLogs(30);
  const topTriggers = await symptomRepo.getTriggerFrequency(30);
  const reminders = await habitRepo.getMedicationReminders();

  let avgDifficulty = 1;
  if (symptomLogs.length > 0) {
    const sum = symptomLogs.reduce((acc, curr) => acc + curr.breathing_difficulty, 0);
    avgDifficulty = Math.round((sum / symptomLogs.length) * 10) / 10;
  }

  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const remindersList = reminders
    .filter((r) => r.is_active === 1)
    .map((r) => `- ${r.label} (Scheduled: ${r.time}, ${r.frequency})`)
    .join('\n') || 'None recorded.';

  const triggersList = topTriggers
    .slice(0, 5)
    .map((t) => `- ${t.trigger}: noticed in ${t.count} logs`)
    .join('\n') || 'No recurring triggers logged.';

  const reportText = `=====================================================
${Disclaimers.doctorExportHeader}
App: ${APP_NAME} | Date: ${generatedDate}
Patient Age: ${userAge ? userAge : 'Not specified'}
=====================================================

1. ROUTINE & HABIT CONSISTENCY
-----------------------------------------------------
- 7-Day Checklist Adherence Rate: ${avgRate}%
- Active User-Configured Reminders:
${remindersList}

2. PATIENT-REPORTED OBSERVATIONS (LAST 30 DAYS)
-----------------------------------------------------
- Total Symptom Check-ins Logged: ${symptomLogs.length}
- Average Breathing Rating: ${avgDifficulty} / 5 (1 = fully comfortable, 5 = severe)
- Most Frequently Noticed Environmental Triggers:
${triggersList}

3. PATIENT NOTES & RECENT ENTRIES
-----------------------------------------------------
${
  symptomLogs
    .filter((l) => Boolean(l.notes))
    .slice(0, 3)
    .map((l) => `[${l.date}] Breathing: ${l.breathing_difficulty}/5. Note: "${l.notes}"`)
    .join('\n') || 'No subjective text notes recorded.'
}

=====================================================
IMPORTANT CLINICAL NOTICE:
This summary was compiled automatically from self-logged entries in the ${APP_NAME} app.
It does not contain diagnostic scoring, algorithmic predictions, or medication change recommendations.
All decisions regarding diagnosis, treatment, and medications remain solely at the discretion of the licensed healthcare provider.
=====================================================`;

  return {
    generatedDate,
    userAge,
    consistencyRate7d: avgRate,
    totalLogs30d: symptomLogs.length,
    averageBreathingComfort: `${avgDifficulty} / 5`,
    topTriggers,
    activeMedicationReminders: reminders.map((r) => `${r.label} (${r.time})`),
    reportText,
  };
}
