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
  getColourCue,
  isDeskFinished,
} from '@invigilator-timer/core';

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

  if (!activeSession || !timerState) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentMonotonicMs = performance.now();
  const sortedDesks = sortDesks(activeSession, timerState);

  // Calculate times
  const generalFinishTime = calculateGeneralFinishEpochMs(activeSession);
  const generalRemaining = calculateGeneralRemainingMs(
    activeSession,
    timerState,
    currentMonotonicMs
  );
  const readingRemaining = calculateReadingRemainingMs(
    activeSession,
    timerState,
    currentMonotonicMs
  );

  const isReadingPhase = timerState.phase === 'reading_time';
  const isPreExam = timerState.phase === 'pre_exam';

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
    if (timerState.isPaused) {
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
                  <Text style={[styles.mediumTime, getTimeColourStyle(generalRemaining)]}>
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
                  timerState,
                  currentMonotonicMs
                );
                const adjustedFinish = calculateDeskAdjustedFinishEpochMs(
                  activeSession,
                  desk,
                  timerState
                );
                const finished = isDeskFinished(deskRemaining);
                const colourCue = getColourCue(deskRemaining);

                return (
                  <View
                    key={desk.id}
                    style={[
                      styles.deskCard,
                      finished && styles.deskCardFinished,
                      colourCue === 'red' && !finished && styles.deskCardRed,
                      colourCue === 'amber' && !finished && styles.deskCardAmber,
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
                        <Text style={[styles.deskTime, getTimeColourStyle(deskRemaining)]}>
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
                            placeholderTextColor="#999"
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
                style={[styles.controlButton, timerState.isPaused && styles.resumeButton]}
                onPress={handlePauseResume}
              >
                <Text style={styles.controlButtonText}>
                  {timerState.isPaused ? 'Resume' : 'Pause All'}
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

function getTimeColourStyle(remainingMs: number) {
  const cue = getColourCue(remainingMs);
  if (cue === 'green') return styles.timeGreen;
  if (cue === 'amber') return styles.timeAmber;
  return styles.timeRed;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  examName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  currentTime: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
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
    color: '#666',
  },
  preExamState: {
    padding: 40,
    alignItems: 'center',
  },
  preExamText: {
    fontSize: 24,
    color: '#666',
    marginBottom: 24,
  },
  activateButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  activateButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  readingTimeSection: {
    backgroundColor: '#FFF9E6',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#FFD700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
    marginBottom: 8,
    letterSpacing: 1,
  },
  largeTime: {
    fontSize: 64,
    fontWeight: 'bold',
  },
  readingTime: {
    color: '#FF9500',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  generalSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    color: '#666',
    marginBottom: 4,
  },
  mediumTime: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  desksSection: {
    padding: 20,
  },
  deskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#34C759',
  },
  deskCardAmber: {
    borderColor: '#FF9500',
    backgroundColor: '#FFF9E6',
  },
  deskCardRed: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFE6E6',
  },
  deskCardFinished: {
    borderColor: '#666',
    backgroundColor: '#F0F0F0',
  },
  deskHeader: {
    marginBottom: 12,
  },
  deskTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  deskInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  deskColumn: {
    alignItems: 'center',
  },
  deskLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  deskTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  dpControls: {
    marginTop: 8,
  },
  dpLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dpRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dpInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
  },
  dpButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dpTotal: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
  },
  controls: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  controlButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  resumeButton: {
    backgroundColor: '#34C759',
  },
  endButton: {
    backgroundColor: '#FF3B30',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  timeGreen: {
    color: '#34C759',
  },
  timeAmber: {
    color: '#FF9500',
  },
  timeRed: {
    color: '#FF3B30',
  },
});
