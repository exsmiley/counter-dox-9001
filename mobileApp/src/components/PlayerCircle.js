import React from 'react';
import { View, StyleSheet } from 'react-native';
import PlayerToken from './PlayerToken';
import Colors from '../constants/Colors';
import Layout from '../constants/Layout';

export default function PlayerCircle({
  players,
  onPlayerPress,
  selectedPlayerId,
  selectedPlayerIds,
  showRoles,
  highlightEvil,
  size,
}) {
  const circleSize = size || Layout.circleRadius;
  const centerX = Layout.window.width / 2;
  const centerY = circleSize + 20;
  const tokenSize = Math.min(Layout.tokenSize, (2 * Math.PI * circleSize) / players.length - 8);

  return (
    <View style={[styles.container, { height: circleSize * 2 + tokenSize + 40 }]}>
      {players.map((player, index) => {
        const angle = (2 * Math.PI * index) / players.length - Math.PI / 2;
        const x = centerX + circleSize * Math.cos(angle) - tokenSize / 2;
        const y = centerY + circleSize * Math.sin(angle) - tokenSize / 2;

        const isSelected = selectedPlayerId === player.id ||
          (selectedPlayerIds && selectedPlayerIds.includes(player.id));

        return (
          <PlayerToken
            key={player.id}
            player={player}
            x={x}
            y={y}
            size={tokenSize}
            onPress={() => onPlayerPress?.(player)}
            selected={isSelected}
            showRole={showRoles}
            highlightEvil={highlightEvil}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
});
