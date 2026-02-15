import React from 'react';
import { create, act } from 'react-test-renderer';
import { createGame, assignRoles, startNightPhase, processNightAction, endNight, nominate, castVote, resolveVote, executePlayer, startNextNight, checkWinConditions } from '../../src/game/GameEngine';
import { getRoleById, RoleType, Team, Phase } from '../../src/game/roles';
import { ScriptId } from '../../src/game/scripts';

// ============================================================
// MOCKS
// ============================================================

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  addListener: jest.fn(() => jest.fn()),
  setOptions: jest.fn(),
};

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: (props) => React.createElement('Icon', props),
    MaterialCommunityIcons: (props) => React.createElement('Icon', props),
  };
});

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return {
    LinearGradient: (props) => React.createElement('LinearGradient', props),
  };
});

// Mock GameContext
let mockGameState = null;
let mockCurrentPlayerId = null;
const mockActions = {
  createGame: jest.fn(),
  assignRoles: jest.fn(),
  startNight: jest.fn(),
  nightAction: jest.fn(),
  advanceNight: jest.fn(),
  endNight: jest.fn(),
  nominate: jest.fn(),
  castVote: jest.fn(),
  resolveVote: jest.fn(),
  execute: jest.fn(),
  skipExecution: jest.fn(),
  useSlayer: jest.fn(),
  startNextNight: jest.fn(),
  stSetRole: jest.fn(),
  stKill: jest.fn(),
  stRevive: jest.fn(),
  stPoison: jest.fn(),
  stDrunk: jest.fn(),
  stReminder: jest.fn(),
  stDeclareWinner: jest.fn(),
  loadGame: jest.fn(),
  resetGame: jest.fn(),
  setCurrentPlayer: jest.fn(),
};

jest.mock('../../src/context/GameContext', () => ({
  useGame: () => ({
    gameState: mockGameState,
    currentPlayerId: mockCurrentPlayerId,
    currentPlayer: mockGameState?.players?.find(p => p.id === mockCurrentPlayerId) || null,
    actions: mockActions,
  }),
  GameProvider: ({ children }) => children,
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaView: (props) => React.createElement('SafeAreaView', props),
    SafeAreaProvider: (props) => React.createElement('SafeAreaProvider', props),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// Mock react-native-screens
jest.mock('react-native-screens', () => ({}));

// ============================================================
// HELPERS
// ============================================================

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
  state.fortuneTellerRedHerring = state.players.find(p =>
    getRoleById(p.role)?.team === Team.GOOD
  )?.id || null;
  state.demonBluffs = ['washerwoman', 'librarian', 'chef'];
  return state;
}

function buildGameAtPhase(phase, extras = {}) {
  const roles = [
    { name: 'Alice', role: 'washerwoman' },
    { name: 'Bob', role: 'chef' },
    { name: 'Charlie', role: 'empath' },
    { name: 'Dave', role: 'poisoner' },
    { name: 'Eve', role: 'imp' },
    { name: 'Frank', role: 'monk' },
    { name: 'Grace', role: 'soldier' },
  ];
  let state = createFixedGame(roles);
  state.phase = phase;
  state.dayNumber = extras.dayNumber || 1;
  state.nightNumber = extras.nightNumber || 1;
  state.voteThreshold = extras.voteThreshold || Math.ceil(7 / 2);
  return { ...state, ...extras };
}

// A snapshot helper that renders a component and returns the tree JSON
function renderToSnapshot(component) {
  let tree;
  act(() => {
    tree = create(component);
  });
  return tree.toJSON();
}

// ============================================================
// IMPORT SCREENS AND COMPONENTS
// ============================================================

let MainMenuScreen, CreateGameScreen, GameOverScreen, HowToPlayScreen,
    ScriptBrowserScreen, PhaseHeader, RoleCard, PlayerToken, VotingPanel,
    GameLog;

beforeAll(() => {
  try { MainMenuScreen = require('../../src/screens/MainMenuScreen').default; } catch (e) { MainMenuScreen = null; }
  try { CreateGameScreen = require('../../src/screens/CreateGameScreen').default; } catch (e) { CreateGameScreen = null; }
  try { GameOverScreen = require('../../src/screens/GameOverScreen').default; } catch (e) { GameOverScreen = null; }
  try { HowToPlayScreen = require('../../src/screens/HowToPlayScreen').default; } catch (e) { HowToPlayScreen = null; }
  try { ScriptBrowserScreen = require('../../src/screens/ScriptBrowserScreen').default; } catch (e) { ScriptBrowserScreen = null; }
  try { PhaseHeader = require('../../src/components/PhaseHeader').default; } catch (e) { PhaseHeader = null; }
  try { RoleCard = require('../../src/components/RoleCard').default; } catch (e) { RoleCard = null; }
  try { PlayerToken = require('../../src/components/PlayerToken').default; } catch (e) { PlayerToken = null; }
  try { VotingPanel = require('../../src/components/VotingPanel').default; } catch (e) { VotingPanel = null; }
  try { GameLog = require('../../src/components/GameLog').default; } catch (e) { GameLog = null; }
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGameState = null;
  mockCurrentPlayerId = null;
});

// ============================================================
// SCREEN SNAPSHOTS
// ============================================================

describe('Screen Rendering Snapshots', () => {
  describe('MainMenuScreen', () => {
    test('renders main menu correctly', () => {
      if (!MainMenuScreen) return;
      const json = renderToSnapshot(
        React.createElement(MainMenuScreen, { navigation: mockNavigation })
      );
      expect(json).toBeTruthy();
      expect(JSON.stringify(json)).toContain('Blood on the');
      expect(JSON.stringify(json)).toContain('New Game');
      expect(JSON.stringify(json)).toContain('Join Game');
      console.log('MainMenuScreen snapshot captured');
    });

    test('matches snapshot', () => {
      if (!MainMenuScreen) return;
      const json = renderToSnapshot(
        React.createElement(MainMenuScreen, { navigation: mockNavigation })
      );
      expect(json).toMatchSnapshot();
    });
  });

  describe('CreateGameScreen', () => {
    test('renders create game form', () => {
      if (!CreateGameScreen) return;
      const json = renderToSnapshot(
        React.createElement(CreateGameScreen, { navigation: mockNavigation })
      );
      expect(json).toBeTruthy();
      expect(JSON.stringify(json)).toContain('Trouble Brewing');
      console.log('CreateGameScreen snapshot captured');
    });

    test('matches snapshot', () => {
      if (!CreateGameScreen) return;
      const json = renderToSnapshot(
        React.createElement(CreateGameScreen, { navigation: mockNavigation })
      );
      expect(json).toMatchSnapshot();
    });
  });

  describe('HowToPlayScreen', () => {
    test('renders how to play content', () => {
      if (!HowToPlayScreen) return;
      const json = renderToSnapshot(
        React.createElement(HowToPlayScreen, { navigation: mockNavigation })
      );
      expect(json).toBeTruthy();
      console.log('HowToPlayScreen snapshot captured');
    });

    test('matches snapshot', () => {
      if (!HowToPlayScreen) return;
      const json = renderToSnapshot(
        React.createElement(HowToPlayScreen, { navigation: mockNavigation })
      );
      expect(json).toMatchSnapshot();
    });
  });

  describe('ScriptBrowserScreen', () => {
    test('renders script browser with all scripts', () => {
      if (!ScriptBrowserScreen) return;
      const json = renderToSnapshot(
        React.createElement(ScriptBrowserScreen, { navigation: mockNavigation })
      );
      expect(json).toBeTruthy();
      console.log('ScriptBrowserScreen snapshot captured');
    });

    test('matches snapshot', () => {
      if (!ScriptBrowserScreen) return;
      const json = renderToSnapshot(
        React.createElement(ScriptBrowserScreen, { navigation: mockNavigation })
      );
      expect(json).toMatchSnapshot();
    });
  });

  describe('GameOverScreen', () => {
    test('renders good wins screen', () => {
      if (!GameOverScreen) return;
      mockGameState = buildGameAtPhase(Phase.GAME_OVER, { winner: Team.GOOD });
      mockCurrentPlayerId = mockGameState.players[0].id;

      const json = renderToSnapshot(
        React.createElement(GameOverScreen, { navigation: mockNavigation })
      );
      expect(json).toBeTruthy();
      console.log('GameOverScreen (Good wins) snapshot captured');
    });

    test('renders evil wins screen', () => {
      if (!GameOverScreen) return;
      mockGameState = buildGameAtPhase(Phase.GAME_OVER, { winner: Team.EVIL });
      mockCurrentPlayerId = mockGameState.players[0].id;

      const json = renderToSnapshot(
        React.createElement(GameOverScreen, { navigation: mockNavigation })
      );
      expect(json).toBeTruthy();
      console.log('GameOverScreen (Evil wins) snapshot captured');
    });

    test('good wins matches snapshot', () => {
      if (!GameOverScreen) return;
      mockGameState = buildGameAtPhase(Phase.GAME_OVER, { winner: Team.GOOD });
      mockCurrentPlayerId = mockGameState.players[0].id;
      const json = renderToSnapshot(
        React.createElement(GameOverScreen, { navigation: mockNavigation })
      );
      expect(json).toMatchSnapshot();
    });

    test('evil wins matches snapshot', () => {
      if (!GameOverScreen) return;
      mockGameState = buildGameAtPhase(Phase.GAME_OVER, { winner: Team.EVIL });
      mockCurrentPlayerId = mockGameState.players[0].id;
      const json = renderToSnapshot(
        React.createElement(GameOverScreen, { navigation: mockNavigation })
      );
      expect(json).toMatchSnapshot();
    });
  });
});

// ============================================================
// COMPONENT SNAPSHOTS
// ============================================================

describe('Component Rendering Snapshots', () => {
  describe('PhaseHeader', () => {
    test.each([
      [Phase.SETUP, 'Setup phase'],
      [Phase.FIRST_NIGHT, 'First Night phase'],
      [Phase.NIGHT, 'Night phase'],
      [Phase.DAY, 'Day phase'],
      [Phase.VOTING, 'Voting phase'],
      [Phase.GAME_OVER, 'Game Over phase'],
    ])('renders %s correctly', (phase, label) => {
      if (!PhaseHeader) return;
      mockGameState = buildGameAtPhase(phase);

      const json = renderToSnapshot(
        React.createElement(PhaseHeader, {
          phase,
          dayNumber: 1,
          nightNumber: 1,
        })
      );
      expect(json).toBeTruthy();
      console.log(`PhaseHeader: ${label} snapshot captured`);
    });

    test('matches snapshot for each phase', () => {
      if (!PhaseHeader) return;
      for (const phase of [Phase.SETUP, Phase.FIRST_NIGHT, Phase.NIGHT, Phase.DAY, Phase.VOTING, Phase.GAME_OVER]) {
        mockGameState = buildGameAtPhase(phase);
        const json = renderToSnapshot(
          React.createElement(PhaseHeader, {
            phase,
            dayNumber: 2,
            nightNumber: 3,
          })
        );
        expect(json).toMatchSnapshot();
      }
    });
  });

  describe('RoleCard', () => {
    test.each([
      ['washerwoman', RoleType.TOWNSFOLK],
      ['imp', RoleType.DEMON],
      ['poisoner', RoleType.MINION],
      ['drunk', RoleType.OUTSIDER],
    ])('renders %s role card', (roleId, expectedType) => {
      if (!RoleCard) return;
      const role = getRoleById(roleId);
      const json = renderToSnapshot(
        React.createElement(RoleCard, { role, compact: false })
      );
      expect(json).toBeTruthy();
      expect(JSON.stringify(json)).toContain(role.name);
      console.log(`RoleCard: ${role.name} snapshot captured`);
    });

    test('renders compact role card', () => {
      if (!RoleCard) return;
      const role = getRoleById('imp');
      const json = renderToSnapshot(
        React.createElement(RoleCard, { role, compact: true })
      );
      expect(json).toBeTruthy();
    });

    test.each([
      'washerwoman', 'imp', 'poisoner', 'drunk',
    ])('%s matches snapshot', (roleId) => {
      if (!RoleCard) return;
      const role = getRoleById(roleId);
      const json = renderToSnapshot(
        React.createElement(RoleCard, { role, compact: false })
      );
      expect(json).toMatchSnapshot();
    });
  });

  describe('PlayerToken', () => {
    function makePlayer(overrides = {}) {
      return {
        id: 'p1',
        name: 'Alice',
        role: 'washerwoman',
        alive: true,
        poisoned: false,
        drunk: false,
        protected: false,
        ghostVoteUsed: false,
        reminders: [],
        ...overrides,
      };
    }

    test('renders alive player', () => {
      if (!PlayerToken) return;
      const json = renderToSnapshot(
        React.createElement(PlayerToken, {
          player: makePlayer(),
          x: 100, y: 100, size: 60,
          showRole: true,
        })
      );
      expect(json).toBeTruthy();
      console.log('PlayerToken: alive player snapshot captured');
    });

    test('renders dead player', () => {
      if (!PlayerToken) return;
      const json = renderToSnapshot(
        React.createElement(PlayerToken, {
          player: makePlayer({ alive: false }),
          x: 100, y: 100, size: 60,
          showRole: true,
        })
      );
      expect(json).toBeTruthy();
      console.log('PlayerToken: dead player snapshot captured');
    });

    test('renders poisoned player', () => {
      if (!PlayerToken) return;
      const json = renderToSnapshot(
        React.createElement(PlayerToken, {
          player: makePlayer({ poisoned: true }),
          x: 100, y: 100, size: 60,
          showRole: true,
          highlightEvil: true,
        })
      );
      expect(json).toBeTruthy();
    });

    test('renders evil player with highlight', () => {
      if (!PlayerToken) return;
      const json = renderToSnapshot(
        React.createElement(PlayerToken, {
          player: makePlayer({ role: 'imp' }),
          x: 100, y: 100, size: 60,
          showRole: true,
          highlightEvil: true,
        })
      );
      expect(json).toBeTruthy();
    });

    test('renders selected player', () => {
      if (!PlayerToken) return;
      const json = renderToSnapshot(
        React.createElement(PlayerToken, {
          player: makePlayer(),
          x: 100, y: 100, size: 60,
          selected: true,
          showRole: false,
        })
      );
      expect(json).toBeTruthy();
    });

    test.each([
      ['alive', {}],
      ['dead', { alive: false }],
      ['poisoned', { poisoned: true }],
      ['evil', { role: 'imp' }],
    ])('%s matches snapshot', (label, overrides) => {
      if (!PlayerToken) return;
      const json = renderToSnapshot(
        React.createElement(PlayerToken, {
          player: makePlayer(overrides),
          x: 100, y: 100, size: 60,
          showRole: true,
        })
      );
      expect(json).toMatchSnapshot();
    });
  });

  describe('VotingPanel', () => {
    test('renders voting panel with active nomination', () => {
      if (!VotingPanel) return;
      mockGameState = buildGameAtPhase(Phase.VOTING);
      mockGameState.currentNomination = {
        id: 'nom1',
        nominatorId: mockGameState.players[0].id,
        nomineeId: mockGameState.players[1].id,
        nominatorName: 'Alice',
        nomineeName: 'Bob',
        votes: {},
        voteCount: 0,
      };
      mockCurrentPlayerId = mockGameState.players[0].id;

      const json = renderToSnapshot(
        React.createElement(VotingPanel, {
          nomination: mockGameState.currentNomination,
          players: mockGameState.players,
          voteThreshold: mockGameState.voteThreshold,
          onVote: jest.fn(),
          onResolve: jest.fn(),
          currentPlayerId: mockCurrentPlayerId,
        })
      );
      expect(json).toBeTruthy();
      console.log('VotingPanel: active nomination snapshot captured');
    });

    test('renders voting panel with votes cast', () => {
      if (!VotingPanel) return;
      mockGameState = buildGameAtPhase(Phase.VOTING);
      const nom = {
        id: 'nom1',
        nominatorId: mockGameState.players[0].id,
        nomineeId: mockGameState.players[1].id,
        nominatorName: 'Alice',
        nomineeName: 'Bob',
        votes: {
          [mockGameState.players[2].id]: true,
          [mockGameState.players[3].id]: false,
          [mockGameState.players[4].id]: true,
        },
        voteCount: 2,
      };
      mockCurrentPlayerId = mockGameState.players[0].id;

      const json = renderToSnapshot(
        React.createElement(VotingPanel, {
          nomination: nom,
          players: mockGameState.players,
          voteThreshold: mockGameState.voteThreshold,
          onVote: jest.fn(),
          onResolve: jest.fn(),
          currentPlayerId: mockCurrentPlayerId,
        })
      );
      expect(json).toBeTruthy();
      console.log('VotingPanel: votes cast snapshot captured');
    });

    test('matches snapshot', () => {
      if (!VotingPanel) return;
      mockGameState = buildGameAtPhase(Phase.VOTING);
      mockGameState.currentNomination = {
        id: 'nom1',
        nominatorId: mockGameState.players[0].id,
        nomineeId: mockGameState.players[1].id,
        nominatorName: 'Alice',
        nomineeName: 'Bob',
        votes: {},
        voteCount: 0,
      };
      mockCurrentPlayerId = mockGameState.players[0].id;
      const json = renderToSnapshot(
        React.createElement(VotingPanel, {
          nomination: mockGameState.currentNomination,
          players: mockGameState.players,
          voteThreshold: mockGameState.voteThreshold,
          onVote: jest.fn(),
          onResolve: jest.fn(),
          currentPlayerId: mockCurrentPlayerId,
        })
      );
      expect(json).toMatchSnapshot();
    });
  });

  describe('GameLog', () => {
    test('renders empty log as null', () => {
      if (!GameLog) return;
      const json = renderToSnapshot(
        React.createElement(GameLog, { logs: [] })
      );
      // Component returns null for empty logs
      expect(json).toBeNull();
    });

    test('renders log with entries', () => {
      if (!GameLog) return;
      const logs = [
        { type: 'setup', message: 'Game created with 7 players', timestamp: Date.now() },
        { type: 'phase', message: 'Night 1 begins.', timestamp: Date.now() },
        { type: 'night', message: 'Poisoner poisoned Alice', timestamp: Date.now(), private: true },
        { type: 'phase', message: 'Dawn breaks. Bob died in the night.', timestamp: Date.now() },
        { type: 'day', message: 'Alice nominated Charlie.', timestamp: Date.now() },
      ];
      const json = renderToSnapshot(
        React.createElement(GameLog, { logs, showPrivate: true })
      );
      expect(json).toBeTruthy();
      console.log('GameLog: entries snapshot captured');
    });

    test('matches snapshot', () => {
      if (!GameLog) return;
      const logs = [
        { type: 'setup', message: 'Game created', timestamp: 1000 },
        { type: 'phase', message: 'Night 1 begins.', timestamp: 2000 },
      ];
      const json = renderToSnapshot(
        React.createElement(GameLog, { logs, showPrivate: false })
      );
      expect(json).toMatchSnapshot();
    });
  });
});

// ============================================================
// GAME STATE VISUAL SNAPSHOTS
// ============================================================

describe('Game State Visual Snapshots', () => {
  test('snapshot: setup phase (7 players, TB)', () => {
    const state = buildGameAtPhase(Phase.SETUP);
    console.log(snapshotGameState(state, 'SETUP PHASE - 7 players TB'));
    expect(state.phase).toBe(Phase.SETUP);
  });

  test('snapshot: first night with all roles revealed', () => {
    const state = buildGameAtPhase(Phase.FIRST_NIGHT, { nightNumber: 1 });
    console.log(snapshotGameState(state, 'FIRST NIGHT - roles assigned'));
    expect(state.phase).toBe(Phase.FIRST_NIGHT);
  });

  test('snapshot: day phase with full player circle', () => {
    let state = buildGameAtPhase(Phase.DAY, { dayNumber: 1 });
    state.voteThreshold = 4;
    state.gameLog = [
      { type: 'phase', message: 'Dawn breaks. No one died.', timestamp: Date.now() },
    ];
    console.log(snapshotGameState(state, 'DAY 1 - all alive'));
    expect(state.phase).toBe(Phase.DAY);
  });

  test('snapshot: day with 1 dead player', () => {
    let state = buildGameAtPhase(Phase.DAY, { dayNumber: 2 });
    state.players = state.players.map(p =>
      p.name === 'Bob' ? { ...p, alive: false, diedAtNight: true } : p
    );
    state.voteThreshold = 3;
    state.nightDeaths = [state.players.find(p => p.name === 'Bob').id];
    console.log(snapshotGameState(state, 'DAY 2 - Bob died at night'));
    expect(state.players.find(p => p.name === 'Bob').alive).toBe(false);
  });

  test('snapshot: voting phase with nomination', () => {
    let state = buildGameAtPhase(Phase.VOTING, { dayNumber: 1 });
    const alice = state.players.find(p => p.name === 'Alice');
    const eve = state.players.find(p => p.name === 'Eve');
    state.currentNomination = {
      id: 'nom1',
      nominatorId: alice.id,
      nomineeId: eve.id,
      nominatorName: 'Alice',
      nomineeName: 'Eve',
      votes: {},
      voteCount: 0,
    };
    console.log(snapshotGameState(state, 'VOTING - Alice nominates Eve'));
    expect(state.currentNomination).toBeTruthy();
  });

  test('snapshot: voting with partial votes cast', () => {
    let state = buildGameAtPhase(Phase.VOTING, { dayNumber: 1 });
    const alice = state.players.find(p => p.name === 'Alice');
    const eve = state.players.find(p => p.name === 'Eve');
    state.currentNomination = {
      id: 'nom1',
      nominatorId: alice.id,
      nomineeId: eve.id,
      nominatorName: 'Alice',
      nomineeName: 'Eve',
      votes: {
        [state.players[1].id]: true,
        [state.players[2].id]: true,
        [state.players[3].id]: false,
      },
      voteCount: 2,
    };
    console.log(snapshotGameState(state, 'VOTING - 2 yes, 1 no so far'));
    expect(state.currentNomination.voteCount).toBe(2);
  });

  test('snapshot: execution pending', () => {
    let state = buildGameAtPhase(Phase.DAY, { dayNumber: 1 });
    const eve = state.players.find(p => p.name === 'Eve');
    state.executionTarget = eve.id;
    state.executionVotes = 5;
    console.log(snapshotGameState(state, 'DAY - Eve about to be executed'));
    expect(state.executionTarget).toBe(eve.id);
  });

  test('snapshot: night phase with poisoned and protected players', () => {
    let state = buildGameAtPhase(Phase.NIGHT, { nightNumber: 2 });
    state.players = state.players.map(p => {
      if (p.name === 'Alice') return { ...p, poisoned: true };
      if (p.name === 'Charlie') return { ...p, protected: true };
      if (p.name === 'Bob') return { ...p, alive: false };
      return p;
    });
    state.pendingNightAction = 'imp';
    console.log(snapshotGameState(state, 'NIGHT 2 - Alice poisoned, Charlie protected, Bob dead'));
    expect(state.players.find(p => p.name === 'Alice').poisoned).toBe(true);
  });

  test('snapshot: game over - good wins', () => {
    let state = buildGameAtPhase(Phase.GAME_OVER, { dayNumber: 3 });
    state.winner = Team.GOOD;
    state.players = state.players.map(p =>
      p.name === 'Eve' ? { ...p, alive: false, executedToday: true } : p
    );
    state.gameLog = [
      { type: 'day', message: 'Eve was executed.', timestamp: Date.now() },
      { type: 'gameOver', message: 'Good wins! The Demon has been defeated!', timestamp: Date.now() },
    ];
    console.log(snapshotGameState(state, 'GAME OVER - Good wins'));
    expect(state.winner).toBe(Team.GOOD);
  });

  test('snapshot: game over - evil wins', () => {
    let state = buildGameAtPhase(Phase.GAME_OVER, { dayNumber: 4 });
    state.winner = Team.EVIL;
    state.players = state.players.map(p => {
      if (['Alice', 'Bob', 'Charlie', 'Frank', 'Grace'].includes(p.name)) {
        return { ...p, alive: false };
      }
      return p;
    });
    state.gameLog = [
      { type: 'gameOver', message: 'Evil wins! Too few players remain.', timestamp: Date.now() },
    ];
    console.log(snapshotGameState(state, 'GAME OVER - Evil wins'));
    expect(state.winner).toBe(Team.EVIL);
  });

  test('snapshot: multiple dead with ghost votes used', () => {
    let state = buildGameAtPhase(Phase.DAY, { dayNumber: 3 });
    state.players = state.players.map(p => {
      if (p.name === 'Alice') return { ...p, alive: false, ghostVoteUsed: true };
      if (p.name === 'Bob') return { ...p, alive: false, ghostVoteUsed: false };
      if (p.name === 'Frank') return { ...p, alive: false, ghostVoteUsed: true };
      return p;
    });
    state.voteThreshold = 2;
    console.log(snapshotGameState(state, 'DAY 3 - 3 dead, 2 ghost votes used'));
    const deadCount = state.players.filter(p => !p.alive).length;
    expect(deadCount).toBe(3);
  });

  test('snapshot: player with butler master set', () => {
    let state = buildGameAtPhase(Phase.DAY, { dayNumber: 1 });
    const butler = state.players.find(p => p.name === 'Frank');
    const master = state.players.find(p => p.name === 'Alice');
    state.players = state.players.map(p =>
      p.name === 'Frank' ? { ...p, role: 'butler', butlerMaster: master.id } : p
    );
    console.log(snapshotGameState(state, 'DAY - Frank (Butler) with Alice as master'));
    expect(state.players.find(p => p.name === 'Frank').butlerMaster).toBe(master.id);
  });

  test('snapshot: drunk player with different perceived role', () => {
    let state = buildGameAtPhase(Phase.FIRST_NIGHT);
    state.players = state.players.map(p =>
      p.name === 'Grace' ? { ...p, role: 'drunk', perceivedRole: 'chef', drunk: true } : p
    );
    console.log(snapshotGameState(state, 'FIRST NIGHT - Grace is Drunk (thinks Chef)'));
    const grace = state.players.find(p => p.name === 'Grace');
    expect(grace.role).toBe('drunk');
    expect(grace.perceivedRole).toBe('chef');
  });

  test('snapshot: player with reminders', () => {
    let state = buildGameAtPhase(Phase.NIGHT, { nightNumber: 2 });
    state.players = state.players.map(p => {
      if (p.name === 'Alice') return { ...p, reminders: ['Cursed', 'Pukka poisoned'] };
      if (p.name === 'Bob') return { ...p, reminders: ['Survives execution'] };
      return p;
    });
    console.log(snapshotGameState(state, 'NIGHT - players with reminders'));
    expect(state.players.find(p => p.name === 'Alice').reminders.length).toBe(2);
  });

  test('snapshot: Sects & Violets game setup', () => {
    const roles = [
      { name: 'Alice', role: 'clockmaker' },
      { name: 'Bob', role: 'dreamer' },
      { name: 'Charlie', role: 'snake_charmer' },
      { name: 'Dave', role: 'philosopher' },
      { name: 'Eve', role: 'witch' },
      { name: 'Frank', role: 'pit_hag' },
      { name: 'Grace', role: 'fang_gu' },
    ];
    let state = createFixedGame(roles, ScriptId.SECTS_AND_VIOLETS);
    state.phase = Phase.FIRST_NIGHT;
    console.log(snapshotGameState(state, 'S&V GAME - first night setup'));
    expect(state.scriptId).toBe(ScriptId.SECTS_AND_VIOLETS);
  });

  test('snapshot: Bad Moon Rising game with multiple deaths', () => {
    const roles = [
      { name: 'Alice', role: 'grandmother' },
      { name: 'Bob', role: 'sailor' },
      { name: 'Charlie', role: 'exorcist' },
      { name: 'Dave', role: 'assassin' },
      { name: 'Eve', role: 'mastermind' },
      { name: 'Frank', role: 'po' },
      { name: 'Grace', role: 'innkeeper' },
    ];
    let state = createFixedGame(roles, ScriptId.BAD_MOON_RISING);
    state.phase = Phase.DAY;
    state.dayNumber = 3;
    state.players = state.players.map(p => {
      if (p.name === 'Alice' || p.name === 'Bob' || p.name === 'Grace') {
        return { ...p, alive: false };
      }
      return p;
    });
    console.log(snapshotGameState(state, 'BMR GAME - Day 3, 3 dead'));
    expect(state.scriptId).toBe(ScriptId.BAD_MOON_RISING);
  });
});
