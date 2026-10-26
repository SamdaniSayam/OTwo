/**
 * Layout, Spacing, and Typography Constants
 * Enforces minimum 48dp touch targets and generous whitespace.
 */
export const Layout = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  borderRadius: {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  touchTarget: {
    minHeight: 48,
    minWidth: 48,
  },
  fontSize: {
    caption: 12,
    bodySm: 14,
    body: 16,
    subheading: 18,
    heading: 22,
    title: 28,
    display: 34,
  },
  lineHeight: {
    caption: 16,
    bodySm: 20,
    body: 24,
    subheading: 26,
    heading: 30,
    title: 36,
    display: 42,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
  shadow: {
    subtle: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    floating: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
  },
} as const;
