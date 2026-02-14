import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getRoleById, RoleType, Team } from '../game/roles';
import Colors from '../constants/Colors';

export default function RoleCard({ roleId, role: roleProp, compact, onPress, selected }) {
  const role = roleProp || getRoleById(roleId);
  if (!role) return null;

  const getTypeColor = () => {
    switch (role.type) {
      case RoleType.TOWNSFOLK: return Colors.townsfolk;
      case RoleType.OUTSIDER: return Colors.outsider;
      case RoleType.MINION: return Colors.minion;
      case RoleType.DEMON: return Colors.demon;
      case RoleType.TRAVELLER: return Colors.traveller;
      case RoleType.FABLED: return Colors.fabled;
      default: return Colors.textSecondary;
    }
  };

  const getTypeIcon = () => {
    switch (role.type) {
      case RoleType.TOWNSFOLK: return 'people-outline';
      case RoleType.OUTSIDER: return 'person-outline';
      case RoleType.MINION: return 'skull-outline';
      case RoleType.DEMON: return 'flame-outline';
      case RoleType.TRAVELLER: return 'walk-outline';
      case RoleType.FABLED: return 'star-outline';
      default: return 'help-outline';
    }
  };

  const typeColor = getTypeColor();
  const typeLabel = role.type.charAt(0).toUpperCase() + role.type.slice(1);

  if (compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={0.7}
        style={[
          styles.compactContainer,
          { borderLeftColor: typeColor },
          selected && styles.selected,
        ]}
      >
        <Ionicons name={getTypeIcon()} size={16} color={typeColor} />
        <Text style={[styles.compactName, { color: typeColor }]}>{role.name}</Text>
        <Text style={styles.compactType}>{typeLabel}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      style={[styles.container, selected && styles.selected]}
    >
      <View style={[styles.header, { backgroundColor: typeColor + '20' }]}>
        <View style={styles.headerLeft}>
          <Ionicons name={getTypeIcon()} size={24} color={typeColor} />
          <View style={styles.headerText}>
            <Text style={[styles.name, { color: typeColor }]}>{role.name}</Text>
            <Text style={styles.type}>{typeLabel}</Text>
          </View>
        </View>
        <View style={[styles.teamBadge, { backgroundColor: role.team === Team.EVIL ? Colors.evil + '30' : Colors.good + '30' }]}>
          <Text style={[styles.teamText, { color: role.team === Team.EVIL ? Colors.evil : Colors.good }]}>
            {role.team === Team.EVIL ? 'Evil' : role.team === Team.GOOD ? 'Good' : 'Neutral'}
          </Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.ability}>{role.ability}</Text>
        {role.setup && (
          <View style={styles.setupBadge}>
            <Ionicons name="settings-outline" size={12} color={Colors.warning} />
            <Text style={styles.setupText}>Setup ability</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginVertical: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selected: {
    borderColor: Colors.accent,
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  type: {
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  teamBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  teamText: {
    fontSize: 11,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  ability: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  setupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  setupText: {
    fontSize: 11,
    color: Colors.warning,
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    marginVertical: 2,
    gap: 8,
  },
  compactName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  compactType: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
});
