/**
 * Strict Design System Palette - Healing & Natural Green
 * Based on OTwo specification.
 */
export const Colors = {
  // Primary palette
  primary: '#2F5D50',           // Soft Forest Green
  primaryDark: '#1E3D34',       // Deep Forest
  primaryLight: '#437E6E',      // Light Forest
  secondary: '#87A96B',         // Sage Green
  secondaryLight: '#B7CBB1',    // Pale Sage
  accent: '#A8E6CF',            // Mint Green (Accent / Success)
  accentDark: '#62BA9A',        // Deep Mint

  // Background & Surfaces
  background: '#F7F9F7',        // Very light sage
  surface: '#FFFFFF',           // White
  surfaceSubtle: '#F0F4F1',     // Calm Sage Tint
  surfaceElevated: '#FFFFFF',

  // Typography
  textPrimary: '#1A1A1A',       // Deep charcoal
  textSecondary: '#5A5A5A',     // Soft gray
  textMuted: '#667066',         // Muted gray-green (AA contrast on light surfaces)
  textInverse: '#FFFFFF',       // White on dark buttons

  // Status & Feedback (Muted & Calm)
  success: '#2F5D50',
  successLight: '#E8F5E9',
  warning: '#92400E',           // Dark amber for AA text contrast
  warningLight: '#FEF3C7',
  error: '#B42318',             // Deep coral (AA contrast, used sparingly)
  errorLight: '#FDE8E8',

  // Borders & Dividers
  border: '#E3EAE4',
  borderLight: '#EDF2EE',
  borderFocus: '#2F5D50',

  // Badges & Highlights
  recoveryBadge: '#E0F2FE',
  recoveryBadgeText: '#0369A1',
  streakBadge: '#FEF3C7',
  streakBadgeText: '#B45309',
} as const;

export type ColorToken = keyof typeof Colors;
