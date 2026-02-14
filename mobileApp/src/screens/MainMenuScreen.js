import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

export default function MainMenuScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <Ionicons name="water" size={48} color={Colors.evil} />
        <Text style={styles.title}>Blood on the{'\n'}Clocktower</Text>
        <Text style={styles.subtitle}>A game of murder & mystery</Text>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate('CreateGame')}
        >
          <View style={[styles.iconBox, { backgroundColor: Colors.accent + '20' }]}>
            <Ionicons name="add-circle-outline" size={28} color={Colors.accent} />
          </View>
          <View style={styles.buttonContent}>
            <Text style={styles.buttonTitle}>New Game</Text>
            <Text style={styles.buttonSubtitle}>Create a game with friends</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate('JoinGame')}
        >
          <View style={[styles.iconBox, { backgroundColor: Colors.good + '20' }]}>
            <Ionicons name="enter-outline" size={28} color={Colors.good} />
          </View>
          <View style={styles.buttonContent}>
            <Text style={styles.buttonTitle}>Join Game</Text>
            <Text style={styles.buttonSubtitle}>Enter a game code to join</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate('ScriptBrowser')}
        >
          <View style={[styles.iconBox, { backgroundColor: Colors.fabled + '20' }]}>
            <Ionicons name="book-outline" size={28} color={Colors.fabled} />
          </View>
          <View style={styles.buttonContent}>
            <Text style={styles.buttonTitle}>Browse Scripts</Text>
            <Text style={styles.buttonSubtitle}>View characters & abilities</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate('HowToPlay')}
        >
          <View style={[styles.iconBox, { backgroundColor: Colors.success + '20' }]}>
            <Ionicons name="help-circle-outline" size={28} color={Colors.success} />
          </View>
          <View style={styles.buttonContent}>
            <Text style={styles.buttonTitle}>How to Play</Text>
            <Text style={styles.buttonSubtitle}>Rules & strategy guide</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        5-20 players + 1 Storyteller
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },
  menu: {
    paddingHorizontal: 20,
    gap: 12,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flex: 1,
    marginLeft: 14,
  },
  buttonTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  buttonSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 'auto',
    paddingBottom: 20,
  },
});
