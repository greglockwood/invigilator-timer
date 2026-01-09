import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/store/app-store';
import { formatTimeAMPM } from '@invigilator-timer/core';
import { createDemoSession } from '../src/utils/demo-seed';

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
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  newButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  newButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  demoButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    marginBottom: 24,
  },
  demoButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
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
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionInfo: {
    marginBottom: 12,
  },
  sessionName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  sessionDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 12,
    color: '#999',
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
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#FF3B30',
  },
});
