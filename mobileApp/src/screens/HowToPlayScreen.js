import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

const Section = ({ icon, title, children, color }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={22} color={color || Colors.accent} />
      <Text style={[styles.sectionTitle, { color: color || Colors.accent }]}>{title}</Text>
    </View>
    {children}
  </View>
);

const Bullet = ({ text, indent }) => (
  <View style={[styles.bullet, indent && { marginLeft: 16 }]}>
    <Text style={styles.bulletDot}>•</Text>
    <Text style={styles.bulletText}>{text}</Text>
  </View>
);

export default function HowToPlayScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons name="water" size={40} color={Colors.evil} />
          <Text style={styles.title}>How to Play</Text>
          <Text style={styles.subtitle}>Blood on the Clocktower</Text>
        </View>

        <Section icon="people-outline" title="Overview" color={Colors.text}>
          <Text style={styles.text}>
            Blood on the Clocktower is a social deduction game for 5-20 players plus a Storyteller.
            Players are secretly assigned characters that belong to either the Good team or the Evil team.
            Good must find and execute the Demon. Evil must survive until only 2 players remain.
          </Text>
        </Section>

        <Section icon="people" title="Teams" color={Colors.good}>
          <View style={styles.teamRow}>
            <View style={[styles.teamBox, { borderColor: Colors.good }]}>
              <Text style={[styles.teamName, { color: Colors.good }]}>Good Team</Text>
              <Bullet text="Townsfolk - Powerful abilities that help find evil" />
              <Bullet text="Outsiders - Mostly good but with drawbacks" />
            </View>
            <View style={[styles.teamBox, { borderColor: Colors.evil }]}>
              <Text style={[styles.teamName, { color: Colors.evil }]}>Evil Team</Text>
              <Bullet text="Minions - Support the Demon and sow chaos" />
              <Bullet text="Demon - Kills players at night, must stay hidden" />
            </View>
          </View>
        </Section>

        <Section icon="moon-outline" title="Night Phase" color="#a78bfa">
          <Text style={styles.text}>
            During the night, players with night abilities wake up one at a time to use their power.
            The Storyteller manages who wakes and in what order.
          </Text>
          <Bullet text="The Demon chooses a player to kill" />
          <Bullet text="Townsfolk with information abilities learn their info" />
          <Bullet text="Protection abilities (like the Monk) can save players" />
          <Bullet text="Minion abilities (like the Poisoner) hinder the good team" />
        </Section>

        <Section icon="sunny-outline" title="Day Phase" color={Colors.dayAccent}>
          <Text style={styles.text}>
            During the day, all players discuss openly. Deaths from the night are announced.
            Players try to figure out who the Demon is (or hide that they are the Demon).
          </Text>
          <Bullet text="Any alive player may nominate another player for execution" />
          <Bullet text="Each player can only nominate once per day" />
          <Bullet text="All players vote (hands up) on each nomination" />
          <Bullet text="A nomination needs more than 50% of alive players to pass" />
          <Bullet text="The player with the most votes (above threshold) is executed" />
          <Bullet text="At most one execution per day" />
        </Section>

        <Section icon="hand-left-outline" title="Nominations & Voting" color={Colors.nominated}>
          <Text style={styles.text}>
            Nominations are the core mechanic of the day phase:
          </Text>
          <Bullet text="Any alive player can nominate any other player (alive or dead)" />
          <Bullet text="You can only nominate once per day" />
          <Bullet text="Votes go clockwise around the circle" />
          <Bullet text="Dead players get one ghost vote for the rest of the game" />
          <Bullet text="You need majority of alive players to execute" />
          <Bullet text="If two nominations tie, nobody is executed" />
        </Section>

        <Section icon="trophy-outline" title="Win Conditions" color={Colors.fabled}>
          <Bullet text="Good wins when the Demon is executed" />
          <Bullet text="Evil wins when only 2 players remain alive" />
          <Bullet text="Some characters have special win/lose conditions (Saint, Mayor)" />
        </Section>

        <Section icon="flask-outline" title="Poison & Drunk" color={Colors.poisoned}>
          <Text style={styles.text}>
            A poisoned or drunk player's ability malfunctions - they may receive false information
            or their ability simply doesn't work. They don't know they're affected!
          </Text>
          <Bullet text="The Drunk thinks they're a Townsfolk but gets false info" />
          <Bullet text="The Poisoner chooses someone each night to poison" />
          <Bullet text="Poison lasts until the next night when a new target is chosen" />
        </Section>

        <Section icon="book-outline" title="Scripts" color={Colors.accent}>
          <View style={styles.scriptBox}>
            <Text style={[styles.scriptName, { color: '#e74c3c' }]}>Trouble Brewing</Text>
            <Text style={styles.scriptDesc}>
              The introductory script. Simple, clear abilities. Great for learning.
              Features the Imp as demon - can starpass by killing itself.
            </Text>
          </View>
          <View style={styles.scriptBox}>
            <Text style={[styles.scriptName, { color: '#9b59b6' }]}>Sects & Violets</Text>
            <Text style={styles.scriptDesc}>
              Madness and manipulation. Characters change alignment, go mad, and deceive.
              Features 4 different demons each with unique kill patterns.
            </Text>
          </View>
          <View style={styles.scriptBox}>
            <Text style={[styles.scriptName, { color: '#e67e22' }]}>Bad Moon Rising</Text>
            <Text style={styles.scriptDesc}>
              Death is everywhere. Many ways to die, but also many ways to protect.
              Features demons that kill multiple players or poison instead of kill.
            </Text>
          </View>
        </Section>

        <Section icon="bulb-outline" title="Tips for New Players" color={Colors.success}>
          <Bullet text="Good players: share your info! Collaboration is key" />
          <Bullet text="Evil players: blend in, claim to be a Townsfolk character" />
          <Bullet text="The Storyteller is neutral - they make the game fun for everyone" />
          <Bullet text="Dead players can still talk and have 1 vote to use" />
          <Bullet text="Pay attention to who claims what - contradictions reveal evil" />
          <Bullet text="Remember that abilities can give false info due to poison/drunk" />
          <Bullet text="Start with Trouble Brewing for your first game" />
        </Section>

        <Section icon="settings-outline" title="Player Count Setup" color={Colors.textSecondary}>
          <Text style={styles.text}>
            The number of each character type depends on player count:
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>Players</Text>
              <Text style={styles.tableHeaderText}>Town</Text>
              <Text style={styles.tableHeaderText}>Out</Text>
              <Text style={styles.tableHeaderText}>Min</Text>
              <Text style={styles.tableHeaderText}>Dem</Text>
            </View>
            {[
              [5, 3, 0, 1, 1], [6, 3, 1, 1, 1], [7, 5, 0, 1, 1],
              [8, 5, 1, 1, 1], [9, 5, 2, 1, 1], [10, 7, 0, 2, 1],
              [11, 7, 1, 2, 1], [12, 7, 2, 2, 1], [13, 9, 0, 3, 1],
              [14, 9, 1, 3, 1], [15, 9, 2, 3, 1],
            ].map(row => (
              <View key={row[0]} style={styles.tableRow}>
                {row.map((val, i) => (
                  <Text key={i} style={[styles.tableCell, i === 0 && styles.tableCellFirst]}>
                    {val}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  text: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 2,
    paddingLeft: 4,
  },
  bulletDot: {
    color: Colors.textMuted,
    marginRight: 8,
    fontSize: 14,
  },
  bulletText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    flex: 1,
  },
  teamRow: {
    gap: 8,
  },
  teamBox: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  teamName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  scriptBox: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  scriptName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  scriptDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  table: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceLight,
    paddingVertical: 8,
  },
  tableHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.text,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  tableCellFirst: {
    color: Colors.text,
    fontWeight: '600',
  },
});
