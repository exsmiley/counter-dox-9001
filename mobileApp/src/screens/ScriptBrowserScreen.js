import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SCRIPTS, ScriptId } from '../game/scripts';
import {
  getRoleById, RoleType,
  TROUBLE_BREWING_ROLES, SECTS_AND_VIOLETS_ROLES, BAD_MOON_RISING_ROLES,
  TRAVELLER_ROLES, FABLED_ROLES,
} from '../game/roles';
import RoleCard from '../components/RoleCard';
import Colors from '../constants/Colors';

const ROLE_SETS = {
  [ScriptId.TROUBLE_BREWING]: TROUBLE_BREWING_ROLES,
  [ScriptId.SECTS_AND_VIOLETS]: SECTS_AND_VIOLETS_ROLES,
  [ScriptId.BAD_MOON_RISING]: BAD_MOON_RISING_ROLES,
  travellers: TRAVELLER_ROLES,
  fabled: FABLED_ROLES,
};

export default function ScriptBrowserScreen({ navigation }) {
  const [activeScript, setActiveScript] = useState(ScriptId.TROUBLE_BREWING);
  const [expandedRole, setExpandedRole] = useState(null);

  const scripts = [
    ...Object.values(SCRIPTS),
    { id: 'travellers', name: 'Travellers', color: Colors.traveller, icon: 'walk' },
    { id: 'fabled', name: 'Fabled', color: Colors.fabled, icon: 'star' },
  ];

  const currentRoles = ROLE_SETS[activeScript] || {};
  const sections = [
    { title: 'Townsfolk', data: Object.values(currentRoles).filter(r => r.type === RoleType.TOWNSFOLK) },
    { title: 'Outsiders', data: Object.values(currentRoles).filter(r => r.type === RoleType.OUTSIDER) },
    { title: 'Minions', data: Object.values(currentRoles).filter(r => r.type === RoleType.MINION) },
    { title: 'Demons', data: Object.values(currentRoles).filter(r => r.type === RoleType.DEMON) },
    { title: 'Travellers', data: Object.values(currentRoles).filter(r => r.type === RoleType.TRAVELLER) },
    { title: 'Fabled', data: Object.values(currentRoles).filter(r => r.type === RoleType.FABLED) },
  ].filter(s => s.data.length > 0);

  const script = SCRIPTS[activeScript];

  return (
    <SafeAreaView style={styles.container}>
      {/* Script tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
        contentContainerStyle={styles.tabsContent}
      >
        {scripts.map(s => (
          <TouchableOpacity
            key={s.id}
            style={[styles.tab, activeScript === s.id && { backgroundColor: s.color + '20', borderColor: s.color }]}
            onPress={() => setActiveScript(s.id)}
          >
            <Text style={[styles.tabText, activeScript === s.id && { color: s.color }]}>
              {s.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Script description */}
      {script && (
        <View style={[styles.scriptInfo, { borderLeftColor: script.color }]}>
          <Text style={[styles.scriptName, { color: script.color }]}>{script.name}</Text>
          <Text style={styles.scriptDesc}>{script.description}</Text>
          <Text style={styles.scriptStats}>
            {script.townsfolk.length} Townsfolk / {script.outsiders.length} Outsiders / {script.minions.length} Minions / {script.demons.length} Demons
          </Text>
          {script.jinxes && script.jinxes.length > 0 && (
            <View style={styles.jinxSection}>
              <Text style={styles.jinxTitle}>Jinxes:</Text>
              {script.jinxes.map((jinx, idx) => (
                <Text key={idx} style={styles.jinxText}>
                  {jinx.roles.map(r => getRoleById(r)?.name).join(' + ')}: {jinx.text}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Roles list */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <RoleCard
            role={item}
            compact={expandedRole !== item.id}
            onPress={() => setExpandedRole(expandedRole === item.id ? null : item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabs: {
    maxHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabsContent: {
    paddingHorizontal: 8,
    gap: 6,
    alignItems: 'center',
    paddingVertical: 6,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tabText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  scriptInfo: {
    backgroundColor: Colors.surface,
    padding: 12,
    margin: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  scriptName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  scriptDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  scriptStats: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  jinxSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  jinxTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.warning,
    marginBottom: 4,
  },
  jinxText: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.backgroundDark,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text,
  },
  sectionCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
});
