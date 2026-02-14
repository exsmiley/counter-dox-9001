import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

export default function GameLog({ logs, showPrivate }) {
  if (!logs || logs.length === 0) return null;

  const visibleLogs = showPrivate ? logs : logs.filter(l => !l.private);

  const getLogIcon = (type) => {
    switch (type) {
      case 'setup': return { name: 'settings-outline', color: Colors.textMuted };
      case 'phase': return { name: 'time-outline', color: Colors.accent };
      case 'night': return { name: 'moon-outline', color: Colors.nightAccent };
      case 'day': return { name: 'sunny-outline', color: Colors.dayAccent };
      case 'gameOver': return { name: 'trophy-outline', color: Colors.fabled };
      default: return { name: 'chatbubble-outline', color: Colors.textSecondary };
    }
  };

  return (
    <ScrollView style={styles.container}>
      {visibleLogs.slice().reverse().map((log, idx) => {
        const icon = getLogIcon(log.type);
        return (
          <View key={idx} style={[styles.logEntry, log.private && styles.privateEntry]}>
            <Ionicons name={icon.name} size={14} color={icon.color} style={styles.icon} />
            <Text style={[styles.logText, log.private && styles.privateText]}>
              {log.message}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 8,
  },
  logEntry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '40',
  },
  privateEntry: {
    backgroundColor: Colors.accent + '10',
  },
  icon: {
    marginTop: 2,
    marginRight: 8,
  },
  logText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
    lineHeight: 18,
  },
  privateText: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});
