import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getRoleById, RoleType, Team } from '../game/roles';
import Colors from '../constants/Colors';

export default function PlayerToken({
  player,
  x,
  y,
  size,
  onPress,
  selected,
  showRole,
  highlightEvil,
  style,
}) {
  const role = getRoleById(player.role);
  const isEvil = role?.team === Team.EVIL;
  const isDemon = role?.type === RoleType.DEMON;
  const isMinion = role?.type === RoleType.MINION;

  const getRoleColor = () => {
    if (!showRole || !role) return Colors.surface;
    switch (role.type) {
      case RoleType.TOWNSFOLK: return Colors.townsfolk;
      case RoleType.OUTSIDER: return Colors.outsider;
      case RoleType.MINION: return Colors.minion;
      case RoleType.DEMON: return Colors.demon;
      default: return Colors.surface;
    }
  };

  const getStatusIcon = () => {
    if (!player.alive) return 'skull-outline';
    if (player.poisoned && showRole) return 'flask-outline';
    if (player.drunk && showRole) return 'wine-outline';
    if (player.protected && showRole) return 'shield-outline';
    return null;
  };

  const borderColor = selected
    ? Colors.accent
    : highlightEvil && isEvil && showRole
      ? Colors.evil
      : player.alive
        ? Colors.border
        : Colors.dead;

  const bgColor = player.alive
    ? (showRole ? getRoleColor() + '30' : Colors.surface)
    : Colors.backgroundDark;

  const nameInitials = player.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const statusIcon = getStatusIcon();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          position: x !== undefined ? 'absolute' : 'relative',
          left: x,
          top: y,
          width: size || 52,
          height: size || 52,
          borderRadius: (size || 52) / 2,
          borderColor,
          backgroundColor: bgColor,
          borderWidth: selected ? 3 : 2,
        },
        style,
      ]}
    >
      {!player.alive && (
        <View style={styles.deadOverlay}>
          <Ionicons name="close" size={(size || 52) * 0.6} color={Colors.danger + '60'} />
        </View>
      )}

      <Text
        style={[styles.initials, { fontSize: (size || 52) * 0.3 }]}
        numberOfLines={1}
      >
        {nameInitials}
      </Text>

      {showRole && role && (
        <Text
          style={[styles.roleName, { fontSize: Math.max(7, (size || 52) * 0.15) }]}
          numberOfLines={1}
        >
          {role.name}
        </Text>
      )}

      <Text
        style={[
          styles.playerName,
          { fontSize: Math.max(8, (size || 52) * 0.18), top: (size || 52) + 2 },
        ]}
        numberOfLines={1}
      >
        {player.name}
      </Text>

      {statusIcon && (
        <View style={styles.statusBadge}>
          <Ionicons name={statusIcon} size={12} color={Colors.warning} />
        </View>
      )}

      {player.executedToday && (
        <View style={[styles.statusBadge, { right: -4 }]}>
          <Ionicons name="hammer-outline" size={12} color={Colors.danger} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  initials: {
    color: Colors.text,
    fontWeight: 'bold',
  },
  roleName: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 1,
  },
  playerName: {
    position: 'absolute',
    color: Colors.textSecondary,
    textAlign: 'center',
    width: 80,
    left: -14,
  },
  deadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.backgroundDark,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
