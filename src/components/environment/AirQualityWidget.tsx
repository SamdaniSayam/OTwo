import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { useEnvStore } from '../../store/useEnvStore';
import { Badge } from '../common/Badge';

export const AirQualityWidget: React.FC = () => {
  const { enabled, data } = useEnvStore();

  if (!enabled || !data) return null;

  const getAqiVariant = (cat: string) => {
    switch (cat) {
      case 'Good':
        return 'mint';
      case 'Moderate':
        return 'sage';
      case 'Sensitive':
      case 'Unhealthy':
        return 'warning';
      default:
        return 'mint';
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.icon}>🌤️</Text>
          <Text style={styles.title}>Public Air Quality & Weather</Text>
        </View>
        <Badge
          label={`${data.aqiCategory} (AQI ${data.aqi})`}
          variant={getAqiVariant(data.aqiCategory)}
        />
      </View>
      <Text style={styles.summary}>{data.summary}</Text>
      <Text style={styles.disclaimerText}>
        Read-only public data for general awareness. Can be disabled in Settings.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Layout.spacing.base,
    marginVertical: Layout.spacing.xs,
    ...Layout.shadow.subtle,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
    marginRight: Layout.spacing.xs,
  },
  title: {
    fontSize: Layout.fontSize.bodySm,
    fontWeight: Layout.fontWeight.semiBold,
    color: Colors.textPrimary,
  },
  summary: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  disclaimerText: {
    fontSize: Layout.fontSize.caption - 1,
    color: Colors.textMuted,
    marginTop: Layout.spacing.xs,
    fontStyle: 'italic',
  },
});
