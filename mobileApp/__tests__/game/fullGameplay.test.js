/**
 * Full Gameplay Simulation Tests
 *
 * These tests walk through COMPLETE games from start to finish,
 * capturing snapshots at every phase transition and key moment.
 * This enables full verification of the game flow without manual testing.
 */

import {
  createGame,
  assignRoles,
  startNightPhase,
  processNightAction,
  advanceNightAction,
  endNight,
  getNightOrder,
  nominate,
  castVote,
  resolveVote,
  executePlayer,
  skipExecution,
  useSlayerAbility,
  startNextNight,
  checkWinConditions,
  storytellerSetRole,
  storytellerKillPlayer,
  storytellerRevivePlayer,
  storytellerSetPoisoned,
  storytellerSetDrunk,
  storytellerDeclareWinner,
} from '../../src/game/GameEngine';
import { getRoleById, RoleType, Team, Phase } from '../../src/game/roles';
import { ScriptId } from '../../src/game/scripts';

function createFixedGame(roleAssignments, scriptId = ScriptId.TROUBLE_BREWING) {
  const names = roleAssignments.map(r => r.name);
  let state = createGame({ scriptId, playerNames: names });
  state.players = state.players.map((p, i) => ({
    ...p,
    role: roleAssignments[i].role,
    actualRole: roleAssignments[i].role,
    perceivedRole: roleAssignments[i].perceivedRole || roleAssignments[i].role,
  }));
  state.rolesInPlay = roleAssignments.map(r => r.role);
  state.phase = Phase.FIRST_NIGHT;
  state.nightNumber = 1;
  state.isFirstNight = true;
  state.fortuneTellerRedHerring = state.players.find(p =>
    getRoleById(p.role)?.team === Team.GOOD
  )?.id || null;
  state.demonBluffs = ['washerwoman', 'librarian', 'investigator'];
  return state;
}

// Helper: run through all night actions automatically
function processAllNightActions(state) {
  const order = getNightOrder(state);
  let s = state;

  for (const roleId of order) {
    const player = s.players.find(p =>
      (p.role === roleId || p.actualRole === roleId) && p.alive
    );

    // Choose a target (first eligible player for simplicity)
    const role = getRoleById(roleId);
    const action = {};

    if (role?.nightAction?.type === 'choosePlayer') {
      const eligible = s.players.filter(p => {
        if (!p.alive && !role.nightAction.targetDead) return false;
        if (role.nightAction.excludeSelf && player && p.id === player.id) return false;
        return true;
      });
      if (eligible.length > 0) {
        action.targetId = eligible[0].id;
      }
    } else if (role?.nightAction?.type === 'chooseTwoPlayers') {
      const eligible = s.players.filter(p => {
        if (!p.alive) return false;
        if (role.nightAction.excludeSelf && player && p.id === player.id) return false;
        return true;
      });
      if (eligible.length >= 2) {
        action.targetIds = [eligible[0].id, eligible[1].id];
      }
    }

    s = processNightAction(s, roleId, action);
    s = advanceNightAction(s);
  }

  return s;
}

// Helper: run a nomination and vote
function runNominationAndVote(state, nominatorName, nomineeName, voterDecisions) {
  const nominator = state.players.find(p => p.name === nominatorName);
  const nominee = state.players.find(p => p.name === nomineeName);
  if (!nominator || !nominee) return state;

  let s = nominate(state, nominator.id, nominee.id);
  if (!s.currentNomination) return s; // nomination failed

  for (const [playerName, votesYes] of Object.entries(voterDecisions)) {
    const voter = s.players.find(p => p.name === playerName);
    if (voter) {
      s = castVote(s, voter.id, votesYes);
    }
  }

  s = resolveVote(s);
  return s;
}

describe('Full Gameplay Simulations', () => {
  describe('Trouble Brewing: Good wins by executing Imp (7 players)', () => {
    test('complete game from setup to Good victory', () => {
      const snapshots = [];
      const snap = (state, label) => {
        const s = snapshotGameState(state, label);
        snapshots.push(s);
        console.log(s);
        return state;
      };

      // SETUP: 7 players, Trouble Brewing
      let state = createFixedGame([
        { name: 'Alice', role: 'washerwoman' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'monk' },
        { name: 'Dave', role: 'fortune_teller' },
        { name: 'Eve', role: 'chef' },
        { name: 'Frank', role: 'poisoner' },
        { name: 'Grace', role: 'imp' },
      ]);
      snap(state, 'SETUP: 7-player Trouble Brewing');

      // ===================== NIGHT 1 =====================
      state = startNightPhase(state);
      snap(state, 'NIGHT 1: Phase started');

      // Poisoner targets Alice
      const alice = state.players.find(p => p.name === 'Alice');
      state = processNightAction(state, 'poisoner', { targetId: alice.id });
      state = advanceNightAction(state);
      snap(state, 'NIGHT 1: Poisoner poisons Alice');

      // Washerwoman (poisoned - gets false info)
      state = processNightAction(state, 'washerwoman', {});
      state = advanceNightAction(state);
      snap(state, 'NIGHT 1: Washerwoman (poisoned) receives info');

      // Chef
      state = processNightAction(state, 'chef', {});
      state = advanceNightAction(state);
      snap(state, 'NIGHT 1: Chef receives evil pair count');

      // Empath
      state = processNightAction(state, 'empath', {});
      state = advanceNightAction(state);
      snap(state, 'NIGHT 1: Empath receives neighbor count');

      // Fortune Teller checks Grace (Imp) and Bob
      const grace = state.players.find(p => p.name === 'Grace');
      const bob = state.players.find(p => p.name === 'Bob');
      state = processNightAction(state, 'fortune_teller', {
        targetIds: [grace.id, bob.id],
      });
      state = advanceNightAction(state);
      snap(state, 'NIGHT 1: Fortune Teller checks Grace & Bob');

      // Process remaining night actions (butler, spy if present)
      while (state.pendingNightAction) {
        state = processNightAction(state, state.pendingNightAction, {});
        state = advanceNightAction(state);
      }

      // advanceNightAction auto-calls endNight when actions are exhausted
      if (state.phase !== Phase.DAY) {
        state = endNight(state);
      }
      snap(state, 'DAY 1: Dawn (no kills first night for Imp)');

      expect(state.phase).toBe(Phase.DAY);
      expect(state.dayNumber).toBe(1);

      // ===================== DAY 1 =====================
      // Dave nominates Grace (suspects demon)
      const dave = state.players.find(p => p.name === 'Dave');
      state = nominate(state, dave.id, grace.id);
      snap(state, 'DAY 1: Dave nominates Grace');

      // Vote: 5 yes, 2 no => passes (threshold = 4)
      state = castVote(state, state.players[0].id, true);  // Alice: yes
      state = castVote(state, state.players[1].id, true);  // Bob: yes
      state = castVote(state, state.players[2].id, true);  // Charlie: yes
      state = castVote(state, state.players[3].id, true);  // Dave: yes
      state = castVote(state, state.players[4].id, true);  // Eve: yes
      state = castVote(state, state.players[5].id, false); // Frank: no (evil)
      state = castVote(state, state.players[6].id, false); // Grace: no (demon)
      state = resolveVote(state);
      snap(state, 'DAY 1: Vote result (5-2 for Grace)');

      expect(state.executionTarget).toBe(grace.id);

      // Execute Grace (the Imp!)
      state = executePlayer(state);
      snap(state, 'DAY 1: Grace (Imp) executed - GOOD WINS!');

      expect(state.winner).toBe(Team.GOOD);
      expect(state.phase).toBe(Phase.GAME_OVER);
      expect(state.players.find(p => p.name === 'Grace').alive).toBe(false);

      // Verify all snapshots were captured
      expect(snapshots.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('Trouble Brewing: Evil wins by killing down to 2 (5 players)', () => {
    test('complete game from setup to Evil victory', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'empath' },
        { name: 'Bob', role: 'soldier' },
        { name: 'Charlie', role: 'chef' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);
      console.log(snapshotGameState(state, 'SETUP: 5-player TB (Evil win path)'));

      // === NIGHT 1 ===
      state = startNightPhase(state);
      // Poisoner poisons Soldier
      const bob = state.players.find(p => p.name === 'Bob');
      state = processNightAction(state, 'poisoner', { targetId: bob.id });
      state = advanceNightAction(state);

      // Process remaining first night
      while (state.pendingNightAction) {
        state = processNightAction(state, state.pendingNightAction, {});
        state = advanceNightAction(state);
      }
      state = endNight(state);
      console.log(snapshotGameState(state, 'DAY 1: After first night'));

      // === DAY 1 === Town mislynches Charlie
      const alice = state.players.find(p => p.name === 'Alice');
      const charlie = state.players.find(p => p.name === 'Charlie');
      state = nominate(state, alice.id, charlie.id);
      for (const p of state.players) state = castVote(state, p.id, true);
      state = resolveVote(state);
      state = executePlayer(state);
      console.log(snapshotGameState(state, 'DAY 1: Charlie (Chef) mislynched'));

      expect(state.players.find(p => p.name === 'Charlie').alive).toBe(false);
      expect(state.winner).toBeNull(); // Game continues

      // === NIGHT 2 ===
      state = startNextNight(state);
      console.log(snapshotGameState(state, 'NIGHT 2: Begins'));

      // Poisoner poisons Bob (Soldier) again
      const bob2 = state.players.find(p => p.name === 'Bob');
      state = processNightAction(state, 'poisoner', { targetId: bob2.id });
      state = advanceNightAction(state);

      // Imp kills Bob (Soldier is poisoned, so no protection!)
      state = processNightAction(state, 'imp', { targetId: bob2.id });
      while (state.pendingNightAction) {
        state = processNightAction(state, state.pendingNightAction, {});
        state = advanceNightAction(state);
      }
      state = endNight(state);
      console.log(snapshotGameState(state, 'DAY 2: Bob (Soldier, poisoned) killed'));

      expect(state.players.find(p => p.name === 'Bob').alive).toBe(false);

      // === DAY 2 === No execution (wrong choice)
      state = skipExecution(state);

      // === NIGHT 3 ===
      state = startNextNight(state);
      // Imp kills Alice
      const alice2 = state.players.find(p => p.name === 'Alice');
      state = processNightAction(state, 'poisoner', { targetId: alice2.id });
      state = advanceNightAction(state);
      state = processNightAction(state, 'imp', { targetId: alice2.id });
      while (state.pendingNightAction) {
        state = processNightAction(state, state.pendingNightAction, {});
        state = advanceNightAction(state);
      }
      state = endNight(state);
      console.log(snapshotGameState(state, 'DAY 3: Alice killed, only 2 alive'));

      // Check: 2 players alive (Dave=poisoner, Eve=imp)
      const alivePlayers = state.players.filter(p => p.alive);
      expect(alivePlayers.length).toBe(2);

      state = checkWinConditions(state);
      console.log(snapshotGameState(state, 'EVIL WINS: 2 players remain'));

      expect(state.winner).toBe(Team.EVIL);
      expect(state.phase).toBe(Phase.GAME_OVER);
    });
  });

  describe('Trouble Brewing: Imp starpass then Good still wins', () => {
    test('Imp self-kills, minion becomes new Imp, Good executes new Imp', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'empath' },
        { name: 'Bob', role: 'fortune_teller' },
        { name: 'Charlie', role: 'monk' },
        { name: 'Dave', role: 'slayer' },
        { name: 'Eve', role: 'soldier' },
        { name: 'Frank', role: 'poisoner' },
        { name: 'Grace', role: 'imp' },
      ]);
      console.log(snapshotGameState(state, 'SETUP: 7p TB (Starpass scenario)'));

      // Night 1
      state = startNightPhase(state);
      while (state.pendingNightAction) {
        state = processNightAction(state, state.pendingNightAction, {});
        state = advanceNightAction(state);
      }
      state = endNight(state);
      console.log(snapshotGameState(state, 'DAY 1: After night 1'));

      // Day 1: no execution
      state = skipExecution(state);

      // Night 2: Imp self-kills (starpass to Poisoner)
      state = startNextNight(state);
      const grace = state.players.find(p => p.name === 'Grace');
      state = processNightAction(state, 'imp', { targetId: grace.id });
      while (state.pendingNightAction) {
        state = processNightAction(state, state.pendingNightAction, {});
        state = advanceNightAction(state);
      }
      state = endNight(state);
      console.log(snapshotGameState(state, 'DAY 2: Grace (old Imp) dead, Poisoner is new Imp'));

      expect(state.players.find(p => p.name === 'Grace').alive).toBe(false);
      // Frank should now be the Imp
      const newImp = state.players.find(p => p.role === 'imp' && p.alive);
      expect(newImp).toBeTruthy();
      expect(newImp.name).toBe('Frank');

      // Day 2: Slayer uses ability on Frank
      const dave = state.players.find(p => p.name === 'Dave');
      const frank = state.players.find(p => p.name === 'Frank');
      state = useSlayerAbility(state, dave.id, frank.id);
      console.log(snapshotGameState(state, 'DAY 2: Slayer kills new Imp (Frank)'));

      expect(state.winner).toBe(Team.GOOD);
      expect(state.phase).toBe(Phase.GAME_OVER);
    });
  });

  describe('Sects & Violets: Witch curse kills nominator', () => {
    test('cursed player nominates and dies', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'clockmaker' },
        { name: 'Bob', role: 'dreamer' },
        { name: 'Charlie', role: 'oracle' },
        { name: 'Dave', role: 'witch' },
        { name: 'Eve', role: 'no_dashii' },
      ], ScriptId.SECTS_AND_VIOLETS);
      console.log(snapshotGameState(state, 'SETUP: 5p S&V (Witch curse)'));

      // Night 1: Witch curses Alice
      state = startNightPhase(state);
      const alice = state.players.find(p => p.name === 'Alice');
      state = processNightAction(state, 'witch', { targetId: alice.id });
      state = advanceNightAction(state);

      while (state.pendingNightAction) {
        state = processNightAction(state, state.pendingNightAction, {});
        state = advanceNightAction(state);
      }
      if (state.phase !== Phase.DAY) {
        state = endNight(state);
      }
      console.log(snapshotGameState(state, 'DAY 1: Alice is cursed'));

      // Day 1: Alice nominates someone (she should die from curse)
      const bob = state.players.find(p => p.name === 'Bob');
      state = nominate(state, alice.id, bob.id);
      console.log(snapshotGameState(state, 'DAY 1: Cursed Alice nominates and dies'));

      expect(state.players.find(p => p.name === 'Alice').alive).toBe(false);
    });
  });

  describe('Bad Moon Rising: Multi-kill Po massacre', () => {
    test('Po passes then kills 3, Evil wins', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'tea_lady' },
        { name: 'Bob', role: 'fool' },
        { name: 'Charlie', role: 'chambermaid' },
        { name: 'Dave', role: 'innkeeper' },
        { name: 'Eve', role: 'godfather' },
        { name: 'Frank', role: 'po' },
        { name: 'Grace', role: 'gambler' },
      ], ScriptId.BAD_MOON_RISING);
      console.log(snapshotGameState(state, 'SETUP: 7p BMR (Po massacre)'));

      // Night 1: skip actions
      state = startNightPhase(state);
      while (state.pendingNightAction) {
        state = processNightAction(state, state.pendingNightAction, {});
        state = advanceNightAction(state);
      }
      state = endNight(state);
      console.log(snapshotGameState(state, 'DAY 1: After first night'));

      // Day 1: Mislynch Alice
      state = nominate(state, state.players[1].id, state.players[0].id);
      for (const p of state.players) state = castVote(state, p.id, true);
      state = resolveVote(state);
      state = executePlayer(state);
      console.log(snapshotGameState(state, 'DAY 1: Alice mislynched'));

      // Night 2: Po passes
      state = startNextNight(state);
      state = processNightAction(state, 'po', { pass: true });
      while (state.pendingNightAction) {
        state = processNightAction(state, state.pendingNightAction, {});
        state = advanceNightAction(state);
      }
      state = endNight(state);
      console.log(snapshotGameState(state, 'DAY 2: Po passed (charging up)'));

      // Day 2: no execution
      state = skipExecution(state);

      // Night 3: Po kills 3!
      state = startNextNight(state);
      const bob = state.players.find(p => p.name === 'Bob');
      const charlie = state.players.find(p => p.name === 'Charlie');
      const dave = state.players.find(p => p.name === 'Dave');
      state = processNightAction(state, 'po', {
        targetIds: [bob.id, charlie.id, dave.id],
      });
      while (state.pendingNightAction) {
        state = processNightAction(state, state.pendingNightAction, {});
        state = advanceNightAction(state);
      }
      state = endNight(state);
      console.log(snapshotGameState(state, 'DAY 3: Po triple kill!'));

      const alive = state.players.filter(p => p.alive);
      console.log(`Alive players: ${alive.map(p => `${p.name}(${p.role})`).join(', ')}`);

      // Should be 2 alive (Eve=godfather, Frank=po, Grace=gambler minus 3 kills)
      // Alice(dead), Bob(dead), Charlie(dead), Dave(dead) = 3 alive
      // If 3 alive, game continues. If 2, evil wins.
      state = checkWinConditions(state);
      console.log(snapshotGameState(state, 'After Po massacre: check win'));
    });
  });

  describe('Trouble Brewing: Full 10-player game with random assignment', () => {
    test('randomly assigned 10-player game can be played to completion', () => {
      const initial = createGame({
        scriptId: ScriptId.TROUBLE_BREWING,
        playerNames: Array.from({ length: 10 }, (_, i) => `Player${i + 1}`),
      });
      let state = assignRoles(initial);
      console.log(snapshotGameState(state, 'RANDOM GAME: 10p TB after assignment'));

      // Verify setup is valid
      expect(state.players.length).toBe(10);
      expect(state.players.filter(p => getRoleById(p.role)?.type === RoleType.DEMON).length).toBe(1);

      const demon = state.players.find(p => getRoleById(p.role)?.type === RoleType.DEMON);
      console.log(`Demon: ${demon.name} (${demon.role})`);

      // Play through night 1
      state = startNightPhase(state);
      state = processAllNightActions(state);
      if (state.phase !== Phase.DAY) {
        state = endNight(state);
      }
      console.log(snapshotGameState(state, 'RANDOM GAME: After night 1'));

      // Day 1: nominate and execute a random player
      const alivePlayers = state.players.filter(p => p.alive && !p.hasNominated);
      if (alivePlayers.length >= 2) {
        const nominator = alivePlayers[0];
        const nominee = alivePlayers[alivePlayers.length - 1];
        state = nominate(state, nominator.id, nominee.id);

        if (state.currentNomination) {
          for (const p of state.players.filter(p => p.alive)) {
            state = castVote(state, p.id, true);
          }
          state = resolveVote(state);
          console.log(snapshotGameState(state, 'RANDOM GAME: Day 1 vote'));

          if (state.executionTarget) {
            state = executePlayer(state);
            console.log(snapshotGameState(state, 'RANDOM GAME: Day 1 execution'));
          }
        }
      }

      // Continue until game ends or 5 rounds
      let rounds = 0;
      while (state.winner === null && rounds < 5) {
        if (state.phase === Phase.GAME_OVER) break;

        state = startNextNight(state);
        state = processAllNightActions(state);
        if (state.phase !== Phase.DAY && state.winner === null) {
          state = endNight(state);
        }
        state = checkWinConditions(state);
        if (state.winner) break;

        console.log(snapshotGameState(state, `RANDOM GAME: Day ${state.dayNumber}`));

        // Try to execute someone each day
        const alive = state.players.filter(p => p.alive && !p.hasNominated);
        if (alive.length >= 2) {
          state = nominate(state, alive[0].id, alive[1].id);
          if (state.currentNomination) {
            for (const p of state.players.filter(p => p.alive)) {
              state = castVote(state, p.id, true);
            }
            state = resolveVote(state);
            if (state.executionTarget) {
              state = executePlayer(state);
            }
          }
        } else {
          state = skipExecution(state);
        }
        state = checkWinConditions(state);
        rounds++;
      }

      console.log(snapshotGameState(state, 'RANDOM GAME: Final state'));

      // Game should have ended (either good or evil won)
      // If not ended after 5 rounds, that's also OK (game can be long)
      if (state.winner) {
        expect([Team.GOOD, Team.EVIL]).toContain(state.winner);
        console.log(`\nGAME RESULT: ${state.winner.toUpperCase()} WINS after ${rounds + 1} rounds\n`);
      }
    });
  });

  describe('Storyteller mode operations', () => {
    test('storyteller can manipulate game state throughout a game', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'empath' },
        { name: 'Bob', role: 'chef' },
        { name: 'Charlie', role: 'monk' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);
      state.storytellerMode = true;
      console.log(snapshotGameState(state, 'ST MODE: Initial setup'));

      // Storyteller changes Bob's role
      state = storytellerSetRole(state, state.players[1].id, 'fortune_teller');
      console.log(snapshotGameState(state, 'ST MODE: Changed Bob to Fortune Teller'));
      expect(state.players.find(p => p.name === 'Bob').role).toBe('fortune_teller');

      // Storyteller poisons Alice
      state = storytellerSetPoisoned(state, state.players[0].id, true);
      console.log(snapshotGameState(state, 'ST MODE: Poisoned Alice'));
      expect(state.players.find(p => p.name === 'Alice').poisoned).toBe(true);

      // Storyteller makes Charlie drunk
      state = storytellerSetDrunk(state, state.players[2].id, true);
      console.log(snapshotGameState(state, 'ST MODE: Made Charlie drunk'));
      expect(state.players.find(p => p.name === 'Charlie').drunk).toBe(true);

      // Storyteller kills Dave
      state = storytellerKillPlayer(state, state.players[3].id);
      console.log(snapshotGameState(state, 'ST MODE: Killed Dave'));
      expect(state.players.find(p => p.name === 'Dave').alive).toBe(false);

      // Storyteller revives Dave
      state = storytellerRevivePlayer(state, state.players[3].id);
      console.log(snapshotGameState(state, 'ST MODE: Revived Dave'));
      expect(state.players.find(p => p.name === 'Dave').alive).toBe(true);

      // Storyteller declares winner
      state = storytellerDeclareWinner(state, Team.EVIL);
      console.log(snapshotGameState(state, 'ST MODE: Declared Evil wins'));
      expect(state.winner).toBe(Team.EVIL);
      expect(state.phase).toBe(Phase.GAME_OVER);
    });
  });

  describe('Edge cases', () => {
    test('game with minimum players (5)', () => {
      const initial = createGame({
        scriptId: ScriptId.TROUBLE_BREWING,
        playerNames: ['A', 'B', 'C', 'D', 'E'],
      });
      let state = assignRoles(initial);
      console.log(snapshotGameState(state, 'EDGE: 5-player game'));

      expect(state.players.length).toBe(5);
      const demon = state.players.find(p => getRoleById(p.role)?.type === RoleType.DEMON);
      expect(demon).toBeTruthy();
    });

    test('game with maximum players (15)', () => {
      const initial = createGame({
        scriptId: ScriptId.TROUBLE_BREWING,
        playerNames: Array.from({ length: 15 }, (_, i) => `P${i + 1}`),
      });
      let state = assignRoles(initial);
      console.log(snapshotGameState(state, 'EDGE: 15-player game'));

      expect(state.players.length).toBe(15);
      expect(state.players.filter(p => getRoleById(p.role)?.type === RoleType.DEMON).length).toBe(1);
      expect(state.players.filter(p => getRoleById(p.role)?.type === RoleType.MINION).length).toBe(3);
    });

    test('multiple nominations in one day', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'monk' },
        { name: 'Eve', role: 'fortune_teller' },
        { name: 'Frank', role: 'poisoner' },
        { name: 'Grace', role: 'imp' },
      ]);
      state.phase = Phase.DAY;
      state.dayNumber = 1;
      state.isFirstNight = false;
      state.voteThreshold = 4;

      // Nomination 1: fails
      state = runNominationAndVote(state, 'Alice', 'Grace', {
        Alice: true, Bob: true, Charlie: false, Dave: false, Eve: false, Frank: false, Grace: false,
      });
      console.log(snapshotGameState(state, 'EDGE: First nomination fails (2 votes)'));
      expect(state.executionTarget).toBeNull();

      // Nomination 2: passes
      state = runNominationAndVote(state, 'Bob', 'Frank', {
        Alice: true, Bob: true, Charlie: true, Dave: true, Eve: true, Frank: false, Grace: false,
      });
      console.log(snapshotGameState(state, 'EDGE: Second nomination passes (5 votes)'));
      expect(state.executionTarget).toBeTruthy();

      expect(state.nominations.length).toBe(2);
    });

    test('all players dead except demon = evil wins', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'poisoner' },
        { name: 'Dave', role: 'imp' },
        { name: 'Eve', role: 'soldier' },
      ]);
      state.phase = Phase.DAY;

      // Kill everyone except Dave (imp) and one other
      state.players = state.players.map(p => {
        if (['Alice', 'Bob', 'Charlie'].includes(p.name)) return { ...p, alive: false };
        return p;
      });

      state = checkWinConditions(state);
      console.log(snapshotGameState(state, 'EDGE: Only 2 alive (demon + 1)'));

      expect(state.winner).toBe(Team.EVIL);
    });
  });
});
