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
import { getLocalDateString, getLocalDateStringDaysAgo } from '../utils/date';
import {
  averageBreathingRating as calculateAverageBreathingRating,
  summarizeAdherence,
} from './reportMath';

export interface DoctorReportOptions {
  userAge?: number;
  /** Free-text symptom notes are private by default; export requires explicit opt-in. */
  includeSymptomNotes?: boolean;
}

export interface DoctorReportData {
  generatedDate: string;
  reportWindowStart: string;
  reportWindowEnd: string;
  userAge?: number;
  consistencyRate7d: number;
  plannedItems7d: number;
  completedItems7d: number;
  totalLogs30d: number;
  averageBreathingRating: number | null;
  averageBreathingComfort: string;
  topTriggers: { trigger: string; count: number }[];
  activeMedicationReminders: string[];
  symptomNotesIncluded: boolean;
  reportText: string;
}

function displayTrigger(trigger: string): string {
  return trigger
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

export async function generateDoctorReport(
  options: DoctorReportOptions = {}
): Promise<DoctorReportData> {
  const today = getLocalDateString();
  const weekStart = getLocalDateStringDaysAgo(6);
  const monthStart = getLocalDateStringDaysAgo(29);

  const [weeklyStats, symptomLogs, topTriggers, reminders] = await Promise.all([
    planRepo.getCompletionHistory(weekStart, today),
    symptomRepo.getLogsInRange(monthStart, today),
    symptomRepo.getTriggerFrequency(30),
    habitRepo.getMedicationReminders(),
  ]);

  // Adherence is completed items / planned items over the whole week. Averaging
  // seven daily percentages would over-weight days with a single checklist item.
  const {
    plannedItems: plannedItems7d,
    completedItems: completedItems7d,
    consistencyRate: consistencyRate7d,
  } = summarizeAdherence(weeklyStats);

  const averageBreathingRating = calculateAverageBreathingRating(symptomLogs);
  const averageBreathingComfort =
    averageBreathingRating === null ? 'No check-ins' : `${averageBreathingRating} / 5`;

  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const activeReminders = reminders.filter((reminder) => reminder.is_active === 1);
  const remindersList =
    activeReminders
      .map((reminder) => `- ${reminder.label} (Scheduled: ${reminder.time}, ${reminder.frequency})`)
      .join('\n') || 'None recorded.';

  const triggersList =
    topTriggers
      .slice(0, 5)
      .map((trigger) => `- ${displayTrigger(trigger.trigger)}: noticed in ${trigger.count} logs`)
      .join('\n') || 'No recurring triggers logged.';

  const includeSymptomNotes = options.includeSymptomNotes === true;
  const symptomNotes = symptomLogs.filter((log) => Boolean(log.notes?.trim()));
  const notesSection = includeSymptomNotes
    ? symptomNotes
        .slice(0, 5)
        .map(
          (log) =>
            `[${log.date}] Breathing: ${log.breathing_difficulty}/5. Note: "${log.notes?.trim()}"`
        )
        .join('\n') || 'No free-text symptom notes were recorded in this period.'
    : 'Free-text symptom notes are excluded from this export by default because they may contain sensitive details. They can be included with explicit opt-in.';

  const reportText = `=====================================================
${Disclaimers.doctorExportHeader}
App: ${APP_NAME} | Date: ${generatedDate}
Reporting window: ${monthStart} to ${today} (inclusive)
Patient Age: ${options.userAge ? options.userAge : 'Not specified'}
=====================================================

1. ROUTINE & HABIT CONSISTENCY
-----------------------------------------------------
- 7-Day Checklist Adherence (${weekStart} to ${today}): ${consistencyRate7d}%
- Checklist items completed: ${completedItems7d} of ${plannedItems7d} planned
- Active User-Configured Reminders:
${remindersList}

2. PATIENT-REPORTED OBSERVATIONS (LAST 30 DAYS)
-----------------------------------------------------
- Total Symptom Check-ins Logged: ${symptomLogs.length}
- Average Breathing Rating: ${
    averageBreathingRating === null
      ? 'No check-ins logged in this period.'
      : `${averageBreathingRating} / 5 (1 = fully comfortable, 5 = severe)`
  }
- Most Frequently Noticed Environmental Triggers:
${triggersList}

3. PATIENT NOTES & RECENT ENTRIES
-----------------------------------------------------
${notesSection}

=====================================================
DATA EXCLUSIONS
-----------------------------------------------------
- Doctor advice notes saved in this app are local-only and are never included in an export.
- Chat conversations with the in-app companion are not included.
- No cloud data is merged into this report; it is generated from this device's account-scoped records.

=====================================================
IMPORTANT CLINICAL NOTICE:
This summary was compiled automatically from self-logged entries in the ${APP_NAME} app.
It does not contain diagnostic scoring, algorithmic predictions, or medication change recommendations.
All decisions regarding diagnosis, treatment, and medications remain solely at the discretion of the licensed healthcare provider.
=====================================================`;

  return {
    generatedDate,
    reportWindowStart: monthStart,
    reportWindowEnd: today,
    userAge: options.userAge,
    consistencyRate7d,
    plannedItems7d,
    completedItems7d,
    totalLogs30d: symptomLogs.length,
    averageBreathingRating,
    averageBreathingComfort,
    topTriggers,
    activeMedicationReminders: activeReminders.map(
      (reminder) => `${reminder.label} (${reminder.time})`
    ),
    symptomNotesIncluded: includeSymptomNotes,
    reportText,
  };
}
