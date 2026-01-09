import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/store/app-store';
import { formatTimeAMPM } from '@invigilator-timer/core';
import { createDemoSession } from '../src/utils/demo-seed';
import { colors, opacity } from '../src/theme/colors';

export default function HomeScreen() {
  const router = useRouter();
  const { sessionsList, refreshSessionsList, deleteSessionById, isInitialized, createSession } = useAppStore();

  useEffect(() => {
    if (isInitialized) {
      refreshSessionsList();
    }
  }, [isInitialized, refreshSessionsList]);

  const handleNewSession = () => {
    router.push('/session/new');
  };

  const handleCreateDemo = async () => {
    try {
      const demoSession = createDemoSession();
      await createSession(demoSession);
      Alert.alert('Demo Created', 'A demo session has been created. Starting in 2 minutes with 5 min exam + 1 min reading time.');
      await refreshSessionsList();
    } catch (error) {
      Alert.alert('Error', 'Failed to create demo session');
    }
  };

  const handleViewSession = (sessionId: string) => {
    router.push(`/session/${sessionId}`);
  };

  const handleDeleteSession = (sessionId: string, sessionName: string) => {
    Alert.alert(
      'Delete Session',
      `Are you sure you want to delete "${sessionName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSessionById(sessionId);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete session');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Invigilator Timer</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.newButton} onPress={handleNewSession}>
          <Text style={styles.newButtonText}>New Session</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.demoButton} onPress={handleCreateDemo}>
          <Text style={styles.demoButtonText}>Create Demo Session (Quick Test)</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Existing Sessions</Text>
        </View>

        <ScrollView style={styles.sessionsList}>
          {sessionsList.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No sessions yet</Text>
              <Text style={styles.emptySubtext}>Tap "New Session" to create one</Text>
            </View>
          ) : (
            sessionsList.map((session) => (
              <View key={session.id} style={styles.sessionCard}>
                <TouchableOpacity
                  style={styles.sessionInfo}
                  onPress={() => handleViewSession(session.id)}
                >
                  <Text style={styles.sessionName}>{session.name}</Text>
                  <Text style={styles.sessionDetails}>
                    {session.examDurationMinutes} min • {formatTimeAMPM(session.startTimeEpochMs)}
                  </Text>
                  <Text style={styles.sessionDate}>
                    {new Date(session.createdAt).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                <View style={styles.sessionActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleViewSession(session.id)}
                  >
                    <Text style={styles.actionButtonText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteSession(session.id, session.name)}
                  >
                    <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  newButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  newButtonText: {
    color: colors.textOnPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  demoButton: {
    backgroundColor: colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 24,
  },
  demoButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sessionsList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textTertiary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textLight,
  },
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: opacity.shadow.light,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionInfo: {
    marginBottom: 12,
  },
  sessionName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  sessionDetails: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  actionButtonText: {
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteButtonText: {
    color: colors.danger,
  },
});
