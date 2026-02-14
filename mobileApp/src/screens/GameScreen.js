import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGame } from '../context/GameContext';
import { Phase, getRoleById, Team, RoleType } from '../game/roles';
import { getNightOrder } from '../game/GameEngine';
import PlayerCircle from '../components/PlayerCircle';
import PhaseHeader from '../components/PhaseHeader';
import VotingPanel from '../components/VotingPanel';
import NightAction from '../components/NightAction';
import GameLog from '../components/GameLog';
import RoleCard from '../components/RoleCard';
import Colors from '../constants/Colors';

export default function GameScreen({ navigation }) {
  const { gameState, actions } = useGame();
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showLog, setShowLog] = useState(false);
  const [showRole, setShowRole] = useState(null);
  const [nominatorId, setNominatorId] = useState(null);
  const [showGrimoire, setShowGrimoire] = useState(false);

  if (!gameState) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.emptyText}>No game in progress</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.replace('MainMenu')}>
          <Text style={styles.backText}>Back to Menu</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const {
    players, phase, dayNumber, nightNumber,
    currentNomination, executionTarget, voteThreshold,
    pendingNightAction, winner,
  } = gameState;

  const alivePlayers = players.filter(p => p.alive);

  // Navigate to game over
  useEffect(() => {
    if (phase === Phase.GAME_OVER) {
      navigation.replace('GameOver');
    }
  }, [phase]);

  // Handle player press
  const handlePlayerPress = (player) => {
    if (phase === Phase.DAY && nominatorId) {
      // Complete nomination
      if (player.alive && !player.hasBeenNominated) {
        actions.nominate(nominatorId, player.id);
        setNominatorId(null);
      }
      return;
    }
    setSelectedPlayer(player);
    setShowRole(player);
  };

  // Render night phase
  const renderNightPhase = () => {
    const nightOrder = getNightOrder(gameState);
    const currentRole = pendingNightAction;

    if (!currentRole) {
      return (
        <View style={styles.nightInfo}>
          <Ionicons name="moon" size={48} color={Colors.nightAccent} />
          <Text style={styles.nightTitle}>Night is complete</Text>
          <TouchableOpacity style={styles.actionButton} onPress={() => actions.endNight()}>
            <Ionicons name="sunny-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>Proceed to Dawn</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const owner = players.find(p => p.role === currentRole || p.actualRole === currentRole);

    return (
      <ScrollView style={styles.nightScroll}>
        <View style={styles.nightProgress}>
          <Text style={styles.nightProgressText}>
            Action {gameState.nightActionIndex + 1} of {nightOrder.length}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {
              width: `${((gameState.nightActionIndex + 1) / nightOrder.length) * 100}%`,
            }]} />
          </View>
        </View>

        <NightAction
          roleId={currentRole}
          players={players}
          isFirstNight={gameState.isFirstNight}
          playerInfo={owner?.nightInfo}
          onSubmit={(roleId, action) => {
            actions.nightAction(roleId, action);
            actions.advanceNight();
          }}
        />
      </ScrollView>
    );
  };

  // Render day phase
  const renderDayPhase = () => {
    return (
      <ScrollView style={styles.dayScroll}>
        {/* Deaths announcement */}
        {gameState.nightDeaths && gameState.nightDeaths.length > 0 && (
          <View style={styles.deathAnnouncement}>
            <Ionicons name="skull" size={20} color={Colors.danger} />
            <Text style={styles.deathText}>
              {gameState.nightDeaths.map(id =>
                players.find(p => p.id === id)?.name
              ).filter(Boolean).join(' and ')}{' '}
              died in the night.
            </Text>
          </View>
        )}

        {/* Player circle */}
        <PlayerCircle
          players={players}
          onPlayerPress={handlePlayerPress}
          selectedPlayerId={selectedPlayer?.id}
          showRoles={false}
        />

        {/* Nomination mode indicator */}
        {nominatorId && (
          <View style={styles.nominationMode}>
            <Text style={styles.nominationModeText}>
              Select a player for{' '}
              {players.find(p => p.id === nominatorId)?.name}{' '}
              to nominate
            </Text>
            <TouchableOpacity onPress={() => setNominatorId(null)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Day actions */}
        {!nominatorId && !currentNomination && (
          <View style={styles.dayActions}>
            <Text style={styles.dayActionsTitle}>Day Actions</Text>

            <TouchableOpacity
              style={styles.dayButton}
              onPress={() => {
                const eligible = alivePlayers.filter(p => !p.hasNominated);
                if (eligible.length === 0) {
                  Alert.alert('No Nominations', 'All alive players have already nominated today.');
                  return;
                }
                Alert.alert(
                  'Who is nominating?',
                  'Select the nominating player',
                  eligible.map(p => ({
                    text: p.name,
                    onPress: () => setNominatorId(p.id),
                  })).concat([{ text: 'Cancel', style: 'cancel' }])
                );
              }}
            >
              <Ionicons name="hand-left-outline" size={20} color={Colors.nominated} />
              <Text style={styles.dayButtonText}>Nominate</Text>
            </TouchableOpacity>

            {/* Slayer ability */}
            {players.some(p => p.role === 'slayer' && p.alive && !p.usedOncePerGameAbility) && (
              <TouchableOpacity
                style={styles.dayButton}
                onPress={() => {
                  const slayer = players.find(p => p.role === 'slayer' && p.alive && !p.usedOncePerGameAbility);
                  Alert.alert(
                    'Slayer Ability',
                    `${slayer.name} - choose a target`,
                    alivePlayers.filter(p => p.id !== slayer.id).map(p => ({
                      text: p.name,
                      onPress: () => actions.useSlayer(slayer.id, p.id),
                    })).concat([{ text: 'Cancel', style: 'cancel' }])
                  );
                }}
              >
                <Ionicons name="flash-outline" size={20} color={Colors.danger} />
                <Text style={styles.dayButtonText}>Slayer Ability</Text>
              </TouchableOpacity>
            )}

            {/* Execute button */}
            {executionTarget && (
              <TouchableOpacity
                style={[styles.dayButton, styles.executeButton]}
                onPress={() => {
                  const target = players.find(p => p.id === executionTarget);
                  Alert.alert(
                    'Confirm Execution',
                    `Execute ${target?.name}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Execute', style: 'destructive', onPress: () => actions.execute() },
                    ]
                  );
                }}
              >
                <Ionicons name="hammer" size={20} color="#fff" />
                <Text style={[styles.dayButtonText, { color: '#fff' }]}>
                  Execute {players.find(p => p.id === executionTarget)?.name}
                </Text>
              </TouchableOpacity>
            )}

            {/* End day / Skip execution */}
            <TouchableOpacity
              style={styles.dayButton}
              onPress={() => {
                if (executionTarget) {
                  Alert.alert(
                    'End Day',
                    `${players.find(p => p.id === executionTarget)?.name} will be executed. Continue?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Execute & End Day', onPress: () => {
                        actions.execute();
                        actions.startNextNight();
                      }},
                      { text: 'Skip Execution', onPress: () => {
                        actions.skipExecution();
                        actions.startNextNight();
                      }},
                    ]
                  );
                } else {
                  actions.skipExecution();
                  actions.startNextNight();
                }
              }}
            >
              <Ionicons name="moon-outline" size={20} color={Colors.nightAccent} />
              <Text style={styles.dayButtonText}>End Day (Go to Night)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Active voting */}
        {currentNomination && (
          <VotingPanel
            nomination={currentNomination}
            players={players}
            voteThreshold={voteThreshold}
            showAllVotes={true}
            onVote={(playerId, votesYes) => actions.castVote(playerId, votesYes)}
            onResolve={() => actions.resolveVote()}
          />
        )}

        {/* Nominations today */}
        {gameState.nominations.length > 0 && !currentNomination && (
          <View style={styles.nominationHistory}>
            <Text style={styles.historyTitle}>Today's Nominations</Text>
            {gameState.nominations.map((n, idx) => (
              <View key={n.id || idx} style={styles.historyRow}>
                <Text style={styles.historyText}>
                  {n.nominatorName} → {n.nomineeName}
                </Text>
                <Text style={[styles.historyVotes, {
                  color: n.voteCount >= voteThreshold ? Colors.success : Colors.textMuted,
                }]}>
                  {n.voteCount} votes
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  // Voting panel for batch voting (pass-and-play style)
  const renderVotingHelper = () => {
    if (!currentNomination) return null;

    const unvoted = players.filter(p => {
      if (!p.alive && p.ghostVoteUsed) return false;
      return currentNomination.votes[p.id] === undefined;
    });

    if (unvoted.length === 0) return null;

    return (
      <View style={styles.batchVoting}>
        <Text style={styles.batchTitle}>Vote: {currentNomination.nomineeName}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {unvoted.map(p => (
            <View key={p.id} style={styles.batchPlayer}>
              <Text style={styles.batchName} numberOfLines={1}>{p.name}</Text>
              <View style={styles.batchButtons}>
                <TouchableOpacity
                  style={[styles.batchBtn, { backgroundColor: Colors.voteYes }]}
                  onPress={() => actions.castVote(p.id, true)}
                >
                  <Ionicons name="thumbs-up" size={14} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.batchBtn, { backgroundColor: Colors.voteNo }]}
                  onPress={() => actions.castVote(p.id, false)}
                >
                  <Ionicons name="thumbs-down" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <PhaseHeader
        phase={phase}
        dayNumber={dayNumber}
        nightNumber={nightNumber}
        alivePlayers={alivePlayers.length}
        totalPlayers={players.length}
      />

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolButton} onPress={() => setShowGrimoire(true)}>
          <Ionicons name="book" size={20} color={Colors.accent} />
          <Text style={styles.toolText}>Grimoire</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton} onPress={() => setShowLog(!showLog)}>
          <Ionicons name="list" size={20} color={Colors.accent} />
          <Text style={styles.toolText}>Log</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolButton}
          onPress={() => {
            Alert.alert('End Game', 'Who wins?', [
              { text: 'Good Wins', onPress: () => actions.stDeclareWinner(Team.GOOD) },
              { text: 'Evil Wins', onPress: () => actions.stDeclareWinner(Team.EVIL) },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }}
        >
          <Ionicons name="flag" size={20} color={Colors.danger} />
          <Text style={styles.toolText}>End</Text>
        </TouchableOpacity>
      </View>

      {/* Main content */}
      <View style={styles.mainContent}>
        {(phase === Phase.FIRST_NIGHT || phase === Phase.NIGHT) && renderNightPhase()}
        {(phase === Phase.DAY || phase === Phase.NOMINATION || phase === Phase.EXECUTION) && renderDayPhase()}
        {phase === Phase.VOTING && renderDayPhase()}
      </View>

      {renderVotingHelper()}

      {/* Log overlay */}
      {showLog && (
        <Modal visible={showLog} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Game Log</Text>
                <TouchableOpacity onPress={() => setShowLog(false)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
              <GameLog logs={gameState.gameLog} showPrivate={true} />
            </View>
          </View>
        </Modal>
      )}

      {/* Grimoire overlay */}
      {showGrimoire && (
        <Modal visible={showGrimoire} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Grimoire</Text>
                <TouchableOpacity onPress={() => setShowGrimoire(false)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.grimoireScroll}>
                <PlayerCircle
                  players={players}
                  onPlayerPress={(p) => setShowRole(p)}
                  showRoles={true}
                  highlightEvil={true}
                />
                <View style={styles.grimoireList}>
                  {players.map(p => {
                    const role = getRoleById(p.role);
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={styles.grimoireRow}
                        onPress={() => {
                          Alert.alert(p.name, null, [
                            { text: 'Kill', onPress: () => actions.stKill(p.id), style: 'destructive' },
                            { text: 'Revive', onPress: () => actions.stRevive(p.id) },
                            { text: 'Toggle Poison', onPress: () => actions.stPoison(p.id, !p.poisoned) },
                            { text: 'Toggle Drunk', onPress: () => actions.stDrunk(p.id, !p.drunk) },
                            { text: 'Cancel', style: 'cancel' },
                          ]);
                        }}
                      >
                        <View style={styles.grimoirePlayerInfo}>
                          <Text style={[styles.grimoirePlayerName, !p.alive && styles.deadText]}>
                            {p.name}
                          </Text>
                          <Text style={[styles.grimoireRoleName, { color: getRoleColor(role) }]}>
                            {role?.name || 'Unknown'}
                          </Text>
                        </View>
                        <View style={styles.grimoireBadges}>
                          {!p.alive && <Text style={styles.badge}>DEAD</Text>}
                          {p.poisoned && <Text style={[styles.badge, styles.poisonBadge]}>PSN</Text>}
                          {p.drunk && <Text style={[styles.badge, styles.drunkBadge]}>DRK</Text>}
                          {p.protected && <Text style={[styles.badge, styles.protectedBadge]}>PRO</Text>}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {gameState.demonBluffs && gameState.demonBluffs.length > 0 && (
                  <View style={styles.bluffsSection}>
                    <Text style={styles.bluffsTitle}>Demon Bluffs</Text>
                    {gameState.demonBluffs.map(roleId => {
                      const role = getRoleById(roleId);
                      return role ? (
                        <RoleCard key={roleId} role={role} compact />
                      ) : null;
                    })}
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Player info modal */}
      {showRole && (
        <Modal visible={!!showRole} animationType="fade" transparent>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowRole(null)}
          >
            <View style={styles.roleModal}>
              <Text style={styles.roleModalName}>{showRole.name}</Text>
              <Text style={[styles.roleModalStatus, { color: showRole.alive ? Colors.alive : Colors.dead }]}>
                {showRole.alive ? 'Alive' : 'Dead'}
              </Text>
              {getRoleById(showRole.role) && (
                <RoleCard role={getRoleById(showRole.role)} />
              )}
              {showRole.nightInfo && (
                <View style={styles.nightInfoBox}>
                  <Text style={styles.nightInfoLabel}>{showRole.nightInfo.label}</Text>
                  <Text style={styles.nightInfoValue}>
                    {typeof showRole.nightInfo.value === 'object'
                      ? JSON.stringify(showRole.nightInfo.value)
                      : String(showRole.nightInfo.value)}
                  </Text>
                </View>
              )}
              <TouchableOpacity style={styles.closeRoleBtn} onPress={() => setShowRole(null)}>
                <Text style={styles.closeRoleText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
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
    fontSize: 16,
  },
  backButton: {
    alignSelf: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  backText: {
    color: Colors.accent,
    fontSize: 16,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  toolButton: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 16,
  },
  toolText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  mainContent: {
    flex: 1,
  },
  // Night
  nightScroll: {
    flex: 1,
    padding: 8,
  },
  nightInfo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  nightTitle: {
    fontSize: 20,
    color: Colors.text,
    fontWeight: '600',
  },
  nightProgress: {
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  nightProgressText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.nightAccent,
    borderRadius: 2,
  },
  // Day
  dayScroll: {
    flex: 1,
  },
  deathAnnouncement: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.danger + '20',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    margin: 8,
    borderRadius: 8,
  },
  deathText: {
    color: Colors.evilLight,
    fontSize: 14,
    flex: 1,
  },
  dayActions: {
    padding: 12,
    gap: 8,
  },
  dayActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  dayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  executeButton: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
  dayButtonText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nominationMode: {
    backgroundColor: Colors.nominated + '20',
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  nominationModeText: {
    color: Colors.nominated,
    fontSize: 14,
    textAlign: 'center',
  },
  cancelText: {
    color: Colors.textMuted,
    marginTop: 6,
    fontSize: 13,
  },
  nominationHistory: {
    padding: 12,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyText: {
    color: Colors.text,
    fontSize: 13,
  },
  historyVotes: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Batch voting
  batchVoting: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 12,
  },
  batchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  batchPlayer: {
    alignItems: 'center',
    marginRight: 12,
    width: 70,
  },
  batchName: {
    fontSize: 12,
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  batchButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  batchBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  // Grimoire
  grimoireScroll: {
    padding: 8,
  },
  grimoireList: {
    padding: 8,
  },
  grimoireRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  grimoirePlayerInfo: {
    flex: 1,
  },
  grimoirePlayerName: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  grimoireRoleName: {
    fontSize: 13,
    marginTop: 2,
  },
  grimoireBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.dead,
    backgroundColor: Colors.dead + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  poisonBadge: {
    color: Colors.poisoned,
    backgroundColor: Colors.poisoned + '20',
  },
  drunkBadge: {
    color: Colors.drunk,
    backgroundColor: Colors.drunk + '20',
  },
  protectedBadge: {
    color: Colors.protected,
    backgroundColor: Colors.protected + '20',
  },
  deadText: {
    color: Colors.dead,
    textDecorationLine: 'line-through',
  },
  bluffsSection: {
    padding: 12,
    marginTop: 8,
  },
  bluffsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.evil,
    marginBottom: 8,
  },
  // Role modal
  roleModal: {
    backgroundColor: Colors.background,
    margin: 20,
    borderRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  roleModalName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  roleModalStatus: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  nightInfoBox: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  nightInfoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  nightInfoValue: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: '600',
    marginTop: 4,
  },
  closeRoleBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 12,
  },
  closeRoleText: {
    color: Colors.accent,
    fontSize: 16,
  },
});
