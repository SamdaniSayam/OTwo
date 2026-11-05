import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { useEnvStore } from '../../store/useEnvStore';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

export const AirQualityWidget: React.FC = () => {
  const { enabled, data, status, isLoading, requestEnvironmentAccess, refreshEnvironment } =
    useEnvStore();

  if (!enabled) return null;

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

  if (!data) {
    const message =
      status === 'denied'
        ? Platform.OS === 'web'
          ? 'Location permission is blocked in this browser. Air quality is not shown for a guessed location.'
          : 'Location permission is blocked. Air quality is not shown for a guessed location.'
        : status === 'unavailable'
          ? 'Live air quality is unavailable right now. No reading is shown rather than inventing an all-clear.'
          : status === 'checking' || isLoading
            ? 'Checking your local air quality…'
            : 'Allow location access to show air quality for where you are now. Your coordinates are used for this request only and are not stored.';

    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.icon} accessibilityElementsHidden>
              🌤️
            </Text>
            <Text style={styles.title} accessibilityRole="header">
              Public Air Quality
            </Text>
          </View>
          {status === 'checking' || isLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : null}
        </View>
        <Text style={styles.summary} accessibilityLiveRegion="polite">
          {message}
        </Text>
        {status === 'needs_permission' || status === 'idle' ? (
          <Button
            title="Enable Local Air Quality"
            size="md"
            variant="outline"
            onPress={() => requestEnvironmentAccess()}
            style={{ marginTop: Layout.spacing.sm }}
          />
        ) : null}
        {status === 'denied' ? (
          <Button
            title={Platform.OS === 'web' ? 'Try Again' : 'Open Device Settings'}
            size="md"
            variant="outline"
            onPress={() => {
              if (Platform.OS === 'web') {
                refreshEnvironment();
              } else {
                Linking.openSettings().catch(() => undefined);
              }
            }}
            style={{ marginTop: Layout.spacing.sm }}
          />
        ) : null}
        {status === 'unavailable' ? (
          <Button
            title="Try Again"
            size="md"
            variant="outline"
            onPress={() => refreshEnvironment()}
            style={{ marginTop: Layout.spacing.sm }}
          />
        ) : null}
        <Text style={styles.disclaimerText}>
          Read-only public data for general awareness. Can be disabled in Settings.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`Public air quality: European AQI ${data.aqi}, ${data.aqiCategory}. Read-only public data.`}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.icon} accessibilityElementsHidden>
            🌤️
          </Text>
          <Text style={styles.title} accessibilityRole="header">
            Public Air Quality
          </Text>
        </View>
        <Badge
          label={`${data.aqiCategory} (AQI ${data.aqi})`}
          variant={getAqiVariant(data.aqiCategory)}
        />
      </View>
      <Text style={styles.summary}>{data.summary}</Text>
      <Text style={styles.disclaimerText}>
        Read-only public data for your current location. Can be disabled in Settings.
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
    flexShrink: 1,
  },
  icon: {
    fontSize: 18,
    marginRight: Layout.spacing.xs,
  },
  title: {
    fontSize: Layout.fontSize.bodySm,
    fontWeight: Layout.fontWeight.semiBold,
    color: Colors.textPrimary,
    flexShrink: 1,
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
