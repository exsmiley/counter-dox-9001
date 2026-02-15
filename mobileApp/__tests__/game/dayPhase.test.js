import {
  createGame,
  assignRoles,
  startNightPhase,
  endNight,
  nominate,
  castVote,
  resolveVote,
  executePlayer,
  skipExecution,
  useSlayerAbility,
  startNextNight,
  processNightAction,
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
  return state;
}

function setupDay(roleAssignments, scriptId) {
  let state = createFixedGame(roleAssignments, scriptId);
  state.phase = Phase.DAY;
  state.dayNumber = 1;
  state.isFirstNight = false;
  state.voteThreshold = Math.ceil(state.players.filter(p => p.alive).length / 2);
  return state;
}

describe('Day Phase', () => {
  describe('Nominations', () => {
    test('alive player can nominate another alive player', () => {
      let state = setupDay([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      const alice = state.players.find(p => p.name === 'Alice');
      const eve = state.players.find(p => p.name === 'Eve');
      state = nominate(state, alice.id, eve.id);

      console.log(snapshotGameState(state, 'Alice nominates Eve'));

      expect(state.currentNomination).toBeTruthy();
      expect(state.currentNomination.nominatorId).toBe(alice.id);
      expect(state.currentNomination.nomineeId).toBe(eve.id);
      expect(state.phase).toBe(Phase.VOTING);
      expect(state.players.find(p => p.name === 'Alice').hasNominated).toBe(true);
      expect(state.players.find(p => p.name === 'Eve').hasBeenNominated).toBe(true);
    });

    test('player cannot nominate twice per day', () => {
      let state = setupDay([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      const alice = state.players.find(p => p.name === 'Alice');
      const bob = state.players.find(p => p.name === 'Bob');
      const charlie = state.players.find(p => p.name === 'Charlie');

      state = nominate(state, alice.id, bob.id);
      state = resolveVote(state); // resolve first nomination
      state = nominate(state, alice.id, charlie.id); // try again

      console.log(snapshotGameState(state, 'Alice tries to nominate twice'));

      // Second nomination should fail (Alice already nominated)
      expect(state.nominations.length).toBe(1);
    });

    test('dead player cannot nominate', () => {
      let state = setupDay([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      state.players = state.players.map(p =>
        p.name === 'Alice' ? { ...p, alive: false } : p
      );

      const alice = state.players.find(p => p.name === 'Alice');
      const bob = state.players.find(p => p.name === 'Bob');
      state = nominate(state, alice.id, bob.id);

      console.log(snapshotGameState(state, 'Dead Alice tries to nominate'));

      expect(state.currentNomination).toBeNull();
    });
  });

  describe('Voting', () => {
    test('alive players can vote yes or no', () => {
      let state = setupDay([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      const alice = state.players.find(p => p.name === 'Alice');
      const eve = state.players.find(p => p.name === 'Eve');
      state = nominate(state, alice.id, eve.id);

      // All 5 vote
      for (const p of state.players) {
        state = castVote(state, p.id, p.name !== 'Eve'); // Everyone except Eve votes yes
      }

      console.log(snapshotGameState(state, 'All players voted'));

      expect(state.currentNomination.voteCount).toBe(4); // 4 yes votes
    });

    test('vote passes with majority', () => {
      let state = setupDay([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      const alice = state.players.find(p => p.name === 'Alice');
      const eve = state.players.find(p => p.name === 'Eve');
      state = nominate(state, alice.id, eve.id);

      // 3 yes, 2 no (threshold is 3 for 5 alive)
      state = castVote(state, state.players[0].id, true);
      state = castVote(state, state.players[1].id, true);
      state = castVote(state, state.players[2].id, true);
      state = castVote(state, state.players[3].id, false);
      state = castVote(state, state.players[4].id, false);

      state = resolveVote(state);
      console.log(snapshotGameState(state, 'Vote resolved (3 yes, threshold 3)'));

      expect(state.executionTarget).toBe(eve.id);
    });

    test('vote fails without majority', () => {
      let state = setupDay([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      const alice = state.players.find(p => p.name === 'Alice');
      const eve = state.players.find(p => p.name === 'Eve');
      state = nominate(state, alice.id, eve.id);

      // 2 yes, 3 no
      state = castVote(state, state.players[0].id, true);
      state = castVote(state, state.players[1].id, true);
      state = castVote(state, state.players[2].id, false);
      state = castVote(state, state.players[3].id, false);
      state = castVote(state, state.players[4].id, false);

      state = resolveVote(state);
      console.log(snapshotGameState(state, 'Vote fails (2 yes, threshold 3)'));

      expect(state.executionTarget).toBeNull();
    });

    test('dead player ghost vote works once', () => {
      let state = setupDay([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      // Alice is dead
      state.players = state.players.map(p =>
        p.name === 'Alice' ? { ...p, alive: false } : p
      );
      state.voteThreshold = Math.ceil(state.players.filter(p => p.alive).length / 2); // 2

      const bob = state.players.find(p => p.name === 'Bob');
      const eve = state.players.find(p => p.name === 'Eve');
      state = nominate(state, bob.id, eve.id);

      // Dead Alice uses ghost vote
      const alice = state.players.find(p => p.name === 'Alice');
      state = castVote(state, alice.id, true);

      console.log(snapshotGameState(state, 'Dead Alice uses ghost vote'));

      expect(state.players.find(p => p.name === 'Alice').ghostVoteUsed).toBe(true);
      expect(state.currentNomination.voteCount).toBe(1);
    });

    test('dead player cannot vote after ghost vote used', () => {
      let state = setupDay([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      state.players = state.players.map(p =>
        p.name === 'Alice' ? { ...p, alive: false, ghostVoteUsed: true } : p
      );

      const bob = state.players.find(p => p.name === 'Bob');
      const eve = state.players.find(p => p.name === 'Eve');
      state = nominate(state, bob.id, eve.id);

      const alice = state.players.find(p => p.name === 'Alice');
      state = castVote(state, alice.id, true);

      console.log(snapshotGameState(state, 'Dead Alice tries to vote again (ghost used)'));

      expect(state.currentNomination.votes[alice.id]).toBeUndefined();
    });

    test('Butler can only vote when master votes', () => {
      let state = setupDay([
        { name: 'Alice', role: 'butler' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      // Alice's master is Bob
      const bob = state.players.find(p => p.name === 'Bob');
      state.players = state.players.map(p =>
        p.name === 'Alice' ? { ...p, butlerMaster: bob.id } : p
      );

      const charlie = state.players.find(p => p.name === 'Charlie');
      const dave = state.players.find(p => p.name === 'Dave');
      state = nominate(state, charlie.id, dave.id);

      // Alice tries to vote before master
      const alice = state.players.find(p => p.name === 'Alice');
      state = castVote(state, alice.id, true);

      console.log(snapshotGameState(state, 'Butler tries voting before master'));

      // Butler's vote should not register (master hasn't voted yes)
      expect(state.currentNomination.votes[alice.id]).toBeUndefined();
    });

    test('higher vote count overrides previous execution target', () => {
      let state = setupDay([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
        { name: 'Frank', role: 'fortune_teller' },
        { name: 'Grace', role: 'monk' },
      ]);

      // First nomination: 4 votes for Bob
      const alice = state.players.find(p => p.name === 'Alice');
      const bob = state.players.find(p => p.name === 'Bob');
      state = nominate(state, alice.id, bob.id);
      for (let i = 0; i < 4; i++) state = castVote(state, state.players[i].id, true);
      for (let i = 4; i < 7; i++) state = castVote(state, state.players[i].id, false);
      state = resolveVote(state);

      console.log(snapshotGameState(state, 'First nomination: 4 votes for Bob'));
      expect(state.executionTarget).toBe(bob.id);

      // Second nomination: 5 votes for Eve
      const charlie = state.players.find(p => p.name === 'Charlie');
      const eve = state.players.find(p => p.name === 'Eve');
      state = nominate(state, charlie.id, eve.id);
      for (let i = 0; i < 5; i++) state = castVote(state, state.players[i].id, true);
      for (let i = 5; i < 7; i++) state = castVote(state, state.players[i].id, false);
      state = resolveVote(state);

      console.log(snapshotGameState(state, 'Second nomination: 5 votes for Eve (overrides)'));
      expect(state.executionTarget).toBe(eve.id);
    });
  });

  describe('Execution', () => {
    test('executing a player kills them', () => {
      let state = setupDay([
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
      console.log(snapshotGameState(state, 'Eve executed'));

      expect(state.players.find(p => p.name === 'Eve').alive).toBe(false);
      expect(state.players.find(p => p.name === 'Eve').executedToday).toBe(true);
      expect(state.executionTarget).toBeNull();
    });

    test('executing Demon triggers good win', () => {
      let state = setupDay([
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
      console.log(snapshotGameState(state, 'Demon executed - Good wins'));

      expect(state.winner).toBe(Team.GOOD);
      expect(state.phase).toBe(Phase.GAME_OVER);
    });

    test('skipExecution with no execution target does nothing special', () => {
      let state = setupDay([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      state = skipExecution(state);
      console.log(snapshotGameState(state, 'Skip execution'));

      expect(state.winner).toBeNull();
    });
  });

  describe('Virgin ability', () => {
    test('Townsfolk nominating Virgin is executed immediately', () => {
      let state = setupDay([
        { name: 'Alice', role: 'empath' },
        { name: 'Bob', role: 'virgin' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      const alice = state.players.find(p => p.name === 'Alice');
      const bob = state.players.find(p => p.name === 'Bob');
      state = nominate(state, alice.id, bob.id);

      console.log(snapshotGameState(state, 'Townsfolk (Alice) nominates Virgin (Bob)'));

      // Alice (Townsfolk) should die
      expect(state.players.find(p => p.name === 'Alice').alive).toBe(false);
      expect(state.players.find(p => p.name === 'Alice').executedToday).toBe(true);
    });
  });

  describe('Slayer ability', () => {
    test('Slayer kills Demon', () => {
      let state = setupDay([
        { name: 'Alice', role: 'slayer' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      const alice = state.players.find(p => p.name === 'Alice');
      const eve = state.players.find(p => p.name === 'Eve');
      state = useSlayerAbility(state, alice.id, eve.id);

      console.log(snapshotGameState(state, 'Slayer targets Demon'));

      expect(state.players.find(p => p.name === 'Eve').alive).toBe(false);
      expect(state.players.find(p => p.name === 'Alice').usedOncePerGameAbility).toBe(true);
    });

    test('Slayer does nothing to non-Demon', () => {
      let state = setupDay([
        { name: 'Alice', role: 'slayer' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      const alice = state.players.find(p => p.name === 'Alice');
      const bob = state.players.find(p => p.name === 'Bob');
      state = useSlayerAbility(state, alice.id, bob.id);

      console.log(snapshotGameState(state, 'Slayer targets non-Demon'));

      expect(state.players.find(p => p.name === 'Bob').alive).toBe(true);
      expect(state.players.find(p => p.name === 'Alice').usedOncePerGameAbility).toBe(true);
    });

    test('Slayer cannot use ability twice', () => {
      let state = setupDay([
        { name: 'Alice', role: 'slayer' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      const alice = state.players.find(p => p.name === 'Alice');
      const bob = state.players.find(p => p.name === 'Bob');
      const eve = state.players.find(p => p.name === 'Eve');

      state = useSlayerAbility(state, alice.id, bob.id); // miss
      state = useSlayerAbility(state, alice.id, eve.id); // try again

      console.log(snapshotGameState(state, 'Slayer tries to use ability twice'));

      expect(state.players.find(p => p.name === 'Eve').alive).toBe(true); // second use fails
    });
  });

  describe('Saint execution', () => {
    test('executing Saint causes Evil to win', () => {
      let state = setupDay([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'saint' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);

      const bob = state.players.find(p => p.name === 'Bob');
      state.executionTarget = bob.id;
      state.executionVotes = 3;

      state = executePlayer(state);
      console.log(snapshotGameState(state, 'Saint executed - Evil wins'));

      expect(state.winner).toBe(Team.EVIL);
    });
  });

  describe('Scarlet Woman', () => {
    test('becomes Demon when Demon is executed with 5+ alive after execution', () => {
      let state = setupDay([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'scarlet_woman' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
        { name: 'Frank', role: 'monk' },
      ]);

      const eve = state.players.find(p => p.name === 'Eve');
      state.executionTarget = eve.id;
      state.executionVotes = 3;

      state = executePlayer(state);
      console.log(snapshotGameState(state, 'Demon executed with Scarlet Woman alive (6 players, 5 alive after)'));

      // Scarlet Woman should become the Imp
      expect(state.players.find(p => p.name === 'Charlie').role).toBe('imp');
      // Game should NOT be over
      expect(state.winner).toBeFalsy();
    });
  });

  describe('Day-to-night transitions', () => {
    test('startNextNight transitions correctly', () => {
      let state = setupDay([
        { name: 'Alice', role: 'chef' },
        { name: 'Bob', role: 'empath' },
        { name: 'Charlie', role: 'soldier' },
        { name: 'Dave', role: 'poisoner' },
        { name: 'Eve', role: 'imp' },
      ]);
      state.nightNumber = 1; // Set to 1 (first night was already done)

      state = startNextNight(state);
      console.log(snapshotGameState(state, 'After startNextNight'));

      expect([Phase.NIGHT, Phase.FIRST_NIGHT]).toContain(state.phase);
      expect(state.nightNumber).toBe(2);
    });
  });
});
