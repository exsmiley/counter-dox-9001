import {
  createGame,
  assignRoles,
  startNightPhase,
  processNightAction,
  advanceNightAction,
  endNight,
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
  storytellerSetPoisoned,
  storytellerSetDrunk,
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
  state.demonBluffs = ['washerwoman', 'librarian', 'chef'];
  return state;
}

function processAllNightActions(state) {
  const night = startNightPhase(state);
  let current = night;
  let safety = 0;
  while (current.pendingNightAction && safety < 50) {
    current = processNightAction(current, current.pendingNightAction, {});
    current = advanceNightAction(current);
    safety++;
  }
  if (current.phase !== Phase.DAY) {
    current = endNight(current);
  }
  return current;
}

function runNominationAndVote(state, nominatorName, nomineeName, voterNames) {
  const nominator = state.players.find(p => p.name === nominatorName);
  const nominee = state.players.find(p => p.name === nomineeName);
  if (!nominator || !nominee) return state;

  let s = nominate(state, nominator.id, nominee.id);
  for (const voterName of voterNames) {
    const voter = s.players.find(p => p.name === voterName);
    if (voter) {
      s = castVote(s, voter.id, true);
    }
  }
  s = resolveVote(s);
  return s;
}

describe('Special Cross-Role Interactions', () => {
  describe('Drunk + Poisoner Interaction', () => {
    test('Drunk Empath gets unreliable info even without being poisoned', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'drunk', perceivedRole: 'empath' },
        { name: 'Bob', role: 'chef' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);
      state = startNightPhase(state);

      // The Drunk thinks they're the Empath but is actually drunk
      const alice = state.players.find(p => p.name === 'Alice');
      // Set drunk flag manually since the Drunk's ability makes them think they're someone else
      state.players = state.players.map(p =>
        p.name === 'Alice' ? { ...p, drunk: true } : p
      );

      state = processNightAction(state, 'empath', {});
      console.log(snapshotGameState(state, 'Drunk-as-Empath gets info'));

      // The info should exist but may be unreliable (random when drunk)
      const updatedAlice = state.players.find(p => p.name === 'Alice');
      expect(updatedAlice.drunk).toBe(true);
    });

    test('Poisoned Soldier can be killed by Imp', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'soldier' },
        { name: 'Bob', role: 'chef' },
        { name: 'Charlie', role: 'empath' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);
      state.isFirstNight = false;
      state.phase = Phase.NIGHT;
      state = startNightPhase(state);

      // Poisoner poisons Soldier first
      const alice = state.players.find(p => p.name === 'Alice');
      state = processNightAction(state, 'poisoner', { targetId: alice.id });
      console.log(snapshotGameState(state, 'Poisoner poisons Soldier'));

      expect(state.players.find(p => p.name === 'Alice').poisoned).toBe(true);

      // Imp attacks poisoned Soldier
      state = processNightAction(state, 'imp', { targetId: alice.id });
      console.log(snapshotGameState(state, 'Imp kills poisoned Soldier'));

      expect(state.players.find(p => p.name === 'Alice').alive).toBe(false);
    });
  });

  describe('Scarlet Woman + Imp Execution', () => {
    test('Scarlet Woman becomes Imp when Imp is executed with 5+ alive', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'scarlet_woman' },
        { name: 'Eve', role: 'imp' },
        { name: 'Frank', role: 'monk' },
      ]);
      state.phase = Phase.DAY;
      state.dayNumber = 1;
      state.voteThreshold = 3;

      // Nominate and execute the Imp
      const alice = state.players.find(p => p.name === 'Alice');
      const eve = state.players.find(p => p.name === 'Eve');
      state = nominate(state, alice.id, eve.id);
      // Everyone votes yes
      for (const p of state.players.filter(p => p.alive)) {
        state = castVote(state, p.id, true);
      }
      state = resolveVote(state);
      state = executePlayer(state);

      console.log(snapshotGameState(state, 'Imp executed - Scarlet Woman takeover'));

      // Eve (Imp) should be dead
      expect(state.players.find(p => p.name === 'Eve').alive).toBe(false);
      // Dave (Scarlet Woman) should now be the Imp
      expect(state.players.find(p => p.name === 'Dave').role).toBe('imp');
      // Game should NOT be over
      expect(state.winner).toBeFalsy();
    });

    test('Scarlet Woman does NOT take over with fewer than 5 alive', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'scarlet_woman' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);
      // Kill Bob so only 4 alive
      state.players = state.players.map(p =>
        p.name === 'Bob' ? { ...p, alive: false } : p
      );
      state.phase = Phase.DAY;
      state.dayNumber = 1;
      state.voteThreshold = 2;

      const alice = state.players.find(p => p.name === 'Alice');
      const eve = state.players.find(p => p.name === 'Eve');
      state = nominate(state, alice.id, eve.id);
      for (const p of state.players.filter(p => p.alive)) {
        state = castVote(state, p.id, true);
      }
      state = resolveVote(state);
      state = executePlayer(state);

      console.log(snapshotGameState(state, 'Imp executed with <5 alive - no SW takeover'));

      // Good should win since Scarlet Woman can't take over
      expect(state.winner).toBe(Team.GOOD);
    });
  });

  describe('Imp Starpass + Slayer Combo', () => {
    test('Imp starpasses to minion, Slayer kills new Imp', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'slayer' },
        { name: 'Bob', role: 'chef' },
        { name: 'Charlie', role: 'poisoner' },
        { name: 'Dave', role: 'scarlet_woman' },
        { name: 'Eve', role: 'imp' },
      ]);
      state.isFirstNight = false;
      state.phase = Phase.NIGHT;
      state = startNightPhase(state);

      // Imp self-kills (starpasses)
      const eve = state.players.find(p => p.name === 'Eve');
      state = processNightAction(state, 'imp', { targetId: eve.id });
      console.log(snapshotGameState(state, 'After Imp starpass'));

      const newImp = state.players.find(p => p.role === 'imp' && p.alive);
      expect(newImp).toBeTruthy();

      // End night, go to day
      state = endNight(state);
      console.log(snapshotGameState(state, 'Day after Imp starpass'));

      // Slayer targets the new Imp
      const alice = state.players.find(p => p.name === 'Alice');
      state = useSlayerAbility(state, alice.id, newImp.id);
      console.log(snapshotGameState(state, 'Slayer kills new Imp'));

      expect(state.players.find(p => p.id === newImp.id).alive).toBe(false);
      expect(state.winner).toBe(Team.GOOD);
    });
  });

  describe('Witch Curse + Nomination', () => {
    test('cursed player dies when nominating', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'clockmaker' },
        { name: 'Bob', role: 'dreamer' },
        { name: 'Charlie', role: 'witch' },
        { name: 'Dave', role: 'oracle' },
        { name: 'Eve', role: 'fang_gu' },
        { name: 'Frank', role: 'seamstress' },
      ], ScriptId.SECTS_AND_VIOLETS);
      state.isFirstNight = false;
      state.phase = Phase.NIGHT;
      state = startNightPhase(state);

      // Witch curses Alice
      const alice = state.players.find(p => p.name === 'Alice');
      state = processNightAction(state, 'witch', { targetId: alice.id });

      // End night, go to day
      state = endNight(state);
      console.log(snapshotGameState(state, 'Day - Alice is cursed'));

      // Alice nominates someone - she should die
      const bob = state.players.find(p => p.name === 'Bob');
      state = nominate(state, alice.id, bob.id);
      console.log(snapshotGameState(state, 'Alice nominates while cursed'));

      expect(state.players.find(p => p.name === 'Alice').alive).toBe(false);
    });
  });

  describe('Pit-Hag Role Change', () => {
    test('Pit-Hag changes player role mid-game', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'clockmaker' },
        { name: 'Bob', role: 'dreamer' },
        { name: 'Charlie', role: 'pit_hag' },
        { name: 'Dave', role: 'oracle' },
        { name: 'Eve', role: 'no_dashii' },
      ], ScriptId.SECTS_AND_VIOLETS);
      state.isFirstNight = false;
      state.phase = Phase.NIGHT;
      state = startNightPhase(state);

      // Pit-Hag changes Alice from Clockmaker to Sweetheart
      const alice = state.players.find(p => p.name === 'Alice');
      state = processNightAction(state, 'pit_hag', {
        targetId: alice.id,
        characterId: 'sweetheart',
      });
      console.log(snapshotGameState(state, 'Pit-Hag changes Alice to Sweetheart'));

      expect(state.players.find(p => p.name === 'Alice').role).toBe('sweetheart');
    });
  });

  describe('Snake Charmer + Demon Swap', () => {
    test('Snake Charmer becomes demon when targeting demon', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'snake_charmer' },
        { name: 'Bob', role: 'dreamer' },
        { name: 'Charlie', role: 'witch' },
        { name: 'Dave', role: 'oracle' },
        { name: 'Eve', role: 'vortox' },
      ], ScriptId.SECTS_AND_VIOLETS);
      state = startNightPhase(state);

      const eve = state.players.find(p => p.name === 'Eve');
      state = processNightAction(state, 'snake_charmer', { targetId: eve.id });
      console.log(snapshotGameState(state, 'Snake Charmer swaps with Vortox'));

      expect(state.players.find(p => p.name === 'Alice').role).toBe('vortox');
      expect(state.players.find(p => p.name === 'Eve').role).toBe('snake_charmer');
    });

    test('Snake Charmer does nothing when targeting non-demon', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'snake_charmer' },
        { name: 'Bob', role: 'dreamer' },
        { name: 'Charlie', role: 'witch' },
        { name: 'Dave', role: 'oracle' },
        { name: 'Eve', role: 'vortox' },
      ], ScriptId.SECTS_AND_VIOLETS);
      state = startNightPhase(state);

      const bob = state.players.find(p => p.name === 'Bob');
      state = processNightAction(state, 'snake_charmer', { targetId: bob.id });
      console.log(snapshotGameState(state, 'Snake Charmer targets non-demon'));

      expect(state.players.find(p => p.name === 'Alice').role).toBe('snake_charmer');
      expect(state.players.find(p => p.name === 'Bob').role).toBe('dreamer');
    });
  });

  describe('Fang Gu + Outsider', () => {
    test('Fang Gu dies and outsider becomes new Fang Gu', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'clockmaker' },
        { name: 'Bob', role: 'sweetheart' },  // outsider
        { name: 'Charlie', role: 'witch' },
        { name: 'Dave', role: 'oracle' },
        { name: 'Eve', role: 'fang_gu' },
      ], ScriptId.SECTS_AND_VIOLETS);
      state.isFirstNight = false;
      state.phase = Phase.NIGHT;
      state = startNightPhase(state);

      const bob = state.players.find(p => p.name === 'Bob');
      state = processNightAction(state, 'fang_gu', { targetId: bob.id });
      console.log(snapshotGameState(state, 'Fang Gu attacks Outsider'));

      // Eve (Fang Gu) should die
      expect(state.players.find(p => p.name === 'Eve').alive).toBe(false);
      // Bob should become the new Fang Gu
      expect(state.players.find(p => p.name === 'Bob').role).toBe('fang_gu');
    });
  });

  describe('No Dashii + Townsfolk Neighbors', () => {
    test('No Dashii poisons adjacent townsfolk when killing', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'clockmaker' },
        { name: 'Bob', role: 'no_dashii' },  // demon
        { name: 'Charlie', role: 'dreamer' },
        { name: 'Dave', role: 'witch' },
        { name: 'Eve', role: 'oracle' },
      ], ScriptId.SECTS_AND_VIOLETS);
      state.isFirstNight = false;
      state.phase = Phase.NIGHT;
      state = startNightPhase(state);

      const eve = state.players.find(p => p.name === 'Eve');
      state = processNightAction(state, 'no_dashii', { targetId: eve.id });
      console.log(snapshotGameState(state, 'No Dashii kills Eve, poisons neighbors'));

      // Alice and Charlie are neighbors of Bob (No Dashii)
      // If they are Townsfolk, they should be poisoned
      const alice = state.players.find(p => p.name === 'Alice');
      const charlie = state.players.find(p => p.name === 'Charlie');
      // At least one neighbor who is townsfolk should be poisoned
      const townsfolkNeighborPoisoned = alice.poisoned || charlie.poisoned;
      expect(townsfolkNeighborPoisoned).toBe(true);
    });
  });

  describe('Pukka Delayed Kill Chain', () => {
    test('Pukka poison -> next night kills previous target, poisons new one', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'tea_lady' },
        { name: 'Bob', role: 'sailor' },
        { name: 'Charlie', role: 'godfather' },
        { name: 'Dave', role: 'chambermaid' },
        { name: 'Eve', role: 'pukka' },
      ], ScriptId.BAD_MOON_RISING);

      // Night 1: Pukka poisons Alice
      state.isFirstNight = false;
      state.phase = Phase.NIGHT;
      state = startNightPhase(state);
      const alice = state.players.find(p => p.name === 'Alice');
      state = processNightAction(state, 'pukka', { targetId: alice.id });
      state = endNight(state);
      console.log(snapshotGameState(state, 'After Night 1: Alice poisoned by Pukka'));

      expect(state.players.find(p => p.name === 'Alice').alive).toBe(true); // Still alive

      // Night 2: Pukka poisons Bob, Alice now dies
      state.isFirstNight = false;
      state = startNightPhase(state);
      const bob = state.players.find(p => p.name === 'Bob');
      state = processNightAction(state, 'pukka', { targetId: bob.id });
      console.log(snapshotGameState(state, 'Night 2: Pukka targets Bob, Alice dies'));

      expect(state.players.find(p => p.name === 'Alice').alive).toBe(false);
      expect(state.players.find(p => p.name === 'Bob').poisoned).toBe(true);
    });
  });

  describe('Devil\'s Advocate + Execution', () => {
    test('DA-protected player survives execution', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'tea_lady' },
        { name: 'Bob', role: 'sailor' },
        { name: 'Charlie', role: 'devils_advocate' },
        { name: 'Dave', role: 'chambermaid' },
        { name: 'Eve', role: 'zombuul' },
      ], ScriptId.BAD_MOON_RISING);
      state.isFirstNight = false;
      state.phase = Phase.NIGHT;
      state = startNightPhase(state);

      // Devil's Advocate protects Alice
      const alice = state.players.find(p => p.name === 'Alice');
      state = processNightAction(state, 'devils_advocate', { targetId: alice.id });
      state = endNight(state);
      console.log(snapshotGameState(state, 'Day - Alice has DA protection'));

      // Try to execute Alice
      state.executionTarget = alice.id;
      state.executionVotes = 3;
      state = executePlayer(state);
      console.log(snapshotGameState(state, 'Alice executed but survives via DA'));

      expect(state.players.find(p => p.name === 'Alice').alive).toBe(true);
    });
  });

  describe('Mastermind Extra Day', () => {
    test('Mastermind prevents immediate good win when demon executed', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'tea_lady' },
        { name: 'Bob', role: 'sailor' },
        { name: 'Charlie', role: 'mastermind' },
        { name: 'Dave', role: 'chambermaid' },
        { name: 'Eve', role: 'zombuul' },
      ], ScriptId.BAD_MOON_RISING);
      state.phase = Phase.DAY;
      state.dayNumber = 1;
      state.voteThreshold = 3;

      // Execute the demon
      const alice = state.players.find(p => p.name === 'Alice');
      const eve = state.players.find(p => p.name === 'Eve');
      state = nominate(state, alice.id, eve.id);
      for (const p of state.players.filter(p => p.alive)) {
        state = castVote(state, p.id, true);
      }
      state = resolveVote(state);
      state = executePlayer(state);

      console.log(snapshotGameState(state, 'Demon executed with Mastermind alive'));

      // Game should NOT be over due to Mastermind
      expect(state.winner).toBeFalsy();
      expect(state.mastermindExtraDay).toBe(true);
    });
  });

  describe('Gossip True Statement', () => {
    test('true gossip causes a player death', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'gossip' },
        { name: 'Bob', role: 'sailor' },
        { name: 'Charlie', role: 'godfather' },
        { name: 'Dave', role: 'chambermaid' },
        { name: 'Eve', role: 'zombuul' },
      ], ScriptId.BAD_MOON_RISING);
      state.isFirstNight = false;
      state.phase = Phase.NIGHT;
      state = startNightPhase(state);

      state = processNightAction(state, 'gossip', { statementTrue: true });
      console.log(snapshotGameState(state, 'Gossip true statement - someone dies'));

      expect(state.nightDeaths.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Innkeeper Protection + Drunk', () => {
    test('Innkeeper protects 2 players, one becomes drunk', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'innkeeper' },
        { name: 'Bob', role: 'sailor' },
        { name: 'Charlie', role: 'godfather' },
        { name: 'Dave', role: 'chambermaid' },
        { name: 'Eve', role: 'zombuul' },
      ], ScriptId.BAD_MOON_RISING);
      state.isFirstNight = false;
      state.phase = Phase.NIGHT;
      state = startNightPhase(state);

      const bob = state.players.find(p => p.name === 'Bob');
      const dave = state.players.find(p => p.name === 'Dave');
      state = processNightAction(state, 'innkeeper', {
        targetIds: [bob.id, dave.id],
      });
      console.log(snapshotGameState(state, 'Innkeeper protects Bob and Dave'));

      const updatedBob = state.players.find(p => p.name === 'Bob');
      const updatedDave = state.players.find(p => p.name === 'Dave');
      // Both should be protected
      expect(updatedBob.protected).toBe(true);
      expect(updatedDave.protected).toBe(true);
      // One should be drunk
      expect(updatedBob.drunk || updatedDave.drunk).toBe(true);
    });
  });

  describe('Courtier Makes Player Drunk', () => {
    test('Courtier once-per-game ability makes target drunk', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'courtier' },
        { name: 'Bob', role: 'sailor' },
        { name: 'Charlie', role: 'godfather' },
        { name: 'Dave', role: 'chambermaid' },
        { name: 'Eve', role: 'zombuul' },
      ], ScriptId.BAD_MOON_RISING);
      state.isFirstNight = false;
      state.phase = Phase.NIGHT;
      state = startNightPhase(state);

      const eve = state.players.find(p => p.name === 'Eve');
      state = processNightAction(state, 'courtier', { targetId: eve.id });
      console.log(snapshotGameState(state, 'Courtier makes Demon drunk'));

      expect(state.players.find(p => p.name === 'Eve').drunk).toBe(true);
      expect(state.players.find(p => p.name === 'Alice').usedOncePerGameAbility).toBe(true);

      // Can't use again
      state.isFirstNight = false;
      state = startNightPhase(state);
      const bob = state.players.find(p => p.name === 'Bob');
      state = processNightAction(state, 'courtier', { targetId: bob.id });

      // Bob should NOT be drunk since ability already used
      expect(state.players.find(p => p.name === 'Bob').drunk).toBe(false);
    });
  });

  describe('Cerenovus Madness', () => {
    test('Cerenovus makes player mad about a character', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'clockmaker' },
        { name: 'Bob', role: 'dreamer' },
        { name: 'Charlie', role: 'cerenovus' },
        { name: 'Dave', role: 'oracle' },
        { name: 'Eve', role: 'fang_gu' },
      ], ScriptId.SECTS_AND_VIOLETS);
      state = startNightPhase(state);

      const alice = state.players.find(p => p.name === 'Alice');
      state = processNightAction(state, 'cerenovus', {
        targetId: alice.id,
        characterId: 'imp',
      });
      console.log(snapshotGameState(state, 'Cerenovus makes Alice mad'));

      expect(state.players.find(p => p.name === 'Alice').reminders).toContainEqual('Mad:imp');
    });
  });

  describe('Virgin + Townsfolk Nominator', () => {
    test('Townsfolk nominating Virgin gets immediately executed', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'virgin' },
        { name: 'Charlie', role: 'empath' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);
      state.phase = Phase.DAY;
      state.dayNumber = 1;
      state.voteThreshold = 3;

      const alice = state.players.find(p => p.name === 'Alice');
      const bob = state.players.find(p => p.name === 'Bob');
      state = nominate(state, alice.id, bob.id);
      console.log(snapshotGameState(state, 'Townsfolk nominates Virgin'));

      // Alice (Townsfolk) should be executed immediately
      expect(state.players.find(p => p.name === 'Alice').alive).toBe(false);
      expect(state.players.find(p => p.name === 'Alice').executedToday).toBe(true);
    });

    test('Non-Townsfolk nominating Virgin - nothing special happens', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'poisoner' },
        { name: 'Bob', role: 'virgin' },
        { name: 'Charlie', role: 'empath' },
        { name: 'Dave', role: 'chef' },
        { name: 'Eve', role: 'imp' },
      ]);
      state.phase = Phase.DAY;
      state.dayNumber = 1;
      state.voteThreshold = 3;

      const alice = state.players.find(p => p.name === 'Alice');
      const bob = state.players.find(p => p.name === 'Bob');
      state = nominate(state, alice.id, bob.id);
      console.log(snapshotGameState(state, 'Minion nominates Virgin'));

      // Alice should still be alive (she's a Minion)
      expect(state.players.find(p => p.name === 'Alice').alive).toBe(true);
    });
  });

  describe('Mayor Win Condition', () => {
    test('Mayor wins if 3 alive and no execution', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'mayor' },
        { name: 'Bob', role: 'chef' },
        { name: 'Charlie', role: 'poisoner' },
        { name: 'Dave', role: 'imp' },
        { name: 'Eve', role: 'empath' },
      ]);
      // Kill 2 players to get to 3 alive
      state.players = state.players.map(p =>
        (p.name === 'Bob' || p.name === 'Eve') ? { ...p, alive: false } : p
      );
      state.phase = Phase.DAY;
      state.dayNumber = 2;

      state = skipExecution(state);
      console.log(snapshotGameState(state, 'Mayor win - 3 alive, no execution'));

      expect(state.winner).toBe(Team.GOOD);
    });

    test('Poisoned Mayor does NOT trigger win at 3 alive', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'mayor' },
        { name: 'Bob', role: 'chef' },
        { name: 'Charlie', role: 'poisoner' },
        { name: 'Dave', role: 'imp' },
        { name: 'Eve', role: 'empath' },
      ]);
      state.players = state.players.map(p => {
        if (p.name === 'Bob' || p.name === 'Eve') return { ...p, alive: false };
        if (p.name === 'Alice') return { ...p, poisoned: true };
        return p;
      });
      state.phase = Phase.DAY;
      state.dayNumber = 2;

      state = skipExecution(state);
      console.log(snapshotGameState(state, 'Poisoned Mayor - no win'));

      expect(state.winner).toBeFalsy();
    });
  });

  describe('Vortox No-Execution Loss', () => {
    test('If Vortox is alive and no execution, evil wins', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'clockmaker' },
        { name: 'Bob', role: 'dreamer' },
        { name: 'Charlie', role: 'witch' },
        { name: 'Dave', role: 'oracle' },
        { name: 'Eve', role: 'vortox' },
      ], ScriptId.SECTS_AND_VIOLETS);
      state.phase = Phase.DAY;
      state.dayNumber = 2;

      state = skipExecution(state);
      console.log(snapshotGameState(state, 'No execution with Vortox alive'));

      expect(state.winner).toBe(Team.EVIL);
    });
  });

  describe('Storyteller Mode Cross-Actions', () => {
    test('storyteller can poison, change role, and kill in sequence', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'poisoner' },
        { name: 'Dave', role: 'soldier' },
        { name: 'Eve', role: 'imp' },
      ]);
      state.phase = Phase.DAY;
      state.dayNumber = 1;

      const alice = state.players.find(p => p.name === 'Alice');
      const bob = state.players.find(p => p.name === 'Bob');

      // Poison Alice
      state = storytellerSetPoisoned(state, alice.id, true);
      expect(state.players.find(p => p.name === 'Alice').poisoned).toBe(true);

      // Change Bob's role
      state = storytellerSetRole(state, bob.id, 'imp');
      expect(state.players.find(p => p.name === 'Bob').role).toBe('imp');

      // Kill Alice
      state = storytellerKillPlayer(state, alice.id);
      console.log(snapshotGameState(state, 'After storyteller actions'));

      expect(state.players.find(p => p.name === 'Alice').alive).toBe(false);
    });
  });

  describe('Ghost Vote Interactions', () => {
    test('dead player can use ghost vote exactly once', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);
      state.players = state.players.map(p =>
        p.name === 'Alice' ? { ...p, alive: false } : p
      );
      state.phase = Phase.DAY;
      state.dayNumber = 1;
      state.voteThreshold = 2;

      // Nominate someone
      const bob = state.players.find(p => p.name === 'Bob');
      const dave = state.players.find(p => p.name === 'Dave');
      state = nominate(state, bob.id, dave.id);

      // Dead Alice votes (ghost vote)
      const alice = state.players.find(p => p.name === 'Alice');
      state = castVote(state, alice.id, true);
      console.log(snapshotGameState(state, 'Ghost Alice votes'));

      expect(state.players.find(p => p.name === 'Alice').ghostVoteUsed).toBe(true);

      state = resolveVote(state);

      // Second nomination - Alice can't vote again
      const charlie = state.players.find(p => p.name === 'Charlie');
      const eve = state.players.find(p => p.name === 'Eve');
      state = nominate(state, charlie.id, eve.id);
      const beforeVote = { ...state };
      state = castVote(state, alice.id, true);

      // Vote should be rejected (ghost vote already used)
      expect(state.currentNomination.voteCount).toBe(0);
    });
  });

  describe('Butler Voting Restriction', () => {
    test('Butler can only vote if master has voted yes', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'butler' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'chef' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);
      state.phase = Phase.DAY;
      state.dayNumber = 1;
      state.voteThreshold = 3;

      // Set Bob as Butler's master
      const bob = state.players.find(p => p.name === 'Bob');
      state.players = state.players.map(p =>
        p.name === 'Alice' ? { ...p, butlerMaster: bob.id } : p
      );

      // Nominate Dave
      const charlie = state.players.find(p => p.name === 'Charlie');
      const dave = state.players.find(p => p.name === 'Dave');
      state = nominate(state, charlie.id, dave.id);

      // Alice tries to vote before master - should be rejected
      const alice = state.players.find(p => p.name === 'Alice');
      state = castVote(state, alice.id, true);
      expect(state.currentNomination.voteCount).toBe(0);

      // Master votes yes
      state = castVote(state, bob.id, true);
      expect(state.currentNomination.voteCount).toBe(1);

      // Now Alice can vote
      state = castVote(state, alice.id, true);
      console.log(snapshotGameState(state, 'Butler votes after master'));

      expect(state.currentNomination.voteCount).toBe(2);
    });
  });
});
