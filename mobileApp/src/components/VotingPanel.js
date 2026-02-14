import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

export default function VotingPanel({
  nomination,
  players,
  voteThreshold,
  onVote,
  onResolve,
  currentPlayerId,
  showAllVotes,
}) {
  if (!nomination) return null;

  const nominator = players.find(p => p.id === nomination.nominatorId);
  const nominee = players.find(p => p.id === nomination.nomineeId);
  const totalVoted = Object.keys(nomination.votes || {}).length;
  const yesVotes = nomination.voteCount || 0;
  const noVotes = totalVoted - yesVotes;
  const alivePlayers = players.filter(p => p.alive || !p.ghostVoteUsed);

  const hasVoted = nomination.votes?.[currentPlayerId] !== undefined;
  const allVoted = totalVoted >= alivePlayers.length;

  return (
    <View style={styles.container}>
      <View style={styles.nominationHeader}>
        <Text style={styles.title}>Nomination</Text>
        <Text style={styles.subtitle}>
          <Text style={styles.playerHighlight}>{nominator?.name}</Text>
          {' nominates '}
          <Text style={styles.playerHighlight}>{nominee?.name}</Text>
        </Text>
      </View>

      <View style={styles.voteCount}>
        <View style={styles.voteBlock}>
          <Ionicons name="thumbs-up" size={20} color={Colors.voteYes} />
          <Text style={[styles.voteNumber, { color: Colors.voteYes }]}>{yesVotes}</Text>
          <Text style={styles.voteLabel}>Yes</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.voteBlock}>
          <Text style={styles.thresholdText}>Need {voteThreshold}</Text>
          <Text style={styles.votedText}>{totalVoted} voted</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.voteBlock}>
          <Ionicons name="thumbs-down" size={20} color={Colors.voteNo} />
          <Text style={[styles.voteNumber, { color: Colors.voteNo }]}>{noVotes}</Text>
          <Text style={styles.voteLabel}>No</Text>
        </View>
      </View>

      {/* Voting buttons for current player */}
      {!hasVoted && currentPlayerId && (
        <View style={styles.voteButtons}>
          <TouchableOpacity
            style={[styles.voteButton, styles.voteYesButton]}
            onPress={() => onVote(currentPlayerId, true)}
          >
            <Ionicons name="thumbs-up" size={24} color="#fff" />
            <Text style={styles.voteButtonText}>Vote Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.voteButton, styles.voteNoButton]}
            onPress={() => onVote(currentPlayerId, false)}
          >
            <Ionicons name="thumbs-down" size={24} color="#fff" />
            <Text style={styles.voteButtonText}>Vote No</Text>
          </TouchableOpacity>
        </View>
      )}

      {hasVoted && !allVoted && (
        <Text style={styles.waitingText}>Waiting for other players to vote...</Text>
      )}

      {/* Show individual votes if storyteller or all voted */}
      {showAllVotes && nomination.votes && (
        <View style={styles.voteList}>
          {Object.entries(nomination.votes).map(([pid, votedYes]) => {
            const voter = players.find(p => p.id === pid);
            return (
              <View key={pid} style={styles.voteRow}>
                <Text style={styles.voterName}>{voter?.name || 'Unknown'}</Text>
                <Ionicons
                  name={votedYes ? 'thumbs-up' : 'thumbs-down'}
                  size={16}
                  color={votedYes ? Colors.voteYes : Colors.voteNo}
                />
              </View>
            );
          })}
        </View>
      )}

      {/* Resolve button */}
      {onResolve && (
        <TouchableOpacity style={styles.resolveButton} onPress={onResolve}>
          <Text style={styles.resolveText}>Resolve Vote</Text>
          <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
        </TouchableOpacity>
      )}
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
    borderColor: Colors.border,
  },
  nominationHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  playerHighlight: {
    color: Colors.accent,
    fontWeight: '600',
  },
  voteCount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: Colors.backgroundDark,
    borderRadius: 8,
  },
  voteBlock: {
    alignItems: 'center',
    flex: 1,
  },
  voteNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  voteLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  thresholdText: {
    fontSize: 14,
    color: Colors.warning,
    fontWeight: '600',
  },
  votedText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  voteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  voteYesButton: {
    backgroundColor: Colors.voteYes,
  },
  voteNoButton: {
    backgroundColor: Colors.voteNo,
  },
  voteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  waitingText: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  voteList: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  voterName: {
    fontSize: 13,
    color: Colors.text,
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  resolveText: {
    fontSize: 16,
    color: Colors.accent,
    fontWeight: '600',
  },
});
