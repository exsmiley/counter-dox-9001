import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  SafeAreaView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

export default function JoinGameScreen({ navigation }) {
  const [gameCode, setGameCode] = useState('');
  const [playerName, setPlayerName] = useState('');

  const joinGame = () => {
    if (!gameCode.trim() || gameCode.trim().length < 6) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-character game code.');
      return;
    }
    if (!playerName.trim()) {
      Alert.alert('Name Required', 'Please enter your name.');
      return;
    }
    // In a full implementation, this would connect to Firebase
    Alert.alert(
      'Online Multiplayer',
      'Online multiplayer requires a Firebase backend to be configured. For now, use "New Game" to play locally.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Ionicons name="enter-outline" size={48} color={Colors.good} />
            <Text style={styles.title}>Join Game</Text>
            <Text style={styles.subtitle}>Enter the game code from your Storyteller</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor={Colors.textMuted}
              value={playerName}
              onChangeText={setPlayerName}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <Text style={styles.label}>Game Code</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="ABCDEF"
              placeholderTextColor={Colors.textMuted}
              value={gameCode}
              onChangeText={(text) => setGameCode(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
              returnKeyType="go"
              onSubmitEditing={joinGame}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.joinButton,
              (!gameCode.trim() || !playerName.trim()) && styles.disabledButton,
            ]}
            onPress={joinGame}
            disabled={!gameCode.trim() || !playerName.trim()}
          >
            <Ionicons name="log-in-outline" size={22} color="#fff" />
            <Text style={styles.joinText}>Join Game</Text>
          </TouchableOpacity>

          <View style={styles.info}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.infoText}>
              Ask the host for their 6-character game code. All players must be on the same network or have Firebase configured.
            </Text>
          </View>
        </View>
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
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  codeInput: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.good,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.4,
  },
  joinText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    gap: 8,
    paddingHorizontal: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
});
