import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { Button } from './Button';

interface AppErrorBoundaryState {
  error: Error | null;
}

/**
 * App-level render error boundary. Bootstrap failures (database/auth) are
 * handled separately by App; this catches unexpected render crashes and gives
 * the user a truthful recovery path instead of a blank screen.
 */
export class AppErrorBoundary extends React.Component<
  React.PropsWithChildren,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (__DEV__) {
      console.error('OTwo render error', error);
    }
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title} accessibilityRole="header">
            Something went wrong
          </Text>
          <Text style={styles.body} accessibilityRole="alert">
            OTwo could not draw this screen. Your locally stored data has not been uploaded or
            changed. Try again, or close and reopen the app.
          </Text>
          {__DEV__ ? (
            <Text style={styles.detail} selectable>
              {this.state.error.message}
            </Text>
          ) : null}
          <Button title="Try Again" size="lg" onPress={this.handleRetry} style={styles.button} />
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Layout.spacing.xl,
  },
  title: {
    fontSize: Layout.fontSize.title,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.primaryDark,
    textAlign: 'center',
  },
  body: {
    fontSize: Layout.fontSize.body,
    color: Colors.textSecondary,
    lineHeight: Layout.lineHeight.body,
    textAlign: 'center',
    marginTop: Layout.spacing.md,
  },
  detail: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    marginTop: Layout.spacing.lg,
  },
  button: {
    marginTop: Layout.spacing.xl,
  },
});
