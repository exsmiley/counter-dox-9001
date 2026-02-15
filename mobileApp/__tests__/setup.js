// Test setup for Blood on the Clocktower

// Silence console.warn in tests unless debugging
if (!process.env.DEBUG_TESTS) {
  global.console.warn = jest.fn();
}

// Helper: create a seeded random for deterministic tests
let seed = 42;
global.setTestSeed = (s) => { seed = s; };
global.seededRandom = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

// Helper: format a game state snapshot for readable output
global.snapshotGameState = (gameState, label) => {
  if (!gameState) return `[${label}] No game state`;

  const lines = [
    `\n${'='.repeat(60)}`,
    `GAME STATE SNAPSHOT: ${label}`,
    `${'='.repeat(60)}`,
    `Phase: ${gameState.phase} | Day: ${gameState.dayNumber} | Night: ${gameState.nightNumber}`,
    `Script: ${gameState.script} | Winner: ${gameState.winner || 'none'}`,
    `Vote Threshold: ${gameState.voteThreshold || 'N/A'}`,
    ``,
    `PLAYERS:`,
    `${'─'.repeat(60)}`,
  ];

  for (const p of gameState.players) {
    const status = [];
    if (!p.alive) status.push('DEAD');
    if (p.poisoned) status.push('POISONED');
    if (p.drunk) status.push('DRUNK');
    if (p.protected) status.push('PROTECTED');
    if (p.ghostVoteUsed) status.push('GHOST_VOTE_USED');
    if (p.executedToday) status.push('EXECUTED');
    if (p.hasNominated) status.push('HAS_NOMINATED');
    if (p.hasBeenNominated) status.push('BEEN_NOMINATED');
    if (p.butlerMaster) {
      const master = gameState.players.find(pl => pl.id === p.butlerMaster);
      status.push(`MASTER:${master?.name || '?'}`);
    }

    const statusStr = status.length > 0 ? ` [${status.join(', ')}]` : '';
    const roleDisplay = p.perceivedRole !== p.role
      ? `${p.role} (thinks: ${p.perceivedRole})`
      : p.role;

    lines.push(`  ${p.alive ? '●' : '○'} ${p.name.padEnd(15)} ${(roleDisplay || '?').padEnd(20)} ${statusStr}`);

    if (p.nightInfo) {
      lines.push(`    └─ Night Info: ${JSON.stringify(p.nightInfo)}`);
    }
    if (p.reminders && p.reminders.length > 0) {
      lines.push(`    └─ Reminders: ${p.reminders.join(', ')}`);
    }
  }

  if (gameState.nightDeaths && gameState.nightDeaths.length > 0) {
    lines.push('');
    lines.push(`NIGHT DEATHS: ${gameState.nightDeaths.map(id =>
      gameState.players.find(p => p.id === id)?.name
    ).join(', ')}`);
  }

  if (gameState.executionTarget) {
    const target = gameState.players.find(p => p.id === gameState.executionTarget);
    lines.push(`EXECUTION TARGET: ${target?.name} (${gameState.executionVotes} votes)`);
  }

  if (gameState.currentNomination) {
    const n = gameState.currentNomination;
    lines.push(`ACTIVE NOMINATION: ${n.nominatorName} → ${n.nomineeName} (${n.voteCount} votes)`);
  }

  if (gameState.demonBluffs && gameState.demonBluffs.length > 0) {
    lines.push(`DEMON BLUFFS: ${gameState.demonBluffs.join(', ')}`);
  }

  lines.push('');
  const recentLogs = (gameState.gameLog || []).slice(-5);
  if (recentLogs.length > 0) {
    lines.push('RECENT LOG:');
    for (const log of recentLogs) {
      lines.push(`  [${log.type}] ${log.message}`);
    }
  }

  lines.push(`${'='.repeat(60)}\n`);
  return lines.join('\n');
};
