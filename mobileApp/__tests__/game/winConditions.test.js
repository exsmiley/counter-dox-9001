import {
  createGame,
  checkWinConditions,
  executePlayer,
  skipExecution,
  processNightAction,
  startNightPhase,
  endNight,
  storytellerKillPlayer,
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
    perceivedRole: roleAssignments[i].role,
  }));
  state.rolesInPlay = roleAssignments.map(r => r.role);
  state.demonBluffs = ['washerwoman', 'librarian', 'chef'];
  state.phase = Phase.DAY;
  state.dayNumber = 1;
  state.isFirstNight = false;
  state.voteThreshold = Math.ceil(state.players.filter(p => p.alive).length / 2);
  return state;
}

describe('Win Conditions', () => {
  describe('Good wins by executing the Demon', () => {
    test('executing the Imp wins for Good', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      const eve = state.players.find(p => p.name === 'Eve');
      state.executionTarget = eve.id;
      state.executionVotes = 3;
      state = executePlayer(state);

      console.log(snapshotGameState(state, 'GOOD WINS: Demon executed'));

      expect(state.winner).toBe(Team.GOOD);
      expect(state.phase).toBe(Phase.GAME_OVER);
    });

    test('executing the Fang Gu wins for Good', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'clockmaker' },
        { name: 'Bob', role: 'dreamer' },
        { name: 'Charlie', role: 'witch' },
        { name: 'Dave', role: 'oracle' },
        { name: 'Eve', role: 'fang_gu' },
      ], ScriptId.SECTS_AND_VIOLETS);

      const eve = state.players.find(p => p.name === 'Eve');
      state.executionTarget = eve.id;
      state.executionVotes = 3;
      state = executePlayer(state);

      console.log(snapshotGameState(state, 'GOOD WINS: Fang Gu executed'));

      expect(state.winner).toBe(Team.GOOD);
    });
  });

  describe('Evil wins when only 2 players remain', () => {
    test('2 players alive with demon = evil wins', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      // Kill everyone except Eve (demon) and Alice
      state.players = state.players.map(p => {
        if (p.name === 'Bob' || p.name === 'Charlie' || p.name === 'Dave') {
          return { ...p, alive: false };
        }
        return p;
      });

      state = checkWinConditions(state);
      console.log(snapshotGameState(state, 'EVIL WINS: Only 2 alive (demon + 1)'));

      expect(state.winner).toBe(Team.EVIL);
      expect(state.phase).toBe(Phase.GAME_OVER);
    });
  });

  describe('Saint execution = Evil wins', () => {
    test('executing Saint causes Evil to win', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'saint' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      const alice = state.players.find(p => p.name === 'Alice');
      state.executionTarget = alice.id;
      state.executionVotes = 3;
      state = executePlayer(state);

      console.log(snapshotGameState(state, 'EVIL WINS: Saint executed'));

      expect(state.winner).toBe(Team.EVIL);
    });

    test('poisoned Saint execution does NOT cause Evil win', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'saint' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      // Poison the Saint
      state.players = state.players.map(p =>
        p.name === 'Alice' ? { ...p, poisoned: true } : p
      );
      const alice = state.players.find(p => p.name === 'Alice');
      state.executionTarget = alice.id;
      state.executionVotes = 3;
      state = executePlayer(state);

      console.log(snapshotGameState(state, 'Poisoned Saint executed - NOT evil win'));

      // Poisoned Saint ability doesn't work, so evil should NOT auto-win
      // The game might still end if other conditions are met
      expect(state.winner).not.toBe(Team.EVIL);
    });
  });

  describe('Mayor victory', () => {
    test('3 alive + no execution + Mayor = Good wins', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'mayor' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'poisoner' },
        { name: 'Dave', role: 'soldier' },
        { name: 'Eve', role: 'imp' },
      ]);

      // Kill Dave and Bob, leaving 3 alive
      state.players = state.players.map(p => {
        if (p.name === 'Bob' || p.name === 'Dave') return { ...p, alive: false };
        return p;
      });

      state = skipExecution(state);
      console.log(snapshotGameState(state, 'GOOD WINS: Mayor victory (3 alive, no execution)'));

      expect(state.winner).toBe(Team.GOOD);
    });

    test('poisoned Mayor does not trigger victory', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'mayor' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'poisoner' },
        { name: 'Dave', role: 'soldier' },
        { name: 'Eve', role: 'imp' },
      ]);

      state.players = state.players.map(p => {
        if (p.name === 'Bob' || p.name === 'Dave') return { ...p, alive: false };
        if (p.name === 'Alice') return { ...p, poisoned: true };
        return p;
      });

      state = skipExecution(state);
      console.log(snapshotGameState(state, 'Poisoned Mayor: no victory'));

      expect(state.winner).not.toBe(Team.GOOD);
    });
  });

  describe('Vortox no-execution loss', () => {
    test('no execution with Vortox alive = Evil wins', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'clockmaker' },
        { name: 'Bob', role: 'dreamer' },
        { name: 'Charlie', role: 'witch' },
        { name: 'Dave', role: 'oracle' },
        { name: 'Eve', role: 'vortox' },
      ], ScriptId.SECTS_AND_VIOLETS);

      state = skipExecution(state);
      console.log(snapshotGameState(state, 'EVIL WINS: Vortox no-execution'));

      expect(state.winner).toBe(Team.EVIL);
    });
  });

  describe('Scarlet Woman demon takeover', () => {
    test('Scarlet Woman becomes Demon, preventing good win (5+ alive after execution)', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'scarlet_woman' },
        { name: 'Dave', role: 'soldier' },
        { name: 'Eve', role: 'imp' },
        { name: 'Frank', role: 'monk' },
      ]);

      const eve = state.players.find(p => p.name === 'Eve');
      state.executionTarget = eve.id;
      state.executionVotes = 3;
      state = executePlayer(state);

      console.log(snapshotGameState(state, 'Scarlet Woman takeover (5 alive after execution)'));

      expect(state.winner).toBeFalsy(); // Game continues
      expect(state.players.find(p => p.name === 'Charlie').role).toBe('imp');
    });

    test('Scarlet Woman does NOT take over with fewer than 5 alive', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'scarlet_woman' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      // Kill Alice and Charlie first (3 alive: Bob, Dave, Eve)
      state.players = state.players.map(p => {
        if (p.name === 'Alice' || p.name === 'Charlie') return { ...p, alive: false };
        return p;
      });
      state.voteThreshold = 2;

      const eve = state.players.find(p => p.name === 'Eve');
      state.executionTarget = eve.id;
      state.executionVotes = 2;
      state = executePlayer(state);

      console.log(snapshotGameState(state, 'Scarlet Woman with <5 alive: no takeover'));

      // Good should win since Scarlet Woman can't take over with <5 alive
      expect(state.winner).toBe(Team.GOOD);
    });
  });

  describe('Mastermind extra day', () => {
    test('Mastermind grants extra day when Demon dies', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'tea_lady' },
        { name: 'Bob', role: 'sailor' },
        { name: 'Charlie', role: 'mastermind' },
        { name: 'Dave', role: 'chambermaid' },
        { name: 'Eve', role: 'zombuul' },
      ], ScriptId.BAD_MOON_RISING);

      const eve = state.players.find(p => p.name === 'Eve');
      state.executionTarget = eve.id;
      state.executionVotes = 3;
      state = executePlayer(state);

      console.log(snapshotGameState(state, 'Mastermind: extra day after Demon dies'));

      expect(state.mastermindExtraDay).toBe(true);
      expect(state.winner).toBeNull(); // Game continues!
    });
  });

  describe('Storyteller controls', () => {
    test('storyteller can kill a player', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      const bob = state.players.find(p => p.name === 'Bob');
      state = storytellerKillPlayer(state, bob.id);

      console.log(snapshotGameState(state, 'Storyteller kills Bob'));

      expect(state.players.find(p => p.name === 'Bob').alive).toBe(false);
    });

    test('storyteller can declare winner', () => {
      let state = createFixedGame([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      state = storytellerDeclareWinner(state, Team.GOOD);

      console.log(snapshotGameState(state, 'Storyteller declares Good wins'));

      expect(state.winner).toBe(Team.GOOD);
      expect(state.phase).toBe(Phase.GAME_OVER);
    });
  });
});
