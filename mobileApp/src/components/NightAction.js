import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getRoleById, NightActionType } from '../game/roles';
import Colors from '../constants/Colors';

export default function NightAction({
  roleId,
  players,
  isFirstNight,
  onSubmit,
  playerInfo,
}) {
  const [selectedTargets, setSelectedTargets] = useState([]);
  const role = getRoleById(roleId);

  if (!role) return null;

  const nightAction = role.nightAction;
  if (!nightAction) return null;

  const owner = players.find(p => p.role === roleId || p.actualRole === roleId);
  const isInfoOnly = nightAction.type === NightActionType.RECEIVE_INFO;

  const maxTargets = nightAction.type === NightActionType.CHOOSE_TWO_PLAYERS ? 2 : 1;

  const eligiblePlayers = players.filter(p => {
    if (!p.alive && !nightAction.targetDead) return false;
    if (nightAction.excludeSelf && p.id === owner?.id) return false;
    return true;
  });

  const toggleTarget = (playerId) => {
    setSelectedTargets(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      }
      if (prev.length >= maxTargets) {
        return [...prev.slice(1), playerId];
      }
      return [...prev, playerId];
    });
  };

  const handleSubmit = () => {
    if (isInfoOnly) {
      onSubmit(roleId, {});
      return;
    }

    if (maxTargets === 1 && selectedTargets.length >= 1) {
      onSubmit(roleId, { targetId: selectedTargets[0] });
    } else if (maxTargets === 2 && selectedTargets.length >= 2) {
      onSubmit(roleId, { targetIds: selectedTargets });
    } else if (nightAction.type === NightActionType.CHOOSE_PLAYER_OR_PASS) {
      if (selectedTargets.length > 0) {
        onSubmit(roleId, { targetIds: selectedTargets });
      } else {
        onSubmit(roleId, { pass: true });
      }
    }
  };

  const canSubmit = isInfoOnly ||
    selectedTargets.length >= maxTargets ||
    nightAction.type === NightActionType.CHOOSE_PLAYER_OR_PASS;

  // Display received info
  if (playerInfo) {
    return (
      <View style={styles.container}>
        <View style={styles.roleHeader}>
          <Ionicons name="moon-outline" size={20} color={Colors.nightAccent} />
          <Text style={styles.roleName}>{role.name}</Text>
        </View>
        <Text style={styles.ability}>{role.ability}</Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>{playerInfo.label}</Text>
          {playerInfo.type === 'number' && (
            <Text style={styles.infoValue}>{playerInfo.value}</Text>
          )}
          {playerInfo.type === 'yesno' && (
            <View style={styles.yesNoBox}>
              <Ionicons
                name={playerInfo.value ? 'checkmark-circle' : 'close-circle'}
                size={32}
                color={playerInfo.value ? Colors.success : Colors.danger}
              />
              <Text style={[styles.infoValue, { color: playerInfo.value ? Colors.success : Colors.danger }]}>
                {playerInfo.value ? 'Yes' : 'No'}
              </Text>
            </View>
          )}
          {playerInfo.type === 'role' && (
            <Text style={styles.infoValue}>{playerInfo.value}</Text>
          )}
          {playerInfo.type === 'twoPlayersOneIs' && playerInfo.value && (
            <View>
              <Text style={styles.infoPlayers}>
                {playerInfo.value.players[0]} or {playerInfo.value.players[1]}
              </Text>
              <Text style={styles.infoRole}>is the {playerInfo.value.role}</Text>
            </View>
          )}
          {playerInfo.type === 'twoPossible' && playerInfo.value && (
            <Text style={styles.infoPlayers}>
              {playerInfo.value[0]} or {playerInfo.value[1]}
            </Text>
          )}
          {playerInfo.type === 'playerRole' && playerInfo.value && (
            <View>
              <Text style={styles.infoPlayers}>{playerInfo.value.name}</Text>
              <Text style={styles.infoRole}>is the {playerInfo.value.role}</Text>
            </View>
          )}
          {playerInfo.type === 'grimoire' && playerInfo.value && (
            <ScrollView style={styles.grimoireList}>
              {playerInfo.value.map((p, idx) => (
                <View key={idx} style={styles.grimoireRow}>
                  <Text style={[styles.grimoireName, !p.alive && styles.deadText]}>
                    {p.name}
                  </Text>
                  <Text style={styles.grimoireRole}>{p.role}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
        <TouchableOpacity style={styles.submitButton} onPress={() => onSubmit(roleId, {})}>
          <Text style={styles.submitText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.roleHeader}>
        <Ionicons name="moon-outline" size={20} color={Colors.nightAccent} />
        <Text style={styles.roleName}>{role.name}</Text>
        {owner && <Text style={styles.ownerName}>({owner.name})</Text>}
      </View>

      <Text style={styles.ability}>{role.ability}</Text>

      {!isInfoOnly && (
        <View style={styles.targetSection}>
          <Text style={styles.targetLabel}>
            Choose {maxTargets === 2 ? '2 players' : 'a player'}:
          </Text>
          <ScrollView style={styles.targetList}>
            {eligiblePlayers.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.targetRow,
                  selectedTargets.includes(p.id) && styles.targetSelected,
                ]}
                onPress={() => toggleTarget(p.id)}
              >
                <Text style={[
                  styles.targetName,
                  selectedTargets.includes(p.id) && styles.targetNameSelected,
                ]}>
                  {p.name}
                </Text>
                {!p.alive && <Text style={styles.deadBadge}>Dead</Text>}
                {selectedTargets.includes(p.id) && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.buttonRow}>
        {nightAction.type === NightActionType.CHOOSE_PLAYER_OR_PASS && (
          <TouchableOpacity
            style={[styles.submitButton, styles.passButton]}
            onPress={() => onSubmit(roleId, { pass: true })}
          >
            <Text style={styles.passText}>Pass</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <Text style={styles.submitText}>
            {isInfoOnly ? 'Wake & Show Info' : 'Confirm'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    margin: 8,
    borderWidth: 1,
    borderColor: Colors.nightAccent + '40',
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  roleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.nightAccent,
  },
  ownerName: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  ability: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  targetSection: {
    marginBottom: 12,
  },
  targetLabel: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 8,
  },
  targetList: {
    maxHeight: 200,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.backgroundDark,
    borderRadius: 8,
    marginVertical: 2,
  },
  targetSelected: {
    backgroundColor: Colors.accent + '20',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  targetName: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  targetNameSelected: {
    color: Colors.accent,
    fontWeight: '600',
  },
  deadBadge: {
    fontSize: 11,
    color: Colors.dead,
    marginRight: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  submitButton: {
    flex: 1,
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  passButton: {
    backgroundColor: Colors.surfaceLight,
    flex: 0.5,
  },
  disabledButton: {
    backgroundColor: Colors.surfaceLight,
    opacity: 0.5,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  passText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  // Info display
  infoBox: {
    backgroundColor: Colors.backgroundDark,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  yesNoBox: {
    alignItems: 'center',
    gap: 4,
  },
  infoPlayers: {
    fontSize: 18,
    color: Colors.accent,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoRole: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginTop: 4,
  },
  // Grimoire
  grimoireList: {
    width: '100%',
    maxHeight: 200,
  },
  grimoireRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  grimoireName: {
    fontSize: 14,
    color: Colors.text,
  },
  grimoireRole: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  deadText: {
    color: Colors.dead,
    textDecorationLine: 'line-through',
  },
});
