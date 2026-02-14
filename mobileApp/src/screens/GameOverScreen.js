import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGame } from '../context/GameContext';
import { getRoleById, RoleType, Team } from '../game/roles';
import RoleCard from '../components/RoleCard';
import Colors from '../constants/Colors';

export default function GameOverScreen({ navigation }) {
  const { gameState, actions } = useGame();

  if (!gameState) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.emptyText}>No game data</Text>
      </SafeAreaView>
    );
  }

  const { players, winner, gameLog, dayNumber, nightNumber, script } = gameState;
  const isGoodWin = winner === Team.GOOD;

  const sortedPlayers = [...players].sort((a, b) => {
    const aRole = getRoleById(a.role);
    const bRole = getRoleById(b.role);
    const teamOrder = { evil: 0, good: 1 };
    const typeOrder = { demon: 0, minion: 1, outsider: 2, townsfolk: 3 };
    const at = teamOrder[aRole?.team] ?? 2;
    const bt = teamOrder[bRole?.team] ?? 2;
    if (at !== bt) return at - bt;
    const ato = typeOrder[aRole?.type] ?? 4;
    const bto = typeOrder[bRole?.type] ?? 4;
    return ato - bto;
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons
            name={isGoodWin ? 'sunny' : 'flame'}
            size={64}
            color={isGoodWin ? Colors.good : Colors.evil}
          />
          <Text style={[styles.title, { color: isGoodWin ? Colors.good : Colors.evil }]}>
            {isGoodWin ? 'Good Wins!' : 'Evil Wins!'}
          </Text>
          <Text style={styles.subtitle}>
            {script} - Day {dayNumber}, Night {nightNumber}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{players.length}</Text>
            <Text style={styles.statLabel}>Players</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{dayNumber}</Text>
            <Text style={styles.statLabel}>Days</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {players.filter(p => p.alive).length}
            </Text>
            <Text style={styles.statLabel}>Survivors</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>All Players</Text>
        {sortedPlayers.map(player => {
          const role = getRoleById(player.role);
          const isWinningTeam = role?.team === winner;

          return (
            <View
              key={player.id}
              style={[
                styles.playerRow,
                { borderLeftColor: role?.team === Team.EVIL ? Colors.evil : Colors.good },
              ]}
            >
              <View style={styles.playerInfo}>
                <View style={styles.playerHeader}>
                  <Text style={[styles.playerName, !player.alive && styles.deadText]}>
                    {player.name}
                  </Text>
                  {!player.alive && (
                    <Ionicons name="skull-outline" size={14} color={Colors.dead} />
                  )}
                  {isWinningTeam && (
                    <Ionicons name="trophy" size={14} color={Colors.fabled} />
                  )}
                </View>
                <Text style={[styles.roleName, { color: getRoleColor(role) }]}>
                  {role?.name || 'Unknown'}
                </Text>
                <Text style={styles.roleType}>
                  {role?.type?.charAt(0).toUpperCase() + role?.type?.slice(1)} ({role?.team === Team.EVIL ? 'Evil' : 'Good'})
                </Text>
              </View>
              <Text style={[styles.teamLabel, {
                color: role?.team === Team.EVIL ? Colors.evil : Colors.good,
              }]}>
                {role?.team === Team.EVIL ? 'EVIL' : 'GOOD'}
              </Text>
            </View>
          );
        })}

        {/* Key events */}
        <Text style={styles.sectionTitle}>Key Events</Text>
        <View style={styles.eventsContainer}>
          {gameLog
            .filter(l => l.type === 'gameOver' || l.type === 'phase' || (l.type === 'day' && !l.private))
            .slice(-15)
            .map((log, idx) => (
              <View key={idx} style={styles.eventRow}>
                <Ionicons
                  name={log.type === 'gameOver' ? 'trophy-outline' : log.type === 'phase' ? 'time-outline' : 'chatbubble-outline'}
                  size={14}
                  color={Colors.textMuted}
                />
                <Text style={styles.eventText}>{log.message}</Text>
              </View>
            ))}
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              actions.resetGame();
              navigation.replace('MainMenu');
            }}
          >
            <Ionicons name="home-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>Main Menu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.newGameButton]}
            onPress={() => {
              actions.resetGame();
              navigation.replace('CreateGame');
            }}
          >
            <Ionicons name="refresh-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>New Game</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getRoleColor(role) {
  if (!role) return Colors.textMuted;
  switch (role.type) {
    case RoleType.TOWNSFOLK: return Colors.townsfolk;
    case RoleType.OUTSIDER: return Colors.outsider;
    case RoleType.MINION: return Colors.minion;
    case RoleType.DEMON: return Colors.demon;
    default: return Colors.textSecondary;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyText: {
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 100,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
    borderLeftWidth: 3,
  },
  playerInfo: {
    flex: 1,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  deadText: {
    color: Colors.dead,
    textDecorationLine: 'line-through',
  },
  roleName: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  roleType: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  teamLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  eventsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
  },
  eventText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  newGameButton: {
    backgroundColor: Colors.success,
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
