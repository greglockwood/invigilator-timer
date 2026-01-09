import { useState, useEffect } from 'react';
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
import { useAppStore } from '../../src/store/app-store';
import { createSession, createDesk } from '@invigilator-timer/core';
import { colors } from '../../src/theme/colors';

export default function SessionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { createSession: saveSession, loadSessionById } = useAppStore();

  const isNew = id === 'new';

  // Form state
  const [examName, setExamName] = useState('');
  const [examDuration, setExamDuration] = useState('90');
  const [readingTime, setReadingTime] = useState('10');
  const [startHour, setStartHour] = useState('09');
  const [startMinute, setStartMinute] = useState('00');
  const [desks, setDesks] = useState<Array<{ id: string; number: number; studentName: string }>>([
    { id: '1', number: 1, studentName: '' },
    { id: '2', number: 2, studentName: '' },
  ]);

  useEffect(() => {
    if (!isNew) {
      // Load existing session for editing
      loadSessionById(id).then(() => {
        const session = useAppStore.getState().activeSession;
        if (session) {
          setExamName(session.name);
          setExamDuration(session.examDurationMinutes.toString());
          setReadingTime(session.readingTimeMinutes.toString());

          const startDate = new Date(session.startTimeEpochMs);
          setStartHour(startDate.getHours().toString().padStart(2, '0'));
          setStartMinute(startDate.getMinutes().toString().padStart(2, '0'));

          setDesks(
            session.desks.map((d) => ({
              id: d.id,
              number: d.deskNumber,
              studentName: d.studentName ?? '',
            }))
          );
        }
      });
    }
  }, [id, isNew, loadSessionById]);

  const handleAddDesk = () => {
    const newDeskNumber = desks.length + 1;
    setDesks([...desks, { id: `${Date.now()}`, number: newDeskNumber, studentName: '' }]);
  };

  const handleRemoveDesk = (deskId: string) => {
    if (desks.length <= 1) {
      Alert.alert('Error', 'You must have at least one desk');
      return;
    }
    setDesks(desks.filter((d) => d.id !== deskId));
  };

  const handleUpdateDeskName = (deskId: string, studentName: string) => {
    setDesks(desks.map((d) => (d.id === deskId ? { ...d, studentName } : d)));
  };

  const handleSave = async () => {
    // Validation
    if (!examName.trim()) {
      Alert.alert('Validation Error', 'Please enter an exam name');
      return;
    }

    const examDurationNum = parseInt(examDuration, 10);
    const readingTimeNum = parseInt(readingTime, 10);
    const startHourNum = parseInt(startHour, 10);
    const startMinuteNum = parseInt(startMinute, 10);

    if (isNaN(examDurationNum) || examDurationNum <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid exam duration');
      return;
    }

    if (isNaN(readingTimeNum) || readingTimeNum < 0) {
      Alert.alert('Validation Error', 'Please enter a valid reading time');
      return;
    }

    if (isNaN(startHourNum) || startHourNum < 0 || startHourNum > 23) {
      Alert.alert('Validation Error', 'Please enter a valid hour (0-23)');
      return;
    }

    if (isNaN(startMinuteNum) || startMinuteNum < 0 || startMinuteNum > 59) {
      Alert.alert('Validation Error', 'Please enter a valid minute (0-59)');
      return;
    }

    // Create start time epoch
    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      startHourNum,
      startMinuteNum,
      0,
      0
    );

    const startTimeEpochMs = startDate.getTime();

    // Create or update session
    let session;
    if (isNew) {
      // Create new session with new ID
      session = createSession(
        examName.trim(),
        examDurationNum,
        readingTimeNum,
        startTimeEpochMs,
        desks.length
      );
    } else {
      // Reuse existing session ID when editing
      const existingSession = useAppStore.getState().activeSession;
      if (!existingSession) {
        Alert.alert('Error', 'Session not found');
        return;
      }

      session = createSession(
        examName.trim(),
        examDurationNum,
        readingTimeNum,
        startTimeEpochMs,
        desks.length
      );

      // Preserve the existing session ID and desk IDs
      session.id = existingSession.id;
      session.desks = session.desks.map((desk, index) => ({
        ...desk,
        id: existingSession.desks[index]?.id ?? desk.id,
      }));
    }

    // Update desk student names
    session.desks = session.desks.map((desk, index) => ({
      ...desk,
      studentName: desks[index].studentName.trim() || undefined,
    }));

    try {
      await saveSession(session);
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save session');
    }
  };

  const handleActivateExam = async () => {
    await handleSave();

    // Navigate to exam screen
    const sessionId = useAppStore.getState().activeSession?.id;
    if (sessionId) {
      router.replace(`/exam/${sessionId}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isNew ? 'New Session' : 'Edit Session'}</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Exam Name</Text>
          <TextInput
            style={styles.input}
            value={examName}
            onChangeText={setExamName}
            placeholder="e.g. Year 12 Maths"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Exam Duration (minutes)</Text>
          <TextInput
            style={styles.input}
            value={examDuration}
            onChangeText={setExamDuration}
            keyboardType="number-pad"
            placeholder="90"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Reading Time (minutes)</Text>
          <TextInput
            style={styles.input}
            value={readingTime}
            onChangeText={setReadingTime}
            keyboardType="number-pad"
            placeholder="10"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Start Time</Text>
          <View style={styles.timeRow}>
            <TextInput
              style={[styles.input, styles.timeInput]}
              value={startHour}
              onChangeText={setStartHour}
              keyboardType="number-pad"
              placeholder="09"
              placeholderTextColor={colors.inputPlaceholder}
              maxLength={2}
            />
            <Text style={styles.timeSeparator}>:</Text>
            <TextInput
              style={[styles.input, styles.timeInput]}
              value={startMinute}
              onChangeText={setStartMinute}
              keyboardType="number-pad"
              placeholder="00"
              placeholderTextColor={colors.inputPlaceholder}
              maxLength={2}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Desks</Text>
          {desks.map((desk) => (
            <View key={desk.id} style={styles.deskRow}>
              <Text style={styles.deskNumber}>Desk #{desk.number}</Text>
              <TextInput
                style={[styles.input, styles.deskInput]}
                value={desk.studentName}
                onChangeText={(text) => handleUpdateDeskName(desk.id, text)}
                placeholder="Student name (optional)"
                placeholderTextColor={colors.inputPlaceholder}
              />
              {desks.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveDesk(desk.id)}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={handleAddDesk}>
            <Text style={styles.addButtonText}>+ Add Desk</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Session</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.activateButton} onPress={handleActivateExam}>
            <Text style={styles.activateButtonText}>
              {isNew ? 'Activate Exam Start' : 'Go to Exam'}
            </Text>
          </TouchableOpacity>
        </View>
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
  backButton: {
    fontSize: 16,
    color: colors.primary,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: colors.inputText,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    flex: 1,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginHorizontal: 8,
  },
  deskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deskNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    width: 80,
  },
  deskInput: {
    flex: 1,
    marginHorizontal: 8,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: colors.textOnPrimary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    marginTop: 12,
    marginBottom: 40,
  },
  saveButton: {
    backgroundColor: colors.success,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: colors.textOnPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  activateButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  activateButtonText: {
    color: colors.textOnPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
});
