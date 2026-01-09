import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useAppStore } from '../../src/store/app-store';
import {
  calculateGeneralRemainingMs,
  calculateReadingRemainingMs,
  calculateDeskRemainingMs,
  calculateGeneralFinishEpochMs,
  calculateDeskAdjustedFinishEpochMs,
  sortDesks,
  formatTimeAMPM,
  formatCountdown,
  isDeskFinished,
} from '@invigilator-timer/core';
import { colors, getTimerColor, getDeskCardColors } from '../../src/theme/colors';

export default function ExamScreen() {
  useKeepAwake(); // Keep screen awake during exam

  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    activeSession,
    timerState,
    loadSessionById,
    activateExam,
    applyDeskDP,
    pauseExam,
    resumeExam,
    transitionToExam,
  } = useAppStore();

  const [currentTime, setCurrentTime] = useState(Date.now());
  const [deskDPInputs, setDeskDPInputs] = useState<Record<string, string>>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load session if not already active
  useEffect(() => {
    if (!activeSession || activeSession.id !== id) {
      loadSessionById(id);
    }
  }, [id, activeSession, loadSessionById]);

  // Update current time every second
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Auto-transition from reading time to exam active
  useEffect(() => {
    if (!activeSession || !timerState) return;

    if (timerState.phase === 'reading_time') {
      const readingRemaining = calculateReadingRemainingMs(
        activeSession,
        timerState,
        performance.now()
      );

      if (readingRemaining <= 0) {
        transitionToExam();
      }
    }
  }, [activeSession, timerState, currentTime, transitionToExam]);

  if (!activeSession) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If no timer state exists, create a default pre-exam state
  const effectiveTimerState: TimerState = timerState ?? {
    phase: 'pre_exam',
    isPaused: false,
    monotonicStartMs: 0,
    pausedDurationMs: 0,
  };

  const currentMonotonicMs = performance.now();
  const sortedDesks = sortDesks(activeSession, effectiveTimerState);

  // Calculate times
  const generalFinishTime = calculateGeneralFinishEpochMs(activeSession);
  const generalRemaining = calculateGeneralRemainingMs(
    activeSession,
    effectiveTimerState,
    currentMonotonicMs
  );
  const readingRemaining = calculateReadingRemainingMs(
    activeSession,
    effectiveTimerState,
    currentMonotonicMs
  );

  const isReadingPhase = effectiveTimerState.phase === 'reading_time';
  const isPreExam = effectiveTimerState.phase === 'pre_exam';

  const handleActivate = () => {
    activateExam();
  };

  const handleApplyDP = (deskId: string) => {
    const inputValue = deskDPInputs[deskId];
    if (!inputValue || inputValue.trim() === '') {
      Alert.alert('Error', 'Please enter D.P. time in minutes');
      return;
    }

    const dpMinutes = parseInt(inputValue, 10);
    if (isNaN(dpMinutes) || dpMinutes <= 0) {
      Alert.alert('Error', 'Please enter a valid number of minutes');
      return;
    }

    applyDeskDP(deskId, dpMinutes);

    // Reset input after activation (Excel box 6 reset after activation)
    setDeskDPInputs((prev) => ({ ...prev, [deskId]: '' }));
  };

  const handlePauseResume = () => {
    if (effectiveTimerState.isPaused) {
      resumeExam();
    } else {
      pauseExam();
    }
  };

  const handleEndExam = () => {
    Alert.alert(
      'End Exam',
      'Are you sure you want to end this exam session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          style: 'destructive',
          onPress: () => {
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.examName}>{activeSession.name}</Text>
        <Text style={styles.currentTime}>
          CURRENT TIME: {formatTimeAMPM(currentTime)}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {isPreExam ? (
          <View style={styles.preExamState}>
            <Text style={styles.preExamText}>Ready to begin</Text>
            <TouchableOpacity style={styles.activateButton} onPress={handleActivate}>
              <Text style={styles.activateButtonText}>Activate Exam Start</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {isReadingPhase && (
              <View style={styles.readingTimeSection}>
                <Text style={styles.sectionTitle}>READING TIME</Text>
                <Text style={[styles.largeTime, styles.readingTime]}>
                  {formatCountdown(readingRemaining)}
                </Text>
                <Text style={styles.subtitle}>Writing time will begin automatically</Text>
              </View>
            )}

            <View style={styles.generalSection}>
              <Text style={styles.sectionTitle}>GENERAL EXAM</Text>
              <View style={styles.generalRow}>
                <View style={styles.generalColumn}>
                  <Text style={styles.label}>Finish Time</Text>
                  <Text style={styles.mediumTime}>{formatTimeAMPM(generalFinishTime)}</Text>
                </View>
                <View style={styles.generalColumn}>
                  <Text style={styles.label}>Time Remaining</Text>
                  <Text style={[styles.mediumTime, { color: getTimerColor(generalRemaining) }]}>
                    {formatCountdown(generalRemaining)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.desksSection}>
              <Text style={styles.sectionTitle}>DESKS</Text>
              {sortedDesks.map((desk) => {
                const deskRemaining = calculateDeskRemainingMs(
                  activeSession,
                  desk,
                  effectiveTimerState,
                  currentMonotonicMs
                );
                const adjustedFinish = calculateDeskAdjustedFinishEpochMs(
                  activeSession,
                  desk,
                  effectiveTimerState
                );
                const finished = isDeskFinished(deskRemaining);
                const { backgroundColor, borderColor } = getDeskCardColors(deskRemaining, finished);

                return (
                  <View
                    key={desk.id}
                    style={[
                      styles.deskCard,
                      { backgroundColor, borderColor },
                    ]}
                  >
                    <View style={styles.deskHeader}>
                      <Text style={styles.deskTitle}>
                        Desk #{desk.deskNumber}
                        {desk.studentName && ` | ${desk.studentName}`}
                      </Text>
                    </View>

                    <View style={styles.deskInfo}>
                      <View style={styles.deskColumn}>
                        <Text style={styles.deskLabel}>Adjusted Finish</Text>
                        <Text style={styles.deskTime}>{formatTimeAMPM(adjustedFinish)}</Text>
                      </View>
                      <View style={styles.deskColumn}>
                        <Text style={styles.deskLabel}>Remaining</Text>
                        <Text style={[styles.deskTime, { color: getTimerColor(deskRemaining) }]}>
                          {formatCountdown(deskRemaining)}
                        </Text>
                      </View>
                    </View>

                    {!isPreExam && (
                      <View style={styles.dpControls}>
                        <Text style={styles.dpLabel}>D.P. Time Taken (min):</Text>
                        <View style={styles.dpRow}>
                          <TextInput
                            style={styles.dpInput}
                            value={deskDPInputs[desk.id] || ''}
                            onChangeText={(text) =>
                              setDeskDPInputs((prev) => ({ ...prev, [desk.id]: text }))
                            }
                            keyboardType="number-pad"
                            placeholder="0"
                            placeholderTextColor={colors.inputPlaceholder}
                          />
                          <TouchableOpacity
                            style={styles.dpButton}
                            onPress={() => handleApplyDP(desk.id)}
                          >
                            <Text style={styles.dpButtonText}>Activate</Text>
                          </TouchableOpacity>
                        </View>
                        {desk.dpTimeTakenMinutes > 0 && (
                          <Text style={styles.dpTotal}>
                            Total D.P.: {desk.dpTimeTakenMinutes} min
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.controlButton, effectiveTimerState.isPaused && styles.resumeButton]}
                onPress={handlePauseResume}
              >
                <Text style={styles.controlButtonText}>
                  {effectiveTimerState.isPaused ? 'Resume' : 'Pause All'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, styles.endButton]}
                onPress={handleEndExam}
              >
                <Text style={styles.controlButtonText}>End Exam</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  examName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  currentTime: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  preExamState: {
    padding: 40,
    alignItems: 'center',
  },
  preExamText: {
    fontSize: 24,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  activateButton: {
    backgroundColor: colors.primary,
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  activateButtonText: {
    color: colors.textOnPrimary,
    fontSize: 20,
    fontWeight: '600',
  },
  readingTimeSection: {
    backgroundColor: colors.readingTimeBg,
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.readingTimeBorder,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 1,
  },
  largeTime: {
    fontSize: 64,
    fontWeight: 'bold',
  },
  readingTime: {
    color: colors.readingTime,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: 8,
  },
  generalSection: {
    backgroundColor: colors.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  generalRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  generalColumn: {
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  mediumTime: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  desksSection: {
    padding: 20,
  },
  deskCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.timerGreen,
  },
  deskHeader: {
    marginBottom: 12,
  },
  deskTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  deskInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  deskColumn: {
    alignItems: 'center',
  },
  deskLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  deskTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  dpControls: {
    marginTop: 8,
  },
  dpLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  dpRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dpInput: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    color: colors.inputText,
    textAlign: 'center',
  },
  dpButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpButtonText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  dpTotal: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
  controls: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  controlButton: {
    backgroundColor: colors.warning,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  resumeButton: {
    backgroundColor: colors.success,
  },
  endButton: {
    backgroundColor: colors.danger,
  },
  controlButtonText: {
    color: colors.textOnPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
});
