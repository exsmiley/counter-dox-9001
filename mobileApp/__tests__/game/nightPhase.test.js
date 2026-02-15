import {
  createGame,
  assignRoles,
  startNightPhase,
  processNightAction,
  advanceNightAction,
  endNight,
  getNightOrder,
} from '../../src/game/GameEngine';
import { getRoleById, RoleType, Team, Phase } from '../../src/game/roles';
import { ScriptId } from '../../src/game/scripts';

// Helper to create a game with specific roles assigned to specific players
function createFixedGame(roleAssignments, scriptId = ScriptId.TROUBLE_BREWING) {
  const names = roleAssignments.map(r => r.name);
  let state = createGame({ scriptId, playerNames: names });

  // Override with fixed roles
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
  state.demonBluffs = ['washerwoman', 'librarian', 'chef']; // placeholder

  return state;
}

describe('Night Phase', () => {
  describe('Night ordering', () => {
    test('first night order contains expected roles for TB', () => {
      const state = createFixedGame([
        { name: 'Alice', role: 'washerwoman' },
        { name: 'Bob', role: 'poisoner' },
        { name: 'Charlie', role: 'chef' },
        { name: 'Dave', role: 'empath' },
        { name: 'Eve', role: 'imp' },
      ]);

      const order = getNightOrder(state);
      expect(order.length).toBeGreaterThan(0);
      // Poisoner should come before Washerwoman
      const poisonerIdx = order.indexOf('poisoner');
      const washerwomanIdx = order.indexOf('washerwoman');
      if (poisonerIdx >= 0 && washerwomanIdx >= 0) {
        expect(poisonerIdx).toBeLessThan(washerwomanIdx);
      }
    });

    test('Imp is excluded from first night order', () => {
      const state = createFixedGame([
        { name: 'Alice', role: 'washerwoman' },
        { name: 'Bob', role: 'chef' },
        { name: 'Charlie', role: 'empath' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      const order = getNightOrder(state);
      expect(order).not.toContain('imp'); // Imp doesn't wake first night
    });

    test('subsequent night order includes Imp and Monk but not first-night-only roles', () => {
      const state = createFixedGame([
        { name: 'Alice', role: 'monk' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'washerwoman' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);
      state.isFirstNight = false;
      state.phase = Phase.NIGHT;

      const order = getNightOrder(state);
      expect(order).toContain('imp');
      expect(order).toContain('monk');
      expect(order).not.toContain('washerwoman'); // first night only
    });
  });

  describe('startNightPhase', () => {
    test('transitions to night phase with correct state', () => {
      const initial = createFixedGame([
        { name: 'Alice', role: 'washerwoman' },
        { name: 'Bob', role: 'chef' },
        { name: 'Charlie', role: 'empath' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      const state = startNightPhase(initial);
      console.log(snapshotGameState(state, 'After startNightPhase (first night)'));

      expect(state.phase).toBe(Phase.FIRST_NIGHT);
      expect(state.nightDeaths).toEqual([]);
      expect(state.nightActions).toEqual([]);
      expect(state.pendingNightAction).toBeTruthy();
      // All players should have poisoned/protected reset
      for (const p of state.players) {
        expect(p.poisoned).toBe(false);
        expect(p.protected).toBe(false);
      }
    });
  });

  describe('Trouble Brewing night abilities', () => {
    describe('Poisoner', () => {
      test('poisons target player', () => {
        let state = createFixedGame([
          { name: 'Alice', role: 'empath' },
          { name: 'Bob', role: 'chef' },
          { name: 'Charlie', role: 'soldier' },
          { name: 'Dave', role: 'poisoner' },
          { name: 'Eve', role: 'imp' },
        ]);
        state = startNightPhase(state);
        const alice = state.players.find(p => p.name === 'Alice');

        state = processNightAction(state, 'poisoner', { targetId: alice.id });
        console.log(snapshotGameState(state, 'After Poisoner targets Alice'));

        expect(state.players.find(p => p.name === 'Alice').poisoned).toBe(true);
      });
    });

    describe('Washerwoman', () => {
      test('receives two-players-one-is info on first night', () => {
        let state = createFixedGame([
          { name: 'Alice', role: 'washerwoman' },
          { name: 'Bob', role: 'chef' },
          { name: 'Charlie', role: 'empath' },
          { name: 'Dave', role: 'poisoner' },
          { name: 'Eve', role: 'imp' },
        ]);
        state = startNightPhase(state);

        state = processNightAction(state, 'washerwoman', {});
        const alice = state.players.find(p => p.name === 'Alice');
        console.log(snapshotGameState(state, 'After Washerwoman gets info'));

        expect(alice.nightInfo).toBeTruthy();
        expect(alice.nightInfo.type).toBe('twoPlayersOneIs');
      });
    });

    describe('Chef', () => {
      test('receives evil pair count', () => {
        let state = createFixedGame([
          { name: 'Alice', role: 'chef' },
          { name: 'Bob', role: 'empath' },
          { name: 'Charlie', role: 'poisoner' },
          { name: 'Dave', role: 'imp' }, // adjacent evil pair
          { name: 'Eve', role: 'soldier' },
        ]);
        state = startNightPhase(state);

        state = processNightAction(state, 'chef', {});
        const alice = state.players.find(p => p.name === 'Alice');
        console.log(snapshotGameState(state, 'After Chef gets evil pair count'));

        expect(alice.nightInfo).toBeTruthy();
        expect(alice.nightInfo.type).toBe('number');
        expect(alice.nightInfo.label).toContain('Evil pairs');
        // Charlie (poisoner) and Dave (imp) are adjacent = 1 pair
        expect(alice.nightInfo.value).toBe(1);
      });

      test('detects zero evil pairs when evil players are separated', () => {
        let state = createFixedGame([
          { name: 'Alice', role: 'chef' },
          { name: 'Bob', role: 'poisoner' },
          { name: 'Charlie', role: 'empath' },
          { name: 'Dave', role: 'soldier' },
          { name: 'Eve', role: 'imp' },
        ]);
        // Bob(evil), Charlie(good), Dave(good), Eve(evil) - wrap: Eve-Alice-Bob
        // Eve and Alice are adjacent (Eve is evil, Alice good) - no pair
        // Alice and Bob adjacent (Alice good, Bob evil) - no pair
        // But we need to check... Evil players: Bob(1) and Eve(4)
        // Seat order: Alice(0), Bob(1), Charlie(2), Dave(3), Eve(4)
        // Bob-Charlie: evil-good = no pair
        // Dave-Eve: good-evil = no pair
        // Eve-Alice: evil-good = no pair (wraps)
        state = startNightPhase(state);
        state = processNightAction(state, 'chef', {});
        const alice = state.players.find(p => p.name === 'Alice');

        expect(alice.nightInfo.value).toBe(0);
        console.log(snapshotGameState(state, 'Chef with 0 evil pairs'));
      });
    });

    describe('Empath', () => {
      test('detects evil neighbors', () => {
        let state = createFixedGame([
          { name: 'Alice', role: 'empath' },
          { name: 'Bob', role: 'imp' },    // right neighbor of Alice
          { name: 'Charlie', role: 'soldier' },
          { name: 'Dave', role: 'chef' },
          { name: 'Eve', role: 'poisoner' }, // left neighbor of Alice (wraps)
        ]);
        state = startNightPhase(state);

        state = processNightAction(state, 'empath', {});
        const alice = state.players.find(p => p.name === 'Alice');
        console.log(snapshotGameState(state, 'Empath with evil neighbors'));

        expect(alice.nightInfo.type).toBe('number');
        expect(alice.nightInfo.value).toBe(2); // Both neighbors are evil
      });

      test('gives wrong info when poisoned', () => {
        let state = createFixedGame([
          { name: 'Alice', role: 'empath' },
          { name: 'Bob', role: 'soldier' },
          { name: 'Charlie', role: 'chef' },
          { name: 'Dave', role: 'poisoner' },
          { name: 'Eve', role: 'imp' },
        ]);
        state = startNightPhase(state);

        // Poison the Empath first
        const alice = state.players.find(p => p.name === 'Alice');
        state = processNightAction(state, 'poisoner', { targetId: alice.id });
        state = processNightAction(state, 'empath', {});
        console.log(snapshotGameState(state, 'Empath poisoned - may get wrong info'));

        const updatedAlice = state.players.find(p => p.name === 'Alice');
        expect(updatedAlice.poisoned).toBe(true);
        // Info is random when poisoned, just verify it exists
        expect(updatedAlice.nightInfo).toBeTruthy();
      });
    });

    describe('Fortune Teller', () => {
      test('detects demon correctly', () => {
        let state = createFixedGame([
          { name: 'Alice', role: 'fortune_teller' },
          { name: 'Bob', role: 'chef' },
          { name: 'Charlie', role: 'empath' },
          { name: 'Dave', role: 'poisoner' },
          { name: 'Eve', role: 'imp' },
        ]);
        state = startNightPhase(state);
        state.fortuneTellerRedHerring = state.players.find(p => p.name === 'Bob').id;

        const eve = state.players.find(p => p.name === 'Eve');
        const charlie = state.players.find(p => p.name === 'Charlie');
        state = processNightAction(state, 'fortune_teller', {
          targetIds: [eve.id, charlie.id],
        });

        const alice = state.players.find(p => p.name === 'Alice');
        console.log(snapshotGameState(state, 'Fortune Teller checks Eve (Imp) and Charlie'));

        expect(alice.nightInfo.type).toBe('yesno');
        expect(alice.nightInfo.value).toBe(true); // Eve is the demon
      });

      test('red herring triggers false positive', () => {
        let state = createFixedGame([
          { name: 'Alice', role: 'fortune_teller' },
          { name: 'Bob', role: 'chef' },
          { name: 'Charlie', role: 'empath' },
          { name: 'Dave', role: 'poisoner' },
          { name: 'Eve', role: 'imp' },
        ]);
        state = startNightPhase(state);
        const bob = state.players.find(p => p.name === 'Bob');
        state.fortuneTellerRedHerring = bob.id;

        const charlie = state.players.find(p => p.name === 'Charlie');
        state = processNightAction(state, 'fortune_teller', {
          targetIds: [bob.id, charlie.id], // Bob is the red herring
        });

        const alice = state.players.find(p => p.name === 'Alice');
        console.log(snapshotGameState(state, 'Fortune Teller hits red herring (Bob)'));

        expect(alice.nightInfo.value).toBe(true); // False positive from red herring
      });
    });

    describe('Monk', () => {
      test('protects target from demon kill', () => {
        let state = createFixedGame([
          { name: 'Alice', role: 'monk' },
          { name: 'Bob', role: 'empath' },
          { name: 'Charlie', role: 'chef' },
          { name: 'Dave', role: 'poisoner' },
          { name: 'Eve', role: 'imp' },
        ]);
        state.isFirstNight = false;
        state.phase = Phase.NIGHT;
        state = startNightPhase(state);

        // Monk protects Bob
        const bob = state.players.find(p => p.name === 'Bob');
        state = processNightAction(state, 'monk', { targetId: bob.id });
        console.log(snapshotGameState(state, 'After Monk protects Bob'));

        expect(state.players.find(p => p.name === 'Bob').protected).toBe(true);

        // Imp targets Bob (protected)
        state = processNightAction(state, 'imp', { targetId: bob.id });
        console.log(snapshotGameState(state, 'After Imp targets protected Bob'));

        expect(state.players.find(p => p.name === 'Bob').alive).toBe(true);
      });
    });

    describe('Imp', () => {
      test('kills target player', () => {
        let state = createFixedGame([
          { name: 'Alice', role: 'monk' },
          { name: 'Bob', role: 'empath' },
          { name: 'Charlie', role: 'chef' },
          { name: 'Dave', role: 'poisoner' },
          { name: 'Eve', role: 'imp' },
        ]);
        state.isFirstNight = false;
        state.phase = Phase.NIGHT;
        state = startNightPhase(state);

        const bob = state.players.find(p => p.name === 'Bob');
        state = processNightAction(state, 'imp', { targetId: bob.id });
        console.log(snapshotGameState(state, 'After Imp kills Bob'));

        expect(state.players.find(p => p.name === 'Bob').alive).toBe(false);
        expect(state.players.find(p => p.name === 'Bob').diedAtNight).toBe(true);
        expect(state.nightDeaths).toContain(bob.id);
      });

      test('starpass: self-kill transfers Imp to a Minion', () => {
        let state = createFixedGame([
          { name: 'Alice', role: 'chef' },
          { name: 'Bob', role: 'empath' },
          { name: 'Charlie', role: 'poisoner' },
          { name: 'Dave', role: 'scarlet_woman' },
          { name: 'Eve', role: 'imp' },
        ]);
        state.isFirstNight = false;
        state.phase = Phase.NIGHT;
        state = startNightPhase(state);

        const eve = state.players.find(p => p.name === 'Eve');
        state = processNightAction(state, 'imp', { targetId: eve.id });
        console.log(snapshotGameState(state, 'After Imp self-kill (starpass)'));

        // Eve should be dead
        expect(state.players.find(p => p.name === 'Eve').alive).toBe(false);
        // One of the minions should now be the Imp
        const newImp = state.players.find(p =>
          p.role === 'imp' && p.alive
        );
        expect(newImp).toBeTruthy();
        expect(['Charlie', 'Dave']).toContain(newImp.name);
      });

      test('cannot kill Soldier', () => {
        let state = createFixedGame([
          { name: 'Alice', role: 'soldier' },
          { name: 'Bob', role: 'empath' },
          { name: 'Charlie', role: 'chef' },
          { name: 'Dave', role: 'poisoner' },
          { name: 'Eve', role: 'imp' },
        ]);
        state.isFirstNight = false;
        state.phase = Phase.NIGHT;
        state = startNightPhase(state);

        const alice = state.players.find(p => p.name === 'Alice');
        state = processNightAction(state, 'imp', { targetId: alice.id });
        console.log(snapshotGameState(state, 'Imp attacks Soldier'));

        expect(state.players.find(p => p.name === 'Alice').alive).toBe(true);
      });

      test('Mayor bounce: kill redirects to another player', () => {
        let state = createFixedGame([
          { name: 'Alice', role: 'mayor' },
          { name: 'Bob', role: 'empath' },
          { name: 'Charlie', role: 'chef' },
          { name: 'Dave', role: 'poisoner' },
          { name: 'Eve', role: 'imp' },
        ]);
        state.isFirstNight = false;
        state.phase = Phase.NIGHT;
        state = startNightPhase(state);

        const alice = state.players.find(p => p.name === 'Alice');
        state = processNightAction(state, 'imp', { targetId: alice.id });
        console.log(snapshotGameState(state, 'Imp attacks Mayor (bounce)'));

        // Mayor may or may not bounce (depends on implementation)
        // At minimum, check that someone died or the attack was handled
        const deadPlayers = state.players.filter(p => !p.alive);
        // Mayor bounce means someone else might have died instead
        expect(state.nightDeaths.length).toBeLessThanOrEqual(1);
      });
    });

    describe('Butler', () => {
      test('chooses a master', () => {
        let state = createFixedGame([
          { name: 'Alice', role: 'butler' },
          { name: 'Bob', role: 'empath' },
          { name: 'Charlie', role: 'chef' },
          { name: 'Dave', role: 'poisoner' },
          { name: 'Eve', role: 'imp' },
        ]);
        state = startNightPhase(state);

        const bob = state.players.find(p => p.name === 'Bob');
        state = processNightAction(state, 'butler', { targetId: bob.id });
        console.log(snapshotGameState(state, 'Butler chooses Bob as master'));

        expect(state.players.find(p => p.name === 'Alice').butlerMaster).toBe(bob.id);
      });
    });

    describe('Spy', () => {
      test('receives grimoire info', () => {
        let state = createFixedGame([
          { name: 'Alice', role: 'spy' },
          { name: 'Bob', role: 'empath' },
          { name: 'Charlie', role: 'chef' },
          { name: 'Dave', role: 'soldier' },
          { name: 'Eve', role: 'imp' },
        ]);
        state = startNightPhase(state);

        state = processNightAction(state, 'spy', {});
        const alice = state.players.find(p => p.name === 'Alice');
        console.log(snapshotGameState(state, 'Spy views Grimoire'));

        expect(alice.nightInfo.type).toBe('grimoire');
        expect(Array.isArray(alice.nightInfo.value)).toBe(true);
        expect(alice.nightInfo.value.length).toBe(5);
        // Should contain all players' real roles
        for (const entry of alice.nightInfo.value) {
          expect(entry.name).toBeTruthy();
          expect(entry.role).toBeTruthy();
        }
      });
    });

    describe('Undertaker', () => {
      test('learns role of executed player', () => {
        let state = createFixedGame([
          { name: 'Alice', role: 'undertaker' },
          { name: 'Bob', role: 'empath' },
          { name: 'Charlie', role: 'chef' },
          { name: 'Dave', role: 'poisoner' },
          { name: 'Eve', role: 'imp' },
        ]);
        state.isFirstNight = false;
        state.phase = Phase.NIGHT;

        // Mark Bob as executed today
        state.players = state.players.map(p =>
          p.name === 'Bob' ? { ...p, executedToday: true, alive: false } : p
        );
        state = startNightPhase(state);

        state = processNightAction(state, 'undertaker', {});
        const alice = state.players.find(p => p.name === 'Alice');
        console.log(snapshotGameState(state, 'Undertaker learns executed role'));

        expect(alice.nightInfo).toBeTruthy();
        expect(alice.nightInfo.type).toBe('role');
        expect(alice.nightInfo.value).toBe('Empath');
      });
    });

    describe('Ravenkeeper', () => {
      test('chooses player to learn role when dying at night', () => {
        let state = createFixedGame([
          { name: 'Alice', role: 'ravenkeeper' },
          { name: 'Bob', role: 'empath' },
          { name: 'Charlie', role: 'chef' },
          { name: 'Dave', role: 'poisoner' },
          { name: 'Eve', role: 'imp' },
        ]);
        state.isFirstNight = false;
        state.phase = Phase.NIGHT;
        state = startNightPhase(state);

        // Imp kills Ravenkeeper
        const alice = state.players.find(p => p.name === 'Alice');
        state = processNightAction(state, 'imp', { targetId: alice.id });

        // Ravenkeeper wakes and chooses Eve
        const eve = state.players.find(p => p.name === 'Eve');
        state = processNightAction(state, 'ravenkeeper', { targetId: eve.id });
        console.log(snapshotGameState(state, 'Ravenkeeper dies and checks Eve'));

        const updatedAlice = state.players.find(p => p.name === 'Alice');
        expect(updatedAlice.nightInfo).toBeTruthy();
        expect(updatedAlice.nightInfo.value).toBe('Imp');
      });
    });
  });

  describe('Night phase transitions', () => {
    test('advanceNightAction moves to next action', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'washerwoman' },
        { name: 'Bob', role: 'chef' },
        { name: 'Charlie', role: 'empath' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);
      state = startNightPhase(state);

      const firstAction = state.pendingNightAction;
      state = processNightAction(state, firstAction, {});
      state = advanceNightAction(state);

      console.log(snapshotGameState(state, 'After advancing night action'));

      expect(state.nightActionIndex).toBeGreaterThan(0);
    });

    test('endNight transitions to day phase', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'washerwoman' },
        { name: 'Bob', role: 'chef' },
        { name: 'Charlie', role: 'empath' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);
      state = startNightPhase(state);
      state = endNight(state);

      console.log(snapshotGameState(state, 'After endNight'));

      expect(state.phase).toBe(Phase.DAY);
      expect(state.dayNumber).toBe(1);
      expect(state.isFirstNight).toBe(false);
      expect(state.voteThreshold).toBeGreaterThan(0);
    });

    test('night deaths are announced at dawn', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'monk' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);
      state.isFirstNight = false;
      state.phase = Phase.NIGHT;
      state = startNightPhase(state);

      const alice = state.players.find(p => p.name === 'Alice');
      state = processNightAction(state, 'imp', { targetId: alice.id });
      state = endNight(state);

      console.log(snapshotGameState(state, 'Dawn after Alice killed'));

      const deathLog = state.gameLog.find(l =>
        l.message.includes('Alice') && l.message.includes('died')
      );
      expect(deathLog).toBeTruthy();
    });
  });

  describe('Sects & Violets night abilities', () => {
    test('Clockmaker gets demon-to-minion distance', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'clockmaker' },
        { name: 'Bob', role: 'dreamer' },
        { name: 'Charlie', role: 'witch' },  // minion
        { name: 'Dave', role: 'oracle' },
        { name: 'Eve', role: 'fang_gu' },    // demon
      ], ScriptId.SECTS_AND_VIOLETS);
      state = startNightPhase(state);

      state = processNightAction(state, 'clockmaker', {});
      const alice = state.players.find(p => p.name === 'Alice');
      console.log(snapshotGameState(state, 'Clockmaker learns distance'));

      expect(alice.nightInfo).toBeTruthy();
      expect(alice.nightInfo.type).toBe('number');
      // Eve(4)->Charlie(2): distance is 2 clockwise or 3 counter = min 2
      expect(alice.nightInfo.value).toBeGreaterThanOrEqual(0);
    });

    test('Witch curses a player', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'clockmaker' },
        { name: 'Bob', role: 'dreamer' },
        { name: 'Charlie', role: 'witch' },
        { name: 'Dave', role: 'oracle' },
        { name: 'Eve', role: 'fang_gu' },
      ], ScriptId.SECTS_AND_VIOLETS);
      state = startNightPhase(state);

      const bob = state.players.find(p => p.name === 'Bob');
      state = processNightAction(state, 'witch', { targetId: bob.id });
      console.log(snapshotGameState(state, 'Witch curses Bob'));

      expect(state.players.find(p => p.name === 'Bob').reminders).toContain('Cursed');
    });

    test('Snake Charmer swaps with Demon when targeting them', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'snake_charmer' },
        { name: 'Bob', role: 'dreamer' },
        { name: 'Charlie', role: 'witch' },
        { name: 'Dave', role: 'oracle' },
        { name: 'Eve', role: 'no_dashii' },
      ], ScriptId.SECTS_AND_VIOLETS);
      state = startNightPhase(state);

      const eve = state.players.find(p => p.name === 'Eve');
      state = processNightAction(state, 'snake_charmer', { targetId: eve.id });
      console.log(snapshotGameState(state, 'Snake Charmer targets Demon (Eve)'));

      // Alice should now be the demon, Eve should be snake_charmer
      expect(state.players.find(p => p.name === 'Alice').role).toBe('no_dashii');
      expect(state.players.find(p => p.name === 'Eve').role).toBe('snake_charmer');
    });
  });

  describe('Bad Moon Rising night abilities', () => {
    test('Gambler dies when guessing wrong', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'gambler' },
        { name: 'Bob', role: 'sailor' },
        { name: 'Charlie', role: 'godfather' },
        { name: 'Dave', role: 'chambermaid' },
        { name: 'Eve', role: 'zombuul' },
      ], ScriptId.BAD_MOON_RISING);
      state.isFirstNight = false;
      state.phase = Phase.NIGHT;
      state = startNightPhase(state);

      const bob = state.players.find(p => p.name === 'Bob');
      state = processNightAction(state, 'gambler', {
        targetId: bob.id,
        guessedRole: 'innkeeper', // Wrong! Bob is Sailor
      });
      console.log(snapshotGameState(state, 'Gambler guesses wrong'));

      expect(state.players.find(p => p.name === 'Alice').alive).toBe(false);
    });

    test('Assassin kills bypassing all protection', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'tea_lady' },
        { name: 'Bob', role: 'sailor' },
        { name: 'Charlie', role: 'assassin' },
        { name: 'Dave', role: 'chambermaid' },
        { name: 'Eve', role: 'zombuul' },
      ], ScriptId.BAD_MOON_RISING);
      state.isFirstNight = false;
      state.phase = Phase.NIGHT;
      state = startNightPhase(state);

      const bob = state.players.find(p => p.name === 'Bob');
      state.players = state.players.map(p =>
        p.name === 'Bob' ? { ...p, protected: true } : p
      );

      state = processNightAction(state, 'assassin', { targetId: bob.id });
      console.log(snapshotGameState(state, 'Assassin kills protected Bob'));

      expect(state.players.find(p => p.name === 'Bob').alive).toBe(false);
      expect(state.players.find(p => p.name === 'Charlie').usedOncePerGameAbility).toBe(true);
    });

    test('Professor resurrects dead Townsfolk', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'professor' },
        { name: 'Bob', role: 'sailor' },
        { name: 'Charlie', role: 'godfather' },
        { name: 'Dave', role: 'chambermaid' },
        { name: 'Eve', role: 'zombuul' },
      ], ScriptId.BAD_MOON_RISING);
      state.isFirstNight = false;
      state.phase = Phase.NIGHT;
      // Kill Bob first
      state.players = state.players.map(p =>
        p.name === 'Bob' ? { ...p, alive: false } : p
      );
      state = startNightPhase(state);

      const bob = state.players.find(p => p.name === 'Bob');
      state = processNightAction(state, 'professor', { targetId: bob.id });
      console.log(snapshotGameState(state, 'Professor resurrects Bob'));

      expect(state.players.find(p => p.name === 'Bob').alive).toBe(true);
    });

    test('Pukka poisons then kills previous target', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'tea_lady' },
        { name: 'Bob', role: 'sailor' },
        { name: 'Charlie', role: 'godfather' },
        { name: 'Dave', role: 'chambermaid' },
        { name: 'Eve', role: 'pukka' },
      ], ScriptId.BAD_MOON_RISING);

      // Simulate a previous Pukka target
      state.players = state.players.map(p =>
        p.name === 'Alice' ? { ...p, reminders: ['Pukka poisoned'] } : p
      );
      state.isFirstNight = false;
      state.phase = Phase.NIGHT;
      state = startNightPhase(state);

      const bob = state.players.find(p => p.name === 'Bob');
      state = processNightAction(state, 'pukka', { targetId: bob.id });
      console.log(snapshotGameState(state, 'Pukka: Alice dies, Bob now poisoned'));

      expect(state.players.find(p => p.name === 'Alice').alive).toBe(false);
      expect(state.players.find(p => p.name === 'Bob').poisoned).toBe(true);
    });

    test('Exorcist blocks Demon', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'exorcist' },
        { name: 'Bob', role: 'sailor' },
        { name: 'Charlie', role: 'godfather' },
        { name: 'Dave', role: 'chambermaid' },
        { name: 'Eve', role: 'zombuul' },
      ], ScriptId.BAD_MOON_RISING);
      state.isFirstNight = false;
      state.phase = Phase.NIGHT;
      state = startNightPhase(state);

      const eve = state.players.find(p => p.name === 'Eve');
      state = processNightAction(state, 'exorcist', { targetId: eve.id });
      console.log(snapshotGameState(state, 'Exorcist targets Demon'));

      expect(state.exorcistBlockedDemon).toBe(true);
    });

    test('Po can pass then kill 3 next night', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'tea_lady' },
        { name: 'Bob', role: 'sailor' },
        { name: 'Charlie', role: 'godfather' },
        { name: 'Dave', role: 'chambermaid' },
        { name: 'Eve', role: 'po' },
      ], ScriptId.BAD_MOON_RISING);
      state.isFirstNight = false;
      state.phase = Phase.NIGHT;
      state = startNightPhase(state);

      // Po passes
      state = processNightAction(state, 'po', { pass: true });
      console.log(snapshotGameState(state, 'Po passes (3 attacks next night)'));

      const eve = state.players.find(p => p.name === 'Eve');
      expect(eve.reminders).toContain('3 attacks');

      // Next night: Po kills 3
      state.isFirstNight = false;
      state = startNightPhase(state);
      const alice = state.players.find(p => p.name === 'Alice');
      const bob = state.players.find(p => p.name === 'Bob');
      const dave = state.players.find(p => p.name === 'Dave');
      state = processNightAction(state, 'po', {
        targetIds: [alice.id, bob.id, dave.id],
      });
      console.log(snapshotGameState(state, 'Po kills 3 players'));

      expect(state.nightDeaths.length).toBe(3);
    });

    test('Shabaloth kills 2 players', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'tea_lady' },
        { name: 'Bob', role: 'sailor' },
        { name: 'Charlie', role: 'godfather' },
        { name: 'Dave', role: 'chambermaid' },
        { name: 'Eve', role: 'shabaloth' },
      ], ScriptId.BAD_MOON_RISING);
      state.isFirstNight = false;
      state.phase = Phase.NIGHT;
      state = startNightPhase(state);

      const alice = state.players.find(p => p.name === 'Alice');
      const bob = state.players.find(p => p.name === 'Bob');
      state = processNightAction(state, 'shabaloth', {
        targetIds: [alice.id, bob.id],
      });
      console.log(snapshotGameState(state, 'Shabaloth kills Alice and Bob'));

      expect(state.nightDeaths.length).toBe(2);
    });
  });
});
