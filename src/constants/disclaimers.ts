/**
 * Standard Disclaimers & Non-Clinical Safety Rules
 * These text constants are surfaced across the app, exports, and AI companion.
 */
import { APP_NAME } from './app';

export const Disclaimers = {
  // Primary general disclaimer
  general: `${APP_NAME} is a personal habit and routine companion designed for self-management support. It does NOT provide medical advice, diagnosis, treatment, or clinical assessment. Always adhere to your physician's prescribed asthma action plan and consult a licensed healthcare professional for any health concerns.`,

  // Short banner disclaimer for screens
  shortBanner: 'Non-medical companion. Always follow your doctor\'s prescribed plan.',

  // Symptom tracker disclaimer
  symptomLog: 'Symptom logging is strictly for your personal observation and doctor discussion. It is not used for diagnostic scoring or clinical risk prediction.',

  // Medication reminder disclaimer
  medicationReminder: 'Reminders are strictly time-based alerts created by you. Never modify or pause prescribed medications without consulting your doctor.',

  // AI Companion baseline safety notice
  aiCompanionNotice: 'This assistant offers general encouragement and routine planning support. It cannot diagnose symptoms, analyze prescriptions, or replace medical care.',

  // Critical Emergency escalation
  emergencyEscalation: '🚨 EMERGENCY WARNING: If you are struggling to breathe, your lips or fingernails appear pale or blue, your rescue inhaler provides no relief, or you cannot speak in full sentences, seek immediate emergency medical care or call your local emergency services (e.g. 911 / 112 / 999) without delay.',

  // Doctor sharing export disclaimer
  doctorExportHeader: `CONFIDENTIAL PATIENT SELF-LOGGED SUMMARY
Generated via ${APP_NAME} for healthcare provider review.
Notice: All records are self-reported by the patient for discussion purposes only. No algorithmic diagnosis or clinical scoring has been performed.`,
} as const;
