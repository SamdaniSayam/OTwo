import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { DisclaimerBanner } from '../../components/common/DisclaimerBanner';
import { EmergencyNotice } from '../../components/common/EmergencyNotice';
import { useCompanionStore } from '../../store/useCompanionStore';
import { Disclaimers } from '../../constants/disclaimers';

const PROMPT_CHIPS = [
  'How can I stay consistent?',
  'I missed two days of my routine',
  'Gentle breathing exercise for stress',
  'Tips for evening wind-down',
  'Hydration and airway health',
];

export const CompanionScreen = () => {
  const {
    messages,
    isTyping,
    loadMessages,
    sendMessage,
    emergencyAlertVisible,
    emergencyMessage,
    dismissEmergencyAlert,
  } = useCompanionStore();

  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<any>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const msg = inputText;
    setInputText('');
    sendMessage(msg);
  };

  const handleChipPress = (chip: string) => {
    sendMessage(chip);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.botBadge}>
              <Text style={{ fontSize: 18 }}>🌿</Text>
            </View>
            <View>
              <Text style={styles.title}>Lifestyle Mentor</Text>
              <Text style={styles.subtitle}>On-device only • Non-medical companion</Text>
            </View>
          </View>
        </View>

        <DisclaimerBanner
          customText={Disclaimers.aiCompanionNotice}
          style={{ marginHorizontal: Layout.spacing.base, marginVertical: Layout.spacing.xs }}
        />

        {/* Message Feed */}
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  isUser ? styles.userBubble : styles.assistantBubble,
                  msg.isEmergencyAlert && styles.emergencyBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    isUser ? styles.userText : styles.assistantText,
                  ]}
                >
                  {msg.text}
                </Text>
              </View>
            );
          })}

          {isTyping && (
            <View style={[styles.messageBubble, styles.assistantBubble, { width: 60 }]}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          )}
        </ScrollView>

        {/* Prompt suggestion chips */}
        <View style={styles.chipsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {PROMPT_CHIPS.map((chip) => (
              <TouchableOpacity
                key={chip}
                activeOpacity={0.7}
                onPress={() => handleChipPress(chip)}
                style={styles.chip}
              >
                <Text style={styles.chipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Ask about routines, habits, or encouragement..."
            placeholderTextColor={Colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            style={styles.input}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSend}
            disabled={!inputText.trim()}
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Emergency Escalation Modal */}
      <EmergencyNotice
        visible={emergencyAlertVisible}
        onDismiss={dismissEmergencyAlert}
        customMessage={emergencyMessage}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Layout.spacing.base,
    paddingVertical: Layout.spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.sm,
  },
  title: {
    fontSize: Layout.fontSize.body,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: Layout.spacing.base,
    paddingVertical: Layout.spacing.md,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: Layout.borderRadius.lg,
    paddingHorizontal: Layout.spacing.base,
    paddingVertical: Layout.spacing.md,
    marginVertical: Layout.spacing.xs,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 2,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 2,
  },
  emergencyBubble: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.error,
  },
  messageText: {
    fontSize: Layout.fontSize.bodySm,
    lineHeight: Layout.lineHeight.bodySm,
  },
  userText: {
    color: Colors.textInverse,
  },
  assistantText: {
    color: Colors.textPrimary,
  },
  chipsContainer: {
    paddingVertical: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.base,
    backgroundColor: Colors.surfaceSubtle,
  },
  chip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.full,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.xs + 2,
    marginRight: Layout.spacing.xs,
  },
  chipText: {
    fontSize: Layout.fontSize.caption,
    color: Colors.primaryDark,
    fontWeight: Layout.fontWeight.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Layout.spacing.base,
    paddingVertical: Layout.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    minHeight: Layout.touchTarget.minHeight,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Layout.spacing.md,
    fontSize: Layout.fontSize.bodySm,
    color: Colors.textPrimary,
  },
  sendButton: {
    width: Layout.touchTarget.minWidth,
    height: Layout.touchTarget.minHeight,
    backgroundColor: Colors.primary,
    borderRadius: Layout.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Layout.spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.border,
  },
  sendIcon: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
