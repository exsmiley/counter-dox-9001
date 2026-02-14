import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Phase } from '../game/roles';
import Colors from '../constants/Colors';

export default function PhaseHeader({ phase, dayNumber, nightNumber, alivePlayers, totalPlayers }) {
  const getPhaseInfo = () => {
    switch (phase) {
      case Phase.SETUP:
        return { icon: 'settings-outline', label: 'Setup', color: Colors.textSecondary, bg: Colors.surface };
      case Phase.FIRST_NIGHT:
        return { icon: 'moon-outline', label: 'First Night', color: '#a78bfa', bg: Colors.night };
      case Phase.NIGHT:
        return { icon: 'moon-outline', label: `Night ${nightNumber}`, color: '#a78bfa', bg: Colors.night };
      case Phase.DAY:
        return { icon: 'sunny-outline', label: `Day ${dayNumber}`, color: Colors.dayAccent, bg: Colors.day };
      case Phase.NOMINATION:
        return { icon: 'hand-left-outline', label: 'Nomination', color: Colors.nominated, bg: Colors.day };
      case Phase.VOTING:
        return { icon: 'checkbox-outline', label: 'Voting', color: Colors.accent, bg: Colors.day };
      case Phase.EXECUTION:
        return { icon: 'hammer-outline', label: 'Execution', color: Colors.danger, bg: Colors.day };
      case Phase.GAME_OVER:
        return { icon: 'trophy-outline', label: 'Game Over', color: Colors.fabled, bg: Colors.backgroundDark };
      default:
        return { icon: 'help-outline', label: 'Unknown', color: Colors.textMuted, bg: Colors.surface };
    }
  };

  const info = getPhaseInfo();

  return (
    <View style={[styles.container, { backgroundColor: info.bg }]}>
      <View style={styles.left}>
        <Ionicons name={info.icon} size={22} color={info.color} />
        <Text style={[styles.phaseLabel, { color: info.color }]}>{info.label}</Text>
      </View>
      <View style={styles.right}>
        <Ionicons name="people-outline" size={16} color={Colors.textSecondary} />
        <Text style={styles.playerCount}>
          {alivePlayers}/{totalPlayers} alive
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phaseLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playerCount: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
