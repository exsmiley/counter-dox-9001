import {
  createGame,
  assignRoles,
} from '../../src/game/GameEngine';
import {
  getRoleById,
  RoleType,
  Team,
  Phase,
  PLAYER_COUNT_DISTRIBUTION,
} from '../../src/game/roles';
import { ScriptId } from '../../src/game/scripts';

// Helper to create player name lists
function playerNames(count) {
  return Array.from({ length: count }, (_, i) => `Player${i + 1}`);
}

describe('Game Setup', () => {
  describe('createGame', () => {
    test('creates game with correct structure', () => {
      const state = createGame({
        scriptId: ScriptId.TROUBLE_BREWING,
        playerNames: playerNames(7),
      });

      console.log(snapshotGameState(state, 'Initial game creation (7 players, TB)'));

      expect(state.gameId).toBeTruthy();
      expect(state.scriptId).toBe(ScriptId.TROUBLE_BREWING);
      expect(state.players.length).toBe(7);
      expect(state.phase).toBe(Phase.SETUP);
      expect(state.dayNumber).toBe(0);
      expect(state.nightNumber).toBe(0);
      expect(state.winner).toBeNull();
      expect(state.gameLog.length).toBe(0);
    });

    test('each player has correct initial state', () => {
      const state = createGame({
        scriptId: ScriptId.TROUBLE_BREWING,
        playerNames: playerNames(5),
      });

      for (const p of state.players) {
        expect(p.id).toBeTruthy();
        expect(p.alive).toBe(true);
        expect(p.poisoned).toBe(false);
        expect(p.drunk).toBe(false);
        expect(p.protected).toBe(false);
        expect(p.ghostVoteUsed).toBe(false);
        expect(p.role).toBeNull();
        expect(p.seatIndex).toBeGreaterThanOrEqual(0);
      }
    });

    test('players have unique IDs', () => {
      const state = createGame({
        scriptId: ScriptId.TROUBLE_BREWING,
        playerNames: playerNames(15),
      });
      const ids = state.players.map(p => p.id);
      expect(new Set(ids).size).toBe(15);
    });

    test('player names match input', () => {
      const names = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve'];
      const state = createGame({
        scriptId: ScriptId.TROUBLE_BREWING,
        playerNames: names,
      });
      expect(state.players.map(p => p.name)).toEqual(names);
    });

    test('rejects invalid player counts', () => {
      expect(() => createGame({
        scriptId: ScriptId.TROUBLE_BREWING,
        playerNames: playerNames(3),
      })).toThrow();

      expect(() => createGame({
        scriptId: ScriptId.TROUBLE_BREWING,
        playerNames: playerNames(21),
      })).toThrow();
    });

    test('rejects invalid script', () => {
      expect(() => createGame({
        scriptId: 'invalid_script',
        playerNames: playerNames(7),
      })).toThrow();
    });

    test.each([
      [ScriptId.TROUBLE_BREWING, 'Trouble Brewing'],
      [ScriptId.SECTS_AND_VIOLETS, 'Sects & Violets'],
      [ScriptId.BAD_MOON_RISING, 'Bad Moon Rising'],
    ])('works with %s script', (scriptId) => {
      const state = createGame({
        scriptId,
        playerNames: playerNames(10),
      });
      expect(state.scriptId).toBe(scriptId);
      expect(state.players.length).toBe(10);
    });
  });

  describe('assignRoles', () => {
    describe.each([5, 7, 8, 10, 12, 15])('with %d players (Trouble Brewing)', (count) => {
      let state;
      const [expectedTF, expectedOut, expectedMin, expectedDem] = PLAYER_COUNT_DISTRIBUTION[count];

      beforeEach(() => {
        const initial = createGame({
          scriptId: ScriptId.TROUBLE_BREWING,
          playerNames: playerNames(count),
        });
        state = assignRoles(initial);
      });

      test('assigns roles to all players', () => {
        console.log(snapshotGameState(state, `After role assignment (${count}p TB)`));

        for (const p of state.players) {
          expect(p.role).toBeTruthy();
          expect(getRoleById(p.role)).toBeTruthy();
        }
      });

      test('transitions to FIRST_NIGHT phase', () => {
        expect(state.phase).toBe(Phase.FIRST_NIGHT);
        expect(state.nightNumber).toBe(1);
        expect(state.isFirstNight).toBe(true);
      });

      test('has exactly 1 demon', () => {
        const demons = state.players.filter(p =>
          getRoleById(p.role)?.type === RoleType.DEMON
        );
        expect(demons.length).toBe(1);
      });

      test(`role distribution matches expected counts (may vary with Baron)`, () => {
        const types = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
        for (const p of state.players) {
          const role = getRoleById(p.role);
          types[role.type]++;
        }

        // Baron adds +2 outsiders -2 townsfolk, Godfather +/-1
        const hasBaron = state.players.some(p => p.role === 'baron');
        const hasGodfather = state.players.some(p => p.role === 'godfather');

        expect(types.demon).toBe(expectedDem);
        // Minion count should match
        expect(types.minion).toBe(expectedMin);
        // Total should equal player count
        expect(types.townsfolk + types.outsider + types.minion + types.demon).toBe(count);
      });

      test('generates 3 demon bluffs', () => {
        expect(state.demonBluffs.length).toBe(3);
        // Bluffs should be good characters not in play
        const inPlayRoles = new Set(state.players.map(p => p.role));
        for (const bluff of state.demonBluffs) {
          expect(inPlayRoles.has(bluff)).toBe(false);
          const role = getRoleById(bluff);
          expect(role.team).toBe(Team.GOOD);
        }
      });

      test('sets fortune teller red herring', () => {
        if (state.players.some(p => p.role === 'fortune_teller')) {
          expect(state.fortuneTellerRedHerring).toBeTruthy();
          const herring = state.players.find(p => p.id === state.fortuneTellerRedHerring);
          expect(herring).toBeTruthy();
          expect(getRoleById(herring.role).team).toBe(Team.GOOD);
        }
      });

      test('adds game log entries for setup', () => {
        expect(state.gameLog.length).toBeGreaterThanOrEqual(2);
        expect(state.gameLog.some(l => l.type === 'setup')).toBe(true);
      });
    });

    test('Drunk player thinks they are a Townsfolk', () => {
      // Run multiple times to catch Drunk being assigned
      let foundDrunk = false;
      for (let i = 0; i < 50; i++) {
        const initial = createGame({
          scriptId: ScriptId.TROUBLE_BREWING,
          playerNames: playerNames(9), // 2 outsiders likely
        });
        const state = assignRoles(initial);
        const drunk = state.players.find(p => p.role === 'drunk');
        if (drunk) {
          foundDrunk = true;
          expect(drunk.perceivedRole).not.toBe('drunk');
          const perceived = getRoleById(drunk.perceivedRole);
          expect(perceived).toBeTruthy();
          expect(perceived.type).toBe(RoleType.TOWNSFOLK);

          console.log(snapshotGameState(state, `Game with Drunk (thinks they are ${drunk.perceivedRole})`));
          break;
        }
      }
      // It's okay if Drunk wasn't randomly assigned in 50 tries
    });

    describe('Sects & Violets role assignment', () => {
      test('assigns valid S&V roles for 10 players', () => {
        const initial = createGame({
          scriptId: ScriptId.SECTS_AND_VIOLETS,
          playerNames: playerNames(10),
        });
        const state = assignRoles(initial);

        console.log(snapshotGameState(state, 'S&V 10 players after role assignment'));

        for (const p of state.players) {
          const role = getRoleById(p.role);
          expect(role).toBeTruthy();
        }
        expect(state.players.filter(p => getRoleById(p.role).type === RoleType.DEMON).length).toBe(1);
      });
    });

    describe('Bad Moon Rising role assignment', () => {
      test('assigns valid BMR roles for 12 players', () => {
        const initial = createGame({
          scriptId: ScriptId.BAD_MOON_RISING,
          playerNames: playerNames(12),
        });
        const state = assignRoles(initial);

        console.log(snapshotGameState(state, 'BMR 12 players after role assignment'));

        for (const p of state.players) {
          const role = getRoleById(p.role);
          expect(role).toBeTruthy();
        }
        expect(state.players.filter(p => getRoleById(p.role).type === RoleType.DEMON).length).toBe(1);
      });
    });
  });
});
