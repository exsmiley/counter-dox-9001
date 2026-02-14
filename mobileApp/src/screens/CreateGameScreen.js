import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ScrollView, SafeAreaView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGame } from '../context/GameContext';
import { SCRIPTS } from '../game/scripts';
import { ScriptId } from '../game/scripts';
import Colors from '../constants/Colors';

export default function CreateGameScreen({ navigation }) {
  const { actions } = useGame();
  const [scriptId, setScriptId] = useState(ScriptId.TROUBLE_BREWING);
  const [playerNames, setPlayerNames] = useState(['']);
  const [storytellerMode, setStorytellerMode] = useState(false);

  const addPlayer = () => {
    if (playerNames.length >= 20) return;
    setPlayerNames([...playerNames, '']);
  };

  const removePlayer = (index) => {
    if (playerNames.length <= 1) return;
    setPlayerNames(playerNames.filter((_, i) => i !== index));
  };

  const updatePlayerName = (index, name) => {
    const updated = [...playerNames];
    updated[index] = name;
    setPlayerNames(updated);
  };

  const startGame = () => {
    const names = playerNames.map(n => n.trim()).filter(n => n.length > 0);
    if (names.length < 5) {
      Alert.alert('Not Enough Players', 'You need at least 5 players to start a game.');
      return;
    }
    if (new Set(names).size !== names.length) {
      Alert.alert('Duplicate Names', 'Each player must have a unique name.');
      return;
    }

    actions.createGame({ scriptId, playerNames: names, storytellerMode });
    actions.assignRoles();
    navigation.replace('Game');
  };

  const scripts = Object.values(SCRIPTS);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Choose Script</Text>
          <View style={styles.scriptList}>
            {scripts.map(script => (
              <TouchableOpacity
                key={script.id}
                style={[
                  styles.scriptCard,
                  scriptId === script.id && { borderColor: script.color, borderWidth: 2 },
                ]}
                onPress={() => setScriptId(script.id)}
              >
                <View style={styles.scriptHeader}>
                  <Ionicons
                    name={script.icon === 'flame' ? 'flame-outline' : script.icon === 'flower' ? 'flower-outline' : 'moon-outline'}
                    size={24}
                    color={script.color}
                  />
                  <Text style={[styles.scriptName, { color: script.color }]}>{script.name}</Text>
                  {scriptId === script.id && (
                    <Ionicons name="checkmark-circle" size={20} color={script.color} />
                  )}
                </View>
                <Text style={styles.scriptDesc}>{script.description}</Text>
                <Text style={styles.scriptRoles}>
                  {script.townsfolk.length} Townsfolk, {script.outsiders.length} Outsiders,{' '}
                  {script.minions.length} Minions, {script.demons.length} Demons
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modeSection}>
            <TouchableOpacity
              style={styles.modeToggle}
              onPress={() => setStorytellerMode(!storytellerMode)}
            >
              <Ionicons
                name={storytellerMode ? 'checkbox' : 'square-outline'}
                size={24}
                color={storytellerMode ? Colors.accent : Colors.textMuted}
              />
              <View style={styles.modeText}>
                <Text style={styles.modeTitle}>Storyteller Mode</Text>
                <Text style={styles.modeDesc}>
                  {storytellerMode
                    ? 'You control the game manually as Storyteller'
                    : 'App automatically runs the game (recommended)'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>
            Players ({playerNames.filter(n => n.trim()).length})
          </Text>
          <Text style={styles.sectionHint}>5-20 players required</Text>

          {playerNames.map((name, index) => (
            <View key={index} style={styles.playerRow}>
              <Text style={styles.playerNumber}>{index + 1}</Text>
              <TextInput
                style={styles.nameInput}
                placeholder={`Player ${index + 1}`}
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={(text) => updatePlayerName(index, text)}
                returnKeyType="next"
              />
              {playerNames.length > 1 && (
                <TouchableOpacity onPress={() => removePlayer(index)} style={styles.removeBtn}>
                  <Ionicons name="close-circle" size={22} color={Colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {playerNames.length < 20 && (
            <TouchableOpacity style={styles.addButton} onPress={addPlayer}>
              <Ionicons name="add" size={20} color={Colors.accent} />
              <Text style={styles.addText}>Add Player</Text>
            </TouchableOpacity>
          )}

          <View style={styles.quickAdd}>
            {[5, 7, 10, 12, 15].map(count => (
              <TouchableOpacity
                key={count}
                style={styles.quickAddButton}
                onPress={() => {
                  const names = Array.from({ length: count }, (_, i) => `Player ${i + 1}`);
                  setPlayerNames(names);
                }}
              >
                <Text style={styles.quickAddText}>{count}p</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[
            styles.startButton,
            playerNames.filter(n => n.trim()).length < 5 && styles.disabledButton,
          ]}
          onPress={startGame}
          disabled={playerNames.filter(n => n.trim()).length < 5}
        >
          <Ionicons name="play" size={22} color="#fff" />
          <Text style={styles.startText}>Start Game</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  scriptList: {
    gap: 8,
  },
  scriptCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  scriptName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  scriptDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  scriptRoles: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  modeSection: {
    marginTop: 16,
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  modeText: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  modeDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  playerNumber: {
    width: 24,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  nameInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  removeBtn: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
    borderRadius: 8,
    borderStyle: 'dashed',
    marginTop: 4,
    gap: 6,
  },
  addText: {
    color: Colors.accent,
    fontSize: 14,
  },
  quickAdd: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  quickAddButton: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quickAddText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.4,
  },
  startText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
